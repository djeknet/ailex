import { AIProvider } from './base';
import { AIMessage, AIResponse, WebSearchSettings, ToolCall, GeneratedImage, Citation } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { loggedFetch } from '@shared/utils/apiLogger';
import { useOperatorSettingsStore } from '@shared/stores/operatorSettingsStore';
import { getModelInfo, API_CONFIG } from '@shared/constants';

export class LMStudioProvider implements AIProvider {
  async chat(
    messages: AIMessage[],
    model: string,
    _apiKey: string,
    endpoint?: string,
    onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    _webSearchSettings?: WebSearchSettings,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    _onToolCall?: (toolCall: ToolCall) => Promise<any>,
    previousResponseId?: string,
    _editingImageBase64?: string,
    _onReasoningChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    console.log('[LMStudio] chat - Starting');
    console.log('[LMStudio] chat - Model:', model);
    console.log('[LMStudio] chat - Endpoint:', endpoint);
    console.log('[LMStudio] chat - Messages count:', messages.length);
    console.log('[LMStudio] chat - Web search enabled:', webSearchEnabled);
    console.log('[LMStudio] chat - Previous response ID:', previousResponseId);
    
    // Note: LM Studio does not support web search natively as it's a local server
    if (webSearchEnabled) {
      console.warn('[LMStudio] Web search is not supported by LM Studio (local server). Request will proceed without web search.');
    }
    
    const baseUrl = endpoint || API_CONFIG.LMSTUDIO_ENDPOINT;
    
    // Определяем, поддерживает ли модель генерацию изображений
    const modelInfo = getModelInfo(model, 'lmstudio');
    const modelSupportsImageGeneration = modelInfo?.architecture?.output_modalities?.includes('image') ?? false;
    console.log('[LMStudio] chat - Model supports image generation:', modelSupportsImageGeneration, {
      model,
      hasModelInfo: !!modelInfo,
      outputModalities: modelInfo?.architecture?.output_modalities
    });
    
    // Use Responses API for image generation or image editing
    if (modelSupportsImageGeneration || previousResponseId) {
      return this.chatWithResponses(messages, model, baseUrl, onChunk, signal, tools, _onToolCall, previousResponseId);
    }
    const url = `${baseUrl}/chat/completions`;

    console.log('[LMStudio] chat - Request URL:', url);

    const requestBody: any = {
      model,
      messages: messages.map(msg => {
        // LM Studio supports multimodal content (OpenAI-compatible)
        let content = msg.content;
        
        // If content is array, convert to OpenAI-compatible format
        if (Array.isArray(msg.content)) {
          content = msg.content.map(item => {
            if (item.type === 'text') {
              return { type: 'text', text: item.text || '' };
            } else if (item.type === 'image_url' && item.image_url) {
              // Images use OpenAI-compatible format (if model supports vision)
              return {
                type: 'image_url',
                image_url: item.image_url
              };
            } else if (item.type === 'document' && item.document) {
              // Documents not widely supported, convert to text mention
              return {
                type: 'text',
                text: `[Document: ${item.document.filename || 'file'}]`
              };
            }
            return item;
          });
        }
        
        return {
          role: msg.role,
          content,
          ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
          ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {}),
          ...(msg.name ? { name: msg.name } : {})
        };
      }),
      stream: !!onChunk,
      temperature: 0.7
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      console.log('[LMStudio] chat - Added tools:', tools.length);
    }

    console.log('[LMStudio] chat - Request body:', JSON.stringify(requestBody, null, 2));

    try {
      const response = await loggedFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal
      });

      console.log('[LMStudio] chat - Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LMStudio] chat - Error response:', errorText);
        
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error?.message || error.message || 'LM Studio API error');
        } catch (parseError) {
          throw new Error(`LM Studio API error: ${errorText}`);
        }
      }

      if (onChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let totalTokens = 0;
        let inputTokens = 0;
        let outputTokens = 0;
        const toolCalls: ToolCall[] = [];
        let currentToolCallIndex = -1;
        let currentToolCall: any = {};
        let buffer = ''; // Буфер для неполных строк

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true }); // Добавлен stream: true
            buffer += chunk; // Добавляем к буферу
            const lines = buffer.split('\n');
            
            // Последняя строка может быть неполной, оставляем в буфере
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const json = JSON.parse(data);
                  const delta = json.choices[0]?.delta;
                  
                  // Handle regular content
                  if (delta?.content) {
                    fullContent += delta.content;
                    onChunk(delta.content);
                  }

                  // Handle tool calls
                  if (delta?.tool_calls) {
                    delta.tool_calls.forEach((tc: any) => {
                      const index = tc.index;
                      
                      if (index > currentToolCallIndex) {
                        // New tool call
                        if (currentToolCallIndex >= 0) {
                          toolCalls.push(currentToolCall as ToolCall);
                        }
                        currentToolCallIndex = index;
                        currentToolCall = {
                          id: tc.id || `call_${Date.now()}_${index}`,
                          type: 'function',
                          function: {
                            name: tc.function?.name || '',
                            arguments: tc.function?.arguments || ''
                          }
                        };
                      } else {
                        // Continue existing tool call
                        if (tc.function?.name) {
                          currentToolCall.function.name += tc.function.name;
                        }
                        if (tc.function?.arguments) {
                          currentToolCall.function.arguments += tc.function.arguments;
                        }
                      }
                    });
                  }

                  // Capture usage info if available in streaming response
                  if (json.usage) {
                    totalTokens = json.usage.total_tokens || 0;
                    inputTokens = json.usage.prompt_tokens || 0;
                    outputTokens = json.usage.completion_tokens || 0;
                  }

                  // Check finish reason
                  if (json.choices[0]?.finish_reason === 'tool_calls') {
                    // Save last tool call
                    if (currentToolCallIndex >= 0) {
                      toolCalls.push(currentToolCall as ToolCall);
                    }
                  }
                } catch (e) {
                  console.error('[LMStudio] chat - Error parsing streaming response:', e);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        console.log('[LMStudio] chat - Stream completed, total length:', fullContent.length);
        console.log('[LMStudio] chat - Tokens:', { totalTokens, inputTokens, outputTokens });
        console.log('[LMStudio] chat - Tool calls count:', toolCalls.length);

        return {
          content: fullContent,
          tokens: totalTokens > 0 ? {
            total: totalTokens,
            input: inputTokens,
            output: outputTokens
          } : undefined,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
          model,
          operator: 'lmstudio'
        };
      } else {
        const data = await response.json();
        console.log('[LMStudio] chat - Response data:', data);
        
        const message = data.choices[0]?.message;
        
        return {
          content: message?.content || '',
          tokens: data.usage ? {
            total: data.usage.total_tokens,
            input: data.usage.prompt_tokens,
            output: data.usage.completion_tokens
          } : undefined,
          tool_calls: message?.tool_calls || undefined,
          finish_reason: data.choices[0]?.finish_reason || 'stop',
          model,
          operator: 'lmstudio'
        };
      }
    } catch (error) {
      console.error('[LMStudio] chat - Error:', error);
      throw error;
    }
  }

  // Responses API for image generation (if supported by LM Studio server)
  private async chatWithResponses(
    messages: AIMessage[],
    model: string,
    baseUrl: string,
    _onChunk?: (chunk: string) => void,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    _onToolCall?: (toolCall: ToolCall) => Promise<any>,
    previousResponseId?: string
  ): Promise<AIResponse> {
    const url = `${baseUrl}/responses`;
    
    console.log('[LMStudio] Using Responses API for image generation');
    console.log('[LMStudio] Input messages count:', messages.length);
    
    // Convert messages to Responses API format
    const input = messages.map(msg => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: [{ 
            type: msg.role === 'assistant' ? 'output_text' : 'input_text', 
            text: msg.content 
          }]
        };
      } else if (Array.isArray(msg.content)) {
        const content = msg.content.map(item => {
          if (item.type === 'text') {
            return { 
              type: msg.role === 'assistant' ? 'output_text' : 'input_text', 
              text: item.text || '' 
            };
          } else if (item.type === 'image_url' && item.image_url) {
            return {
              type: 'input_image',
              image_url: item.image_url.url
            };
          } else if (item.type === 'document' && item.document) {
            const dataUrl = item.document.url;
            const filename = item.document.filename || 'document.pdf';
            
            return {
              type: 'input_file',
              filename: filename,
              file_data: dataUrl
            };
          }
          return item;
        });
        
        return {
          role: msg.role,
          content
        };
      } else {
        return {
          role: msg.role,
          content: [{ 
            type: msg.role === 'assistant' ? 'output_text' : 'input_text', 
            text: String(msg.content) 
          }]
        };
      }
    });

    // Build tools array
    const responsesTools: any[] = [];
    
    // Add custom tools if provided
    if (tools && tools.length > 0) {
      responsesTools.push(...tools);
      console.log('[LMStudio] Added custom tools:', tools.length);
    }

    // Add image generation tool
    const imageSettings = useOperatorSettingsStore.getState().getImageSettings('lmstudio');
    
    const imageGenTool: any = {
      type: 'image_generation'
    };
    
    // Add settings if available
    if (imageSettings.size && imageSettings.size !== 'auto') {
      imageGenTool.size = imageSettings.size;
    }
    
    if (imageSettings.quality && imageSettings.quality !== 'auto') {
      imageGenTool.quality = imageSettings.quality;
    }
    
    responsesTools.push(imageGenTool);
    console.log('[LMStudio] Image generation tool configured:', imageGenTool);

    const requestBody: any = {
      model,
      input
    };

    // Add previous_response_id if editing an image
    if (previousResponseId) {
      requestBody.previous_response_id = previousResponseId;
      console.log('[LMStudio] Using previous_response_id for image editing:', previousResponseId);
    }

    if (responsesTools.length > 0) {
      requestBody.tools = responsesTools;
      requestBody.tool_choice = 'auto';
    }

    console.log('[LMStudio] Request body:', JSON.stringify(requestBody, null, 2));

    try {
      const response = await loggedFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LMStudio] Responses API error:', errorText);
        
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error?.message || error.message || 'LM Studio Responses API error');
        } catch (parseError) {
          throw new Error(`LM Studio Responses API error: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('[LMStudio] Response data:', JSON.stringify(data, null, 2));
      
      // Extract content, citations, and images from response
      let content = '';
      const citations: Citation[] = [];
      const generatedImages: GeneratedImage[] = [];
      let responseId: string | undefined;
      
      // Store response ID for image editing
      if (data.id) {
        responseId = data.id;
        console.log('[LMStudio] Response ID:', responseId);
      }
      
      if (data.output && Array.isArray(data.output)) {
        for (const item of data.output) {
          // Extract text messages
          if (item.type === 'message' && item.content) {
            for (const contentItem of item.content) {
              if (contentItem.type === 'output_text') {
                if (contentItem.text) {
                  content += contentItem.text;
                }
                
                // Extract citations from annotations
                if (contentItem.annotations) {
                  for (const annotation of contentItem.annotations) {
                    if (annotation.type === 'url_citation') {
                      citations.push({
                        url: annotation.url || '',
                        title: annotation.title || '',
                        cited_text: contentItem.text?.substring(
                          annotation.start_index || 0,
                          annotation.end_index || 0
                        ) || ''
                      });
                    }
                  }
                }
              }
            }
          }
          
          // Extract generated images
          if (item.type === 'image_generation_call' && item.result) {
            const format = item.format || 'png';
            generatedImages.push({
              type: 'image_url',
              image_url: {
                url: `data:image/${format};base64,${item.result}`
              },
              response_id: responseId,
              image_generation_call_id: item.id
            });
            console.log('[LMStudio] Generated image extracted:', {
              id: item.id,
              format,
              hasResponseId: !!responseId
            });
          }
        }
      }

      // Fallback to output_text if no content found
      if (!content && data.output_text) {
        content = data.output_text;
      }

      console.log('[LMStudio] Extracted content:', { length: content.length, hasContent: !!content });
      console.log('[LMStudio] Extracted citations:', citations.length);
      console.log('[LMStudio] Extracted images:', generatedImages.length);
      
      return {
        content: content || '',
        tokens: data.usage ? {
          total: data.usage.total_tokens || 0,
          input: data.usage.prompt_tokens || 0,
          output: data.usage.completion_tokens || 0
        } : undefined,
        model,
        operator: 'lmstudio',
        citations: citations.length > 0 ? citations : undefined,
        images: generatedImages.length > 0 ? generatedImages : undefined,
        response_id: responseId
      };
    } catch (error) {
      console.error('[LMStudio] Responses API error:', error);
      throw error;
    }
  }

  async listModels(_apiKey: string, endpoint?: string): Promise<any[]> {
    console.log('[LMStudio] listModels - Starting');
    console.log('[LMStudio] listModels - Endpoint:', endpoint);
    
    const baseUrl = endpoint || API_CONFIG.LMSTUDIO_ENDPOINT;
    const url = `${baseUrl}/models`;

    console.log('[LMStudio] listModels - Request URL:', url);

    try {
      const response = await loggedFetch(url);

      console.log('[LMStudio] listModels - Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LMStudio] listModels - Error response:', errorText);
        throw new Error(`Failed to fetch LM Studio models: ${errorText}`);
      }

      const data = await response.json();
      console.log('[LMStudio] listModels - Response data:', data);
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error('[LMStudio] listModels - Invalid response format:', data);
        throw new Error('Invalid response format from LM Studio');
      }

      const models = data.data.map((model: any) => {
        console.log('[LMStudio] listModels - Processing model:', model);
        return {
          id: model.id,
          name: model.id,
          operator: 'lmstudio'
        };
      });

      console.log('[LMStudio] listModels - Total models:', models.length);
      console.log('[LMStudio] listModels - Models:', models);

      return models;
    } catch (error) {
      console.error('[LMStudio] listModels - Error:', error);
      throw error;
    }
  }

  async testConnection(_apiKey: string, endpoint?: string): Promise<boolean> {
    console.log('[LMStudio] testConnection - Starting');
    console.log('[LMStudio] testConnection - Endpoint:', endpoint);
    
    try {
      const models = await this.listModels(_apiKey, endpoint);
      console.log('[LMStudio] testConnection - Success, models loaded:', models.length);
      
      if (models.length === 0) {
        console.warn('[LMStudio] testConnection - No models loaded in LM Studio');
        throw new Error('No models loaded in LM Studio. Please load a model first.');
      }
      
      return true;
    } catch (error) {
      console.error('[LMStudio] testConnection - Failed:', error);
      return false;
    }
  }
}

