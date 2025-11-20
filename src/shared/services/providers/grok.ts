import { AIProvider } from './base';
import { AIMessage, AIResponse, GrokWebSearchSettings, Citation, ToolCall } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { loggedFetch } from '@shared/utils/apiLogger';

export class GrokProvider implements AIProvider {
  async chat(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    endpoint?: string,
    onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    webSearchSettings?: GrokWebSearchSettings,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    _onToolCall?: (toolCall: ToolCall) => Promise<any>, // Not used: Grok returns all tool_calls at once
    _previousResponseId?: string
  ): Promise<AIResponse> {
    const baseUrl = endpoint || 'https://api.x.ai/v1';
    
    // Use different endpoint for web search: /responses instead of /chat/completions
    const url = webSearchEnabled 
      ? `${baseUrl}/responses` 
      : `${baseUrl}/chat/completions`;

    console.log('[Grok] Starting chat request', { 
      model, 
      webSearchEnabled,
      endpoint: url,
      hasSettings: !!webSearchSettings,
      toolsCount: tools?.length || 0
    });

    // Build tools array for web search
    const webSearchTools: any[] = [];
    
    if (webSearchEnabled && webSearchSettings) {
      // Grok /v1/responses API uses 'web_search' type
      const webSearchTool: any = { type: 'web_search' };
      
      // Web Search parameters
      if ((webSearchSettings.webSearchAllowedDomains?.length || 0) > 0) {
        webSearchTool.allowed_domains = webSearchSettings.webSearchAllowedDomains.slice(0, 5);
      }
      
      if ((webSearchSettings.webSearchExcludedDomains?.length || 0) > 0) {
        webSearchTool.excluded_domains = webSearchSettings.webSearchExcludedDomains.slice(0, 5);
      }
      
      if (webSearchSettings.webSearchEnableImageUnderstanding) {
        webSearchTool.enable_image_understanding = true;
      }
      
      webSearchTools.push(webSearchTool);
      console.log('[Grok] Added web_search tool:', webSearchTool);
      
      // Note: X Search parameters are not yet supported in /v1/responses endpoint
      // X Search settings are kept in UI for future compatibility
      if (webSearchSettings.xSearchEnabled) {
        console.log('[Grok] Warning: X Search is not yet supported in /v1/responses endpoint');
      }
    }

    const requestBody: any = {
      model,
      // /v1/responses uses 'input' instead of 'messages'
      [webSearchEnabled ? 'input' : 'messages']: messages.map(msg => {
          // Grok (xAI) supports multimodal content (images)
          let content = msg.content;
          
          // If content is array, convert to Grok format (OpenAI-compatible)
          if (Array.isArray(msg.content)) {
            content = msg.content.map(item => {
              if (item.type === 'text') {
                return { type: 'text', text: item.text || '' };
              } else if (item.type === 'image_url' && item.image_url) {
                // Images use OpenAI-compatible format
                return {
                  type: 'image_url',
                  image_url: item.image_url
                };
              } else if (item.type === 'document' && item.document) {
                // Documents not yet supported by Grok, convert to text mention
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
          content
        };
      }),
      stream: !!onChunk
    };
  
    // Add tools if web search is enabled
    if (webSearchTools.length > 0) {
      requestBody.tools = webSearchTools;
    }
    
    // Add function calling tools if provided (only for /chat/completions)
    if (tools && tools.length > 0 && !webSearchEnabled) {
      // Note: function calling tools work only with /chat/completions endpoint
      requestBody.tools = tools;
      console.log('[Grok] Added function calling tools:', tools.length);
    }
    
    console.log('[Grok] Request body:', JSON.stringify(requestBody, null, 2));

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
      throw new Error(error.error?.message || 'Grok API error');
    }

    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      const citations: Citation[] = [];
      const toolCalls: ToolCall[] = [];
      let currentToolCallIndex = -1;
      let currentToolCall: any = {};
      let buffer = ''; // Buffer for incomplete lines

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          buffer += chunk;
          
          // Split by lines but keep last incomplete line in buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep last (potentially incomplete) line

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;
            
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              
              // Handle different response formats
              let content = '';
              
              if (webSearchEnabled) {
                // /v1/responses format: uses event-based streaming
                if (json.type === 'response.output_text.delta' && json.delta) {
                  // Text delta from /v1/responses
                  content = json.delta;
                } else if (json.type === 'content_block_delta' && json.delta?.text) {
                  content = json.delta.text;
                } else if (json.delta?.content?.[0]?.text) {
                  content = json.delta.content[0].text;
                } else if (json.delta?.text) {
                  content = json.delta.text;
                } else if (json.choices?.[0]?.delta?.content) {
                  content = json.choices[0].delta.content;
                } else if (json.content?.[0]?.text) {
                  // Maybe non-delta format
                  content = json.content[0].text;
                } else if (typeof json.text === 'string') {
                  content = json.text;
                }
                
                // Extract URL citations from /v1/responses annotations
                if (json.type === 'response.output_text.annotation.added') {
                  if (json.annotation?.type === 'url_citation' && json.annotation.url) {
                    const url = json.annotation.url;
                    if (!citations.find(c => c.url === url)) {
                      citations.push({
                        url,
                        title: url,
                        cited_text: ''
                      });
                    }
                  }
                }
              } else {
                // /v1/chat/completions format
                content = json.choices?.[0]?.delta?.content || '';
              }
              
              if (content) {
                fullContent += content;
                onChunk(content);
              }
              
              // Handle tool calls (only for /chat/completions)
              if (!webSearchEnabled && json.choices?.[0]?.delta?.tool_calls) {
                const deltaToolCalls = json.choices[0].delta.tool_calls;
                
                deltaToolCalls.forEach((tc: any) => {
                  const index = tc.index;
                  
                  if (index > currentToolCallIndex) {
                    // New tool call - save previous
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

              // Capture usage info if available
              if (json.usage) {
                totalTokens = json.usage.total_tokens || 0;
                inputTokens = json.usage.prompt_tokens || 0;
                outputTokens = json.usage.completion_tokens || 0;
              }
              
              // Extract citations
              if (json.citations && Array.isArray(json.citations)) {
                json.citations.forEach((url: string) => {
                  if (!citations.find(c => c.url === url)) {
                    citations.push({
                      url,
                      title: url,
                      cited_text: ''
                    });
                  }
                });
              }
              
              // Check finish reason for saving last tool call
              if (json.choices[0]?.finish_reason === 'tool_calls') {
                if (currentToolCallIndex >= 0) {
                  toolCalls.push(currentToolCall as ToolCall);
                  console.log('[Grok] Saved final tool call, total:', toolCalls.length);
                }
              }
            } catch (e) {
              console.error('[Grok] Error parsing streaming response:', e);
              console.error('[Grok] Problematic line:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      console.log('[Grok] Streaming completed', {
        contentLength: fullContent.length,
        totalTokens,
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
        finish_reason: toolCalls.length > 0 ? 'tool_calls' : undefined,
        model,
        operator: 'grok'
      };
    } else {
      const data = await response.json();
      
      console.log('[Grok] Non-streaming response:', data);
      
      // Extract citations from response
      const citations: Citation[] = [];
      if (data.citations && Array.isArray(data.citations)) {
        data.citations.forEach((url: string) => {
          citations.push({
            url,
            title: url,
            cited_text: ''
          });
        });
      }
      
      console.log('[Grok] Extracted citations:', citations);
      
      // Extract tool calls from non-streaming response
      const message = data.choices?.[0]?.message;
      const extractedToolCalls = message?.tool_calls || undefined;
      
      if (extractedToolCalls) {
        console.log('[Grok] Extracted tool calls from non-streaming response:', extractedToolCalls.length);
      }
      
      // /v1/responses returns different structure: output array with message objects
      // /v1/chat/completions returns: choices[].message.content
      let content = '';
      let tokens: any = undefined;
      
      if (webSearchEnabled && data.output) {
        // /v1/responses format
        // Find the last message-type output
        const messages = data.output.filter((item: any) => item.type === 'message');
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          content = lastMessage.content?.[0]?.text || '';
        }
        
        // Extract tokens from usage
        if (data.usage) {
          tokens = {
            total: data.usage.total_tokens || 0,
            input: data.usage.prompt_tokens || 0,
            output: data.usage.completion_tokens || 0
          };
        }
      } else {
        // /v1/chat/completions format
        content = data.choices[0].message.content;
        if (data.usage) {
          tokens = {
            total: data.usage.total_tokens,
            input: data.usage.prompt_tokens,
            output: data.usage.completion_tokens
          };
        }
      }
      
      return {
        content,
        tokens,
        citations: citations.length > 0 ? citations : undefined,
        tool_calls: extractedToolCalls,
        finish_reason: data.choices?.[0]?.finish_reason || 'stop',
        model,
        operator: 'grok'
      };
    }
  }

  async listModels(apiKey: string, endpoint?: string): Promise<any[]> {
    const baseUrl = endpoint || 'https://api.x.ai/v1';
    const url = `${baseUrl}/models`;

    const response = await loggedFetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Grok models');
    }

    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.id,
      operator: 'grok'
    }));
  }

  async testConnection(apiKey: string, endpoint?: string): Promise<boolean> {
    try {
      await this.listModels(apiKey, endpoint);
      return true;
    } catch (error) {
      console.error('Grok connection test failed:', error);
      return false;
    }
  }
}

