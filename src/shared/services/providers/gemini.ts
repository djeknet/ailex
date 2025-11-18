import { AIProvider } from './base';
import { AIMessage, AIResponse, WebSearchSettings, Citation, ToolCall } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { loggedFetch } from '@shared/utils/apiLogger';

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
    _onToolCall?: (toolCall: ToolCall) => Promise<any>
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
    const contents = messages.map(msg => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      
      // Handle both string content and array content (multimodal)
      let parts;
      if (typeof msg.content === 'string') {
        parts = [{ text: msg.content }];
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
      
      return { role, parts };
    });

    console.log('[Gemini] chat - Converted messages:', JSON.stringify(contents, null, 2));

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };
    
    // Add function declarations if tools provided
    if (tools && tools.length > 0) {
      requestBody.tools = [{
        functionDeclarations: tools.map(tool => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters
        }))
      }];
      console.log('[Gemini] Added function declarations:', tools.length);
    }
    
    // Add Google Search tool if web search is enabled
    if (webSearchEnabled) {
      requestBody.tools = [{
        googleSearch: {} // Empty object means use default search
      }];
      console.log('[Gemini] Web search enabled with Google Search tool');
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
      try {
        const error = JSON.parse(errorText);
        console.error('[Gemini] chat - Parsed error:', error);
        throw new Error(error.error?.message || 'Gemini API error');
      } catch (parseError) {
        console.error('[Gemini] chat - Failed to parse error response');
        throw new Error(`Gemini API error: ${errorText}`);
      }
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

                  // Handle function calls
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
        toolCallsCount: toolCalls.length
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
      
      // Extract function calls
      const toolCalls: ToolCall[] = [];
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
        content: content.substring(0, 200)
      });
      
      if (!content) {
        console.warn('[Gemini] chat - Empty content received, full response:', data);
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

