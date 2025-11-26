import { AIProvider } from './base';
import { AIMessage, AIResponse, OpenAIWebSearchSettings, Citation, ToolCall, GeneratedImage } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { loggedFetch } from '@shared/utils/apiLogger';
import { useOperatorSettingsStore } from '@shared/stores/operatorSettingsStore';

export class OpenAIProvider implements AIProvider {
  async chat(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    endpoint?: string,
    onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    webSearchSettings?: OpenAIWebSearchSettings,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    onToolCall?: (toolCall: ToolCall) => Promise<any>,
    previousResponseId?: string,
    _editingImageBase64?: string,
    _onReasoningChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    const baseUrl = endpoint || 'https://api.openai.com/v1';
    
    // Check if messages contain documents (PDF, etc.)
    const hasDocuments = messages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some(item => item.type === 'document')
    );
    
    // Models that only support Responses API
    const responsesOnlyModels = ['gpt-image-1', 'gpt-5'];
    const isResponsesOnlyModel = responsesOnlyModels.some(m => model.includes(m));
    
    // Use new /responses API for:
    // - Documents/PDFs
    // - Web search
    // - Image generation (previousResponseId)
    // - Models that only support Responses API (like gpt-image-1)
    if (hasDocuments || webSearchEnabled || previousResponseId || isResponsesOnlyModel) {
      return this.chatWithResponses(messages, model, apiKey, baseUrl, onChunk, webSearchEnabled, webSearchSettings, signal, tools, onToolCall, previousResponseId);
    } else {
      return this.chatStandard(messages, model, apiKey, baseUrl, onChunk, signal, tools, onToolCall);
    }
  }

  // Standard chat API (for text and images)
  private async chatStandard(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    baseUrl: string,
    onChunk?: (chunk: string) => void,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    _onToolCall?: (toolCall: ToolCall) => Promise<any>
  ): Promise<AIResponse> {
    const url = `${baseUrl}/chat/completions`;

    const requestBody: any = {
      model,
      messages: messages.map(msg => {
        // OpenAI supports content as string or array (multimodal)
        let content = msg.content;
        
        // If content is array, ensure proper format
        if (Array.isArray(msg.content)) {
          content = msg.content.map(item => {
            if (item.type === 'text') {
              return { type: 'text', text: item.text || '' };
            } else if (item.type === 'image_url' && item.image_url) {
              return {
                type: 'image_url',
                image_url: item.image_url
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
      // Enable token usage in streaming mode
      ...(onChunk && { stream_options: { include_usage: true } })
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      console.log('[OpenAI] Added tools:', tools.length);
    }

    console.log('[OpenAI] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await loggedFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    if (onChunk && response.body) {
      // Streaming response
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

                if (json.usage) {
                  totalTokens = json.usage.total_tokens || 0;
                  inputTokens = json.usage.prompt_tokens || 0;
                  outputTokens = json.usage.completion_tokens || 0;
                  console.log('[OpenAI] Token usage received:', {
                    total: totalTokens,
                    input: inputTokens,
                    output: outputTokens
                  });
                }

                // Check finish reason
                if (json.choices[0]?.finish_reason === 'tool_calls') {
                  // Save last tool call
                  if (currentToolCallIndex >= 0) {
                    toolCalls.push(currentToolCall as ToolCall);
                  }
                }
              } catch (e) {
                console.error('[OpenAI] Error parsing streaming response:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      console.log('[OpenAI] Streaming completed', {
        contentLength: fullContent.length,
        totalTokens,
        toolCallsCount: toolCalls.length
      });

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
        operator: 'openai'
      };
    } else {
      // Non-streaming response
      const data = await response.json();
      console.log('[OpenAI] Non-streaming response tokens:', data.usage);
      
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
        operator: 'openai'
      };
    }
  }

  // New responses API (for documents/PDF, web search, and image generation)
  private async chatWithResponses(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    baseUrl: string,
    _onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    webSearchSettings?: OpenAIWebSearchSettings,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    _onToolCall?: (toolCall: ToolCall) => Promise<any>,
    previousResponseId?: string
  ): Promise<AIResponse> {
    const url = `${baseUrl}/responses`;
    
    console.log('[OpenAI] Using Responses API', { webSearchEnabled, hasSettings: !!webSearchSettings });
    console.log('[OpenAI] Input messages count:', messages.length);
    console.log('[OpenAI] Messages:', messages.map(m => ({ role: m.role, contentType: typeof m.content, contentLength: typeof m.content === 'string' ? m.content.length : Array.isArray(m.content) ? m.content.length : 0 })));
    
    // Convert messages to new responses API format
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
            // Extract filename from document or use generic name
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

    // Build tools array for Responses API
    const responsesTools: any[] = [];
    
    if (webSearchEnabled && webSearchSettings) {
      const webSearchTool: any = {
        type: 'web_search'
      };

      // Add filters if domains are specified
      if (webSearchSettings.allowedDomains && webSearchSettings.allowedDomains.length > 0) {
        webSearchTool.filters = {
          allowed_domains: webSearchSettings.allowedDomains.slice(0, 20)
        };
      }

      // Add user location if specified
      if (webSearchSettings.location) {
        const loc = webSearchSettings.location;
        if (loc.city || loc.region || loc.country || loc.timezone) {
          webSearchTool.user_location = {
            type: 'approximate',
            ...(loc.city && { city: loc.city }),
            ...(loc.region && { region: loc.region }),
            ...(loc.country && { country: loc.country }),
            ...(loc.timezone && { timezone: loc.timezone })
          };
        }
      }

      // Add external web access setting (default: true)
      if (webSearchSettings.externalWebAccess === false) {
        webSearchTool.external_web_access = false;
      }

      responsesTools.push(webSearchTool);
      console.log('[OpenAI] Web search tool configured:', webSearchTool);
    }

    // Add custom tools if provided
    if (tools && tools.length > 0) {
      responsesTools.push(...tools);
      console.log('[OpenAI] Added custom tools:', tools.length);
    }

    // Add image generation tool if supported by model
    // Check if model supports image generation (e.g., gpt-image-1 or models with image output)
    const modelSupportsImageGeneration = model.includes('image') || model.includes('gpt-4') || model.includes('gpt-5');
    
    if (modelSupportsImageGeneration) {
      const imageSettings = useOperatorSettingsStore.getState().getImageSettings('openai');
      
      const imageGenTool: any = {
        type: 'image_generation'
      };
      
      // Add only supported settings according to OpenAI API
      if (imageSettings.size && imageSettings.size !== 'auto') {
        imageGenTool.size = imageSettings.size;
      }
      
      if (imageSettings.quality && imageSettings.quality !== 'auto') {
        imageGenTool.quality = imageSettings.quality;
      }
      
      // Background (transparent/opaque) - only for PNG/WebP
      if (imageSettings.background && imageSettings.background === 'transparent') {
        imageGenTool.background = 'transparent';
      }
      
      // Input fidelity for preserving input image details
      if (imageSettings.inputFidelity && imageSettings.inputFidelity === 'high') {
        imageGenTool.input_fidelity = 'high';
      }
      
      // Moderation level
      if (imageSettings.moderation && imageSettings.moderation === 'low') {
        imageGenTool.moderation = 'low';
      }
      
      responsesTools.push(imageGenTool);
      console.log('[OpenAI] Image generation tool configured:', imageGenTool);
    }

    const requestBody: any = {
      model,
      input
    };

    // Add previous_response_id if editing an image
    if (previousResponseId) {
      requestBody.previous_response_id = previousResponseId;
      console.log('[OpenAI] Using previous_response_id for image editing:', previousResponseId);
    }

    if (responsesTools.length > 0) {
      requestBody.tools = responsesTools;
      requestBody.tool_choice = 'auto';
      // Include sources in response
      requestBody.include = ['web_search_call.action.sources'];
    }

    console.log('[OpenAI] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await loggedFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[OpenAI] API error:', error);
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    // Responses API doesn't support streaming yet
    const data = await response.json();
    console.log('[OpenAI] Response data:', JSON.stringify(data, null, 2));
    
    // Extract content, citations, and images from response
    let content = '';
    const citations: Citation[] = [];
    const generatedImages: GeneratedImage[] = [];
    let responseId: string | undefined;
    
    // Store response ID for image editing
    if (data.id) {
      responseId = data.id;
      console.log('[OpenAI] Response ID:', responseId);
    }
    
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        // Extract text messages
        if (item.type === 'message' && item.content) {
          for (const contentItem of item.content) {
            if (contentItem.type === 'output_text') {
              // Extract text content
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
          console.log('[OpenAI] Generated image extracted:', {
            id: item.id,
            format,
            hasResponseId: !!responseId
          });
        }
      }
    }

    // Fallback to output_text if no content found in output array
    if (!content && data.output_text) {
      content = data.output_text;
    }

    console.log('[OpenAI] Extracted content:', { length: content.length, hasContent: !!content });
    console.log('[OpenAI] Extracted citations:', citations.length);
    console.log('[OpenAI] Extracted images:', generatedImages.length);
    
    return {
      content: content || '',
      tokens: data.usage ? {
        total: data.usage.total_tokens || 0,
        input: data.usage.prompt_tokens || 0,
        output: data.usage.completion_tokens || 0
      } : undefined,
      model,
      operator: 'openai',
      citations: citations.length > 0 ? citations : undefined,
      images: generatedImages.length > 0 ? generatedImages : undefined,
      response_id: responseId
    };
  }

  async listModels(apiKey: string, endpoint?: string): Promise<any[]> {
    const baseUrl = endpoint || 'https://api.openai.com/v1';
    const url = `${baseUrl}/models`;

    const response = await loggedFetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OpenAI models');
    }

    const data = await response.json();
    // Filter only chat models
    return data.data
      .filter((model: any) => model.id.includes('gpt'))
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        operator: 'openai'
      }));
  }

  async testConnection(apiKey: string, endpoint?: string): Promise<boolean> {
    try {
      await this.listModels(apiKey, endpoint);
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

