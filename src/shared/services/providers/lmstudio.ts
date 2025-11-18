import { AIProvider } from './base';
import { AIMessage, AIResponse, WebSearchSettings, ToolCall } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { loggedFetch } from '@shared/utils/apiLogger';

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
    _onToolCall?: (toolCall: ToolCall) => Promise<any>
  ): Promise<AIResponse> {
    console.log('[LMStudio] chat - Starting');
    console.log('[LMStudio] chat - Model:', model);
    console.log('[LMStudio] chat - Endpoint:', endpoint);
    console.log('[LMStudio] chat - Messages count:', messages.length);
    console.log('[LMStudio] chat - Web search enabled:', webSearchEnabled);
    
    // Note: LM Studio does not support web search natively as it's a local server
    if (webSearchEnabled) {
      console.warn('[LMStudio] Web search is not supported by LM Studio (local server). Request will proceed without web search.');
    }
    
    const baseUrl = endpoint || 'http://localhost:1234/v1';
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

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
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

  async listModels(_apiKey: string, endpoint?: string): Promise<any[]> {
    console.log('[LMStudio] listModels - Starting');
    console.log('[LMStudio] listModels - Endpoint:', endpoint);
    
    const baseUrl = endpoint || 'http://localhost:1234/v1';
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

