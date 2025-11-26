import { AIProvider } from './base';
import { AIMessage, AIResponse, WebSearchSettings, Citation, ToolCall, GeneratedImage } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { loggedFetch } from '@shared/utils/apiLogger';
import { useOperatorSettingsStore } from '@shared/stores/operatorSettingsStore';
import { getModelInfo } from '@shared/constants';

/**
 * Извлекает цитаты из groundingMetadata Gemini ответа
 */
function extractCitations(candidate: any): Citation[] {
  const citations: Citation[] = [];
  const groundingMetadata = candidate?.groundingMetadata;
  
  if (!groundingMetadata) {
    return citations;
  }
  
  const chunks = groundingMetadata.groundingChunks || [];
  const supports = groundingMetadata.groundingSupports || [];
  
  // Создаем уникальный набор URL из chunks
  const seenUrls = new Set<string>();
  
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title || uri;
    
    if (uri && !seenUrls.has(uri)) {
      seenUrls.add(uri);
      
      // Найдем цитируемый текст из supports
      let citedText = '';
      for (const support of supports) {
        if (support.groundingChunkIndices?.includes(chunks.indexOf(chunk))) {
          // Можно было бы извлечь текст из segment, но он обычно пустой в API
          // Поэтому оставляем пустым или используем title
          citedText = title || '';
          break;
        }
      }
      
      citations.push({
        url: uri,
        title: title || uri,
        cited_text: citedText
      });
    }
  }
  
  return citations;
}

export class GeminiProvider implements AIProvider {
  async chat(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    endpoint?: string,
    onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    _webSearchSettings?: WebSearchSettings,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    _onToolCall?: (toolCall: ToolCall) => Promise<any>,
    _previousResponseId?: string,
    editingImageBase64?: string,
    _onReasoningChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    console.log('[Gemini] chat - Starting');
    console.log('[Gemini] chat - Model:', model);
    console.log('[Gemini] chat - Endpoint:', endpoint || 'default');
    console.log('[Gemini] chat - Messages count:', messages.length);
    console.log('[Gemini] chat - Has streaming callback:', !!onChunk);
    
    const baseUrl = endpoint || 'https://generativelanguage.googleapis.com/v1beta';
    const streamParam = onChunk ? 'streamGenerateContent' : 'generateContent';
    const url = `${baseUrl}/models/${model}:${streamParam}?key=${apiKey}`;

    console.log('[Gemini] chat - Request URL:', url);

    // Convert messages to Gemini format
    const contents = [];
    
    for (const msg of messages) {
      // Skip system messages - Gemini doesn't support them, will use first user message
      if (msg.role === 'system') {
        continue;
      }
      
      // Gemini uses 'model' instead of 'assistant', 'function' for tool results
      let role: 'user' | 'model' | 'function';
      if (msg.role === 'assistant') {
        role = 'model';
      } else if (msg.role === 'tool') {
        role = 'function';
      } else {
        role = 'user';
      }
      
      // Handle both string content and array content (multimodal)
      let parts;
      
      // Handle tool messages (function responses)
      if (msg.role === 'tool') {
        parts = [{
          functionResponse: {
            name: msg.name,
            response: {
              result: msg.content
            }
          }
        }];
      }
      // Handle messages with tool_calls (function calls)
      else if (msg.tool_calls && msg.tool_calls.length > 0) {
        parts = [];
        
        // Add text content if present
        if (msg.content && typeof msg.content === 'string' && msg.content.trim()) {
          parts.push({ text: msg.content });
        }
        
        // Add function calls
        for (const toolCall of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments)
            }
          });
        }
      }
      // Handle regular content
      else if (typeof msg.content === 'string') {
        // Для assistant с пустым контентом (только изображение) не добавляем text part
        if (msg.role === 'assistant' && !msg.content.trim()) {
          // Пропускаем пустые сообщения модели (они возникают когда только изображение)
          continue;
        }
        parts = [{ text: msg.content || ' ' }]; // Используем пробел если совсем пусто для user
      } else if (Array.isArray(msg.content)) {
        // Multimodal content
        parts = msg.content.map(item => {
          if (item.type === 'text') {
            return { text: item.text || '' };
          } else if (item.type === 'image_url' && item.image_url) {
            // Convert OpenAI format to Gemini format
            const dataUrl = item.image_url.url;
            
            // Extract MIME type from data URL (e.g., "data:image/jpeg;base64,...")
            let mimeType = 'image/png'; // default
            const mimeMatch = dataUrl.match(/^data:(image\/[a-z]+);base64,/);
            if (mimeMatch) {
              mimeType = mimeMatch[1]; // e.g., "image/jpeg", "image/png", "image/webp"
            }
            
            // Extract base64 data
            const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
            
            return {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            };
          }
          return { text: '' };
        });
      } else {
        parts = [{ text: String(msg.content) }];
      }
      
      contents.push({ role, parts });
    }

    console.log('[Gemini] chat - Converted messages:', JSON.stringify(contents, null, 2));

    // Определяем, поддерживает ли модель генерацию изображений
    const modelInfo = getModelInfo(model, 'gemini');
    const modelSupportsImageGeneration = modelInfo?.architecture?.output_modalities?.includes('image') ?? false;
    console.log('[Gemini] chat - Model supports image generation:', modelSupportsImageGeneration, {
      model,
      hasModelInfo: !!modelInfo,
      outputModalities: modelInfo?.architecture?.output_modalities
    });
    
    // Получаем настройки генерации изображений
    const imageSettings = useOperatorSettingsStore.getState().getImageSettings('gemini');
    console.log('[Gemini] chat - Image settings:', imageSettings);

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };
    
    // Добавляем response_modalities и image_config для моделей с поддержкой изображений
    if (modelSupportsImageGeneration) {
      requestBody.generationConfig.response_modalities = ['TEXT', 'IMAGE'];
      requestBody.generationConfig.image_config = {
        aspect_ratio: imageSettings.aspectRatio || '16:9',
        image_size: imageSettings.imageSize || '2K'
      };
      console.log('[Gemini] chat - Added image generation config:', requestBody.generationConfig);
    }
    
    // Если передан editingImageBase64, добавляем изображение в последнее сообщение пользователя
    if (editingImageBase64 && contents.length > 0) {
      console.log('[Gemini] chat - Adding editing image to last user message');
      
      // Найдем последнее сообщение пользователя
      for (let i = contents.length - 1; i >= 0; i--) {
        if (contents[i].role === 'user') {
          // Добавляем изображение к parts
          const base64Data = editingImageBase64.replace(/^data:image\/\w+;base64,/, '');
          const mimeType = editingImageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';
          
          (contents[i].parts as any[]).push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
          
          console.log('[Gemini] chat - Added editing image to message:', {
            messageIndex: i,
            mimeType,
            base64Length: base64Data.length
          });
          break;
        }
      }
    }
    
    // Build tools array
    const geminiTools: any[] = [];
    
    // Add function declarations if tools provided
    if (tools && tools.length > 0) {
      geminiTools.push({
        functionDeclarations: tools.map(tool => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters
        }))
      });
      console.log('[Gemini] Added function declarations:', tools.length);
    }
    
    // Add Google Search tool if web search is enabled
    if (webSearchEnabled) {
      geminiTools.push({
        googleSearch: {} // Empty object means use default search
      });
      console.log('[Gemini] Web search enabled with Google Search tool');
    }
    
    // Add tools to request body if any
    if (geminiTools.length > 0) {
      requestBody.tools = geminiTools;
    }

    console.log('[Gemini] chat - Request body:', JSON.stringify(requestBody, null, 2));

    const response = await loggedFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal
    });

    console.log('[Gemini] chat - Response status:', response.status);
    console.log('[Gemini] chat - Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] chat - Error response:', errorText);
      
      let errorMessage = 'Gemini API error';
      
      try {
        const errorData = JSON.parse(errorText);
        console.error('[Gemini] chat - Parsed error:', errorData);
        
        // Gemini может вернуть как объект, так и массив с объектом ошибки
        const error = Array.isArray(errorData) ? errorData[0] : errorData;
        
        // Извлекаем сообщение об ошибке
        errorMessage = error?.error?.message || error?.message || 'Gemini API error';
        
        // Если это ошибка квоты, делаем сообщение более читаемым
        if (error?.error?.code === 429 || error?.error?.status === 'RESOURCE_EXHAUSTED') {
          // Извлекаем основную часть сообщения до деталей
          const mainMessage = errorMessage.split('\n*')[0].trim();
          errorMessage = mainMessage;
        }
      } catch (parseError) {
        // Если не удалось распарсить JSON, возвращаем первые 500 символов
        console.error('[Gemini] chat - Failed to parse error response:', parseError);
        const shortError = errorText.length > 500 ? errorText.substring(0, 500) + '...' : errorText;
        errorMessage = shortError;
      }
      
      throw new Error(errorMessage);
    }

    if (onChunk && response.body) {
      console.log('[Gemini] chat - Processing streaming response');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
        let totalTokens = 0;
        let inputTokens = 0;
        let outputTokens = 0;
        let citations: Citation[] = [];
        const toolCalls: ToolCall[] = [];
        const generatedImages: GeneratedImage[] = [];
        let chunkCount = 0;
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[Gemini] chat - Stream ended');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          chunkCount++;
          buffer += chunk;
          
          // Try to parse complete JSON objects from buffer
          let startIndex = 0;
          while (true) {
            // Find the start of a JSON object
            const jsonStart = buffer.indexOf('[', startIndex);
            if (jsonStart === -1) break;
            
            // Try to find matching closing bracket
            let depth = 0;
            let jsonEnd = -1;
            for (let i = jsonStart; i < buffer.length; i++) {
              if (buffer[i] === '[') depth++;
              else if (buffer[i] === ']') {
                depth--;
                if (depth === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
            }
            
            // If we found a complete JSON object
            if (jsonEnd !== -1) {
              const jsonStr = buffer.substring(jsonStart, jsonEnd);
              startIndex = jsonEnd;
              
              try {
                const jsonArray = JSON.parse(jsonStr);
                
                // Process each item in the array
                for (const json of jsonArray) {
                  const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
                  
                  if (content) {
                    console.log(`[Gemini] chat - Streaming content chunk (${content.length} chars)`);
                    fullContent += content;
                    onChunk(content); // Send immediately to UI
                  }

                  // Handle function calls and images
                  const parts = json.candidates?.[0]?.content?.parts;
                  if (parts) {
                    for (const part of parts) {
                      if (part.functionCall) {
                        const toolCall: ToolCall = {
                          id: `call_${Date.now()}_${toolCalls.length}`,
                          type: 'function',
                          function: {
                            name: part.functionCall.name,
                            arguments: JSON.stringify(part.functionCall.args || {})
                          }
                        };
                        toolCalls.push(toolCall);
                        console.log('[Gemini] Function call detected:', toolCall.function.name);
                      }
                      
                      // Handle generated images
                      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                        const base64Data = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType;
                        const generatedImage: GeneratedImage = {
                          type: 'image_url',
                          image_url: {
                            url: `data:${mimeType};base64,${base64Data}`
                          },
                          base64Image: base64Data // Сохраняем для редактирования
                        };
                        generatedImages.push(generatedImage);
                        console.log('[Gemini] Generated image detected:', {
                          mimeType,
                          base64Length: base64Data.length
                        });
                      }
                    }
                  }

                  // Capture usage metadata if available
                  if (json.usageMetadata) {
                    totalTokens = json.usageMetadata.totalTokenCount || 0;
                    inputTokens = json.usageMetadata.promptTokenCount || 0;
                    outputTokens = json.usageMetadata.candidatesTokenCount || 0;
                  }
                  
                  // Extract citations from groundingMetadata
                  if (json.candidates?.[0]) {
                    const newCitations = extractCitations(json.candidates[0]);
                    // Merge unique citations
                    for (const citation of newCitations) {
                      if (!citations.find(c => c.url === citation.url)) {
                        citations.push(citation);
                      }
                    }
                  }
                }
                
                // Remove processed part from buffer
                buffer = buffer.substring(jsonEnd);
                startIndex = 0;
              } catch (e) {
                // If parsing fails, it might be incomplete - wait for more data
                break;
              }
            } else {
              // No complete JSON object found, wait for more data
              break;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      console.log('[Gemini] chat - Stream complete:', {
        totalChunks: chunkCount,
        fullContentLength: fullContent.length,
        totalTokens,
        inputTokens,
        outputTokens,
        citationsCount: citations.length,
        toolCallsCount: toolCalls.length,
        generatedImagesCount: generatedImages.length
      });

      return {
        content: fullContent,
        tokens: totalTokens > 0 ? {
          total: totalTokens,
          input: inputTokens,
          output: outputTokens
        } : undefined,
        citations: citations.length > 0 ? citations : undefined,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        images: generatedImages.length > 0 ? generatedImages : undefined,
        finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
        model,
        operator: 'gemini'
      };
    } else {
      console.log('[Gemini] chat - Processing non-streaming response');
      
      const data = await response.json();
      console.log('[Gemini] chat - Response data:', JSON.stringify(data, null, 2));
      
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract citations
      const citations = data.candidates?.[0] ? extractCitations(data.candidates[0]) : [];
      
      // Extract function calls and images
      const toolCalls: ToolCall[] = [];
      const generatedImages: GeneratedImage[] = [];
      const parts = data.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.functionCall) {
            toolCalls.push({
              id: `call_${Date.now()}_${toolCalls.length}`,
              type: 'function',
              function: {
                name: part.functionCall.name,
                arguments: JSON.stringify(part.functionCall.args || {})
              }
            });
          }
          
          // Extract generated images
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            const base64Data = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            generatedImages.push({
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              },
              base64Image: base64Data // Сохраняем для редактирования
            });
            console.log('[Gemini] Generated image extracted:', {
              mimeType,
              base64Length: base64Data.length
            });
          }
        }
      }
      
      console.log('[Gemini] chat - Extracted content:', {
        contentLength: content.length,
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length,
        firstCandidate: data.candidates?.[0],
        finishReason: data.candidates?.[0]?.finishReason,
        citationsCount: citations.length,
        toolCallsCount: toolCalls.length,
        generatedImagesCount: generatedImages.length,
        content: content.substring(0, 200)
      });
      
      if (!content && generatedImages.length === 0) {
        console.warn('[Gemini] chat - Empty content and no images received, full response:', data);
      }
      
      return {
        content,
        tokens: data.usageMetadata ? {
          total: data.usageMetadata.totalTokenCount,
          input: data.usageMetadata.promptTokenCount,
          output: data.usageMetadata.candidatesTokenCount
        } : undefined,
        citations: citations.length > 0 ? citations : undefined,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        images: generatedImages.length > 0 ? generatedImages : undefined,
        finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
        model,
        operator: 'gemini'
      };
    }
  }

  async listModels(apiKey: string, endpoint?: string): Promise<any[]> {
    console.log('[Gemini] listModels - Starting');
    console.log('[Gemini] listModels - API Key length:', apiKey?.length || 0);
    
    const baseUrl = endpoint || 'https://generativelanguage.googleapis.com/v1beta';
    const url = `${baseUrl}/models?key=${apiKey}`;

    console.log('[Gemini] listModels - Fetching from:', url);

    try {
      const response = await loggedFetch(url);

      console.log('[Gemini] listModels - Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gemini] listModels - Error response:', errorText);
        throw new Error('Failed to fetch Gemini models');
      }

      const data = await response.json();
      console.log('[Gemini] listModels - Total models received:', data.models?.length || 0);
      
      const filteredModels = data.models
        .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
        .map((model: any) => ({
          id: model.name.replace('models/', ''),
          name: model.displayName || model.name,
          operator: 'gemini'
        }));
      
      console.log('[Gemini] listModels - After filter:', filteredModels.length);
      
      // Remove duplicates by ID
      const uniqueModels = Array.from(
        new Map(filteredModels.map((model: any) => [model.id, model])).values()
      );
      
      console.log('[Gemini] listModels - After deduplication:', uniqueModels.length);
      console.log('[Gemini] listModels - First 5 models:', uniqueModels.slice(0, 5));
      
      return uniqueModels;
    } catch (error) {
      console.error('[Gemini] listModels - Error:', error);
      throw error;
    }
  }

  async testConnection(apiKey: string, endpoint?: string): Promise<boolean> {
    console.log('[Gemini] testConnection - Starting');
    console.log('[Gemini] testConnection - API Key length:', apiKey?.length || 0);
    
    try {
      const models = await this.listModels(apiKey, endpoint);
      console.log('[Gemini] testConnection - Success, models loaded:', models.length);
      return true;
    } catch (error) {
      console.error('[Gemini] testConnection - Failed:', error);
      return false;
    }
  }
}

