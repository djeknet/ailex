import { AIProvider } from './base';
import { AIMessage, AIResponse, OpenAIWebSearchSettings, Citation } from '@shared/types/ai';
import { loggedFetch } from '@shared/utils/apiLogger';

export class OpenAIProvider implements AIProvider {
  async chat(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    endpoint?: string,
    onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    webSearchSettings?: OpenAIWebSearchSettings,
    signal?: AbortSignal
  ): Promise<AIResponse> {
    const baseUrl = endpoint || 'https://api.openai.com/v1';
    
    // Check if messages contain documents (PDF, etc.)
    const hasDocuments = messages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some(item => item.type === 'document')
    );
    
    // Use new /responses API for documents and web search
    if (hasDocuments || webSearchEnabled) {
      return this.chatWithResponses(messages, model, apiKey, baseUrl, onChunk, webSearchEnabled, webSearchSettings, signal);
    } else {
      return this.chatStandard(messages, model, apiKey, baseUrl, onChunk, signal);
    }
  }

  // Standard chat API (for text and images)
  private async chatStandard(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    baseUrl: string,
    onChunk?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AIResponse> {
    const url = `${baseUrl}/chat/completions`;

    const response = await loggedFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal,
      body: JSON.stringify({
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
            content
          };
        }),
        stream: !!onChunk,
        // Enable token usage in streaming mode
        ...(onChunk && { stream_options: { include_usage: true } })
      })
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
                const content = json.choices[0]?.delta?.content;
                
                if (content) {
                  fullContent += content;
                  onChunk(content);
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
              } catch (e) {
                console.error('Error parsing streaming response:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        content: fullContent,
        tokens: totalTokens > 0 ? {
          total: totalTokens,
          input: inputTokens,
          output: outputTokens
        } : undefined,
        model,
        operator: 'openai'
      };
    } else {
      // Non-streaming response
      const data = await response.json();
      console.log('[OpenAI] Non-streaming response tokens:', data.usage);
      return {
        content: data.choices[0].message.content,
        tokens: data.usage ? {
          total: data.usage.total_tokens,
          input: data.usage.prompt_tokens,
          output: data.usage.completion_tokens
        } : undefined,
        model,
        operator: 'openai'
      };
    }
  }

  // New responses API (for documents/PDF and web search)
  private async chatWithResponses(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    baseUrl: string,
    _onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    webSearchSettings?: OpenAIWebSearchSettings,
    signal?: AbortSignal
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
          content: [{ type: 'input_text', text: msg.content }]
        };
      } else if (Array.isArray(msg.content)) {
        const content = msg.content.map(item => {
          if (item.type === 'text') {
            return { type: 'input_text', text: item.text || '' };
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
          content: [{ type: 'input_text', text: String(msg.content) }]
        };
      }
    });

    // Build tools array
    const tools: any[] = [];
    
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

      tools.push(webSearchTool);
      console.log('[OpenAI] Web search tool configured:', webSearchTool);
    }

    const requestBody: any = {
      model,
      input
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
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
    
    // Extract content and citations from response
    let content = '';
    const citations: Citation[] = [];
    
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
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
      }
    }

    // Fallback to output_text if no content found in output array
    if (!content && data.output_text) {
      content = data.output_text;
    }

    console.log('[OpenAI] Extracted content:', { length: content.length, hasContent: !!content });
    console.log('[OpenAI] Extracted citations:', citations);
    
    return {
      content: content || '',
      tokens: data.usage ? {
        total: data.usage.total_tokens || 0,
        input: data.usage.prompt_tokens || 0,
        output: data.usage.completion_tokens || 0
      } : undefined,
      model,
      operator: 'openai',
      citations: citations.length > 0 ? citations : undefined
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

