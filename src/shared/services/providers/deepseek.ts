import { AIProvider } from './base';
import { AIMessage, AIResponse } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { loggedFetch } from '@shared/utils/apiLogger';
import { ToolCall } from '@shared/types/ai';

export class DeepSeekProvider implements AIProvider {
  async chat(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    endpoint?: string,
    onChunk?: (chunk: string) => void,
    _webSearchEnabled?: boolean,
    _webSearchSettings?: any,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    _onToolCall?: (toolCall: ToolCall) => Promise<any>,
    _previousResponseId?: string,
    _editingImageBase64?: string,
    onReasoningChunk?: (chunk: string) => void // Callback для reasoning chunks
  ): Promise<AIResponse> {
    const baseUrl = endpoint || 'https://api.deepseek.com';
    const url = `${baseUrl}/chat/completions`;

    const requestBody: any = {
      model,
      messages: messages.map(msg => {
        // DeepSeek supports content as string or array (multimodal)
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
      console.log('[DeepSeek] Added tools:', tools.length);
    }

    console.log('[DeepSeek] Request body:', JSON.stringify(requestBody, null, 2));

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
      throw new Error(error.error?.message || 'DeepSeek API error');
    }

    if (onChunk && response.body) {
      // Streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let reasoningContent = '';
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      const toolCalls: ToolCall[] = [];
      let currentToolCallIndex = -1;
      let currentToolCall: any = {};
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
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

                // Handle reasoning_content (DeepSeek reasoner)
                if (delta?.reasoning_content) {
                  reasoningContent += delta.reasoning_content;
                  if (onReasoningChunk) {
                    onReasoningChunk(delta.reasoning_content);
                  }
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
                  console.log('[DeepSeek] Token usage received:', {
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
                console.error('[DeepSeek] Error parsing streaming response:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      console.log('[DeepSeek] Streaming completed', {
        contentLength: fullContent.length,
        reasoningLength: reasoningContent.length,
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
        operator: 'deepseek',
        reasoning_content: reasoningContent || undefined
      };
    } else {
      // Non-streaming response
      const data = await response.json();
      console.log('[DeepSeek] Non-streaming response tokens:', data.usage);
      
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
        operator: 'deepseek',
        reasoning_content: message?.reasoning_content || undefined
      };
    }
  }

  async listModels(apiKey: string, endpoint?: string): Promise<any[]> {
    const baseUrl = endpoint || 'https://api.deepseek.com';
    const url = `${baseUrl}/models`;

    const response = await loggedFetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch DeepSeek models');
    }

    const data = await response.json();
    // Filter DeepSeek models
    return data.data
      .filter((model: any) => model.id.includes('deepseek'))
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        operator: 'deepseek'
      }));
  }

  async testConnection(apiKey: string, endpoint?: string): Promise<boolean> {
    try {
      await this.listModels(apiKey, endpoint);
      return true;
    } catch (error) {
      console.error('DeepSeek connection test failed:', error);
      return false;
    }
  }
}

