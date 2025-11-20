import { AIProvider } from './base';
import { AIMessage, AIResponse, WebSearchSettings, OpenRouterWebSearchSettings, Citation, ToolCall, GeneratedImage } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { loggedFetch } from '@shared/utils/apiLogger';
import { useOperatorSettingsStore } from '@shared/stores/operatorSettingsStore';

export class OpenRouterProvider implements AIProvider {
  /**
   * Extract citations from OpenRouter annotations
   */
  private extractCitationsFromAnnotations(annotations: any[], citationsArray: Citation[]) {
    if (!annotations || !Array.isArray(annotations)) return;
    
    annotations
      .filter(ann => ann.type === 'url_citation')
      .forEach(ann => {
        const citation = ann.url_citation;
        if (citation?.url && !citationsArray.find(c => c.url === citation.url)) {
          citationsArray.push({
            url: citation.url,
            title: citation.title || citation.url,
            cited_text: citation.content || ''
          });
        }
      });
  }

  async chat(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    endpoint?: string,
    onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    webSearchSettings?: WebSearchSettings,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    onToolCall?: (toolCall: ToolCall) => Promise<any>,
    _previousResponseId?: string
  ): Promise<AIResponse> {
    const baseUrl = endpoint || 'https://openrouter.ai/api/v1';
    const url = `${baseUrl}/chat/completions`;

    console.log('[OpenRouter] Starting chat request', { 
      model, 
      webSearchEnabled,
      hasSettings: !!webSearchSettings,
      toolsCount: tools?.length || 0
    });

    // Build plugins array
    const plugins: any[] = [];
    
    // Add web search plugin if enabled
    if (webSearchEnabled && webSearchSettings) {
      const orSettings = webSearchSettings as OpenRouterWebSearchSettings;
      
      const webPlugin: any = {
        id: 'web'
      };
      
      // Add engine if not auto
      if (orSettings.engine && orSettings.engine !== 'auto') {
        webPlugin.engine = orSettings.engine;
      }
      
      // Add max_results
      if (orSettings.maxResults) {
        webPlugin.max_results = orSettings.maxResults;
      }
      
      // Add search_prompt
      if (orSettings.searchPrompt) {
        webPlugin.search_prompt = orSettings.searchPrompt;
      }
      
      plugins.push(webPlugin);
      console.log('[OpenRouter] Added web search plugin:', webPlugin);
    }
    
    // Add PDF parsing plugin for documents
    const hasDocuments = messages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some(item => item.type === 'document')
    );
    
    if (hasDocuments) {
      plugins.push({
        id: 'file-parser',
        pdf: {
          engine: 'pdf-text'
        }
      });
    }

    const requestBody: any = {
      model,
      messages: messages.map(msg => {
          // OpenRouter supports multimodal content (images and files)
          let content: any = msg.content;
          
          // If content is array, convert to OpenRouter format
          if (Array.isArray(msg.content)) {
            content = msg.content.map(item => {
              if (item.type === 'text') {
                return { type: 'text', text: item.text || '' };
              } else if (item.type === 'image_url' && item.image_url) {
                // Images use same format as OpenAI
                return {
                  type: 'image_url',
                  image_url: item.image_url
                };
              } else if (item.type === 'document' && item.document) {
                // Documents use OpenRouter's 'file' format
                return {
                  type: 'file',
                  file: {
                    filename: item.document.filename || 'document.pdf',
                    file_data: item.document.url
                  }
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
        modalities: ['image', 'text'] // Always enable image generation support
      };
    
    // Add image generation config
    const imageSettings = useOperatorSettingsStore.getState().getImageSettings('openrouter');
    if (imageSettings.imageAspectRatio) {
      requestBody.image_config = {
        aspect_ratio: imageSettings.imageAspectRatio
      };
      console.log('[OpenRouter] Image generation enabled with aspect ratio:', imageSettings.imageAspectRatio);
    }
    
    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      console.log('[OpenRouter] Added tools:', tools.length);
    }
    
    // Add plugins if any
    if (plugins.length > 0) {
      requestBody.plugins = plugins;
    }
    
    // Add web_search_options for native engine
    if (webSearchEnabled && webSearchSettings) {
      const orSettings = webSearchSettings as OpenRouterWebSearchSettings;
      if (orSettings.engine === 'native' && orSettings.searchContextSize) {
        requestBody.web_search_options = {
          search_context_size: orSettings.searchContextSize
        };
      }
    }
    
    console.log('[OpenRouter] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await loggedFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ailex.extension',
        'X-Title': 'AiLex Extension'
      },
      body: JSON.stringify(requestBody),
      signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
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
      const generatedImages: GeneratedImage[] = [];
      let currentToolCallIndex = -1;
      let currentToolCall: any = {};
      let buffer = ''; // Buffer for incomplete JSON chunks

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Split by lines and keep incomplete line in buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep last incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const json = JSON.parse(data);
                const delta = json.choices[0]?.delta;
                const message = json.choices[0]?.message;
                
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

                // Handle generated images from delta
                if (delta?.images) {
                  delta.images.forEach((img: any) => {
                    if (img.image_url?.url && !generatedImages.find(gi => gi.image_url.url === img.image_url.url)) {
                      generatedImages.push({
                        type: 'image_url',
                        image_url: {
                          url: img.image_url.url
                        }
                      });
                      console.log('[OpenRouter] Received generated image in delta');
                    }
                  });
                }
                
                // Handle generated images from message (for models that send complete images at the end)
                if (message?.images && Array.isArray(message.images)) {
                  message.images.forEach((img: any) => {
                    if (img.image_url?.url && !generatedImages.find(gi => gi.image_url.url === img.image_url.url)) {
                      generatedImages.push({
                        type: 'image_url',
                        image_url: {
                          url: img.image_url.url
                        }
                      });
                      console.log('[OpenRouter] Received generated image in message');
                    }
                  });
                }

                // Capture usage info if available
                if (json.usage) {
                  totalTokens = json.usage.total_tokens || 0;
                  inputTokens = json.usage.prompt_tokens || 0;
                  outputTokens = json.usage.completion_tokens || 0;
                }
                
                // Extract citations from annotations
                if (message?.annotations) {
                  this.extractCitationsFromAnnotations(message.annotations, citations);
                }
                
                // Check finish reason
                if (json.choices[0]?.finish_reason === 'tool_calls') {
                  // Save last tool call
                  if (currentToolCallIndex >= 0) {
                    toolCalls.push(currentToolCall as ToolCall);
                  }
                }
              } catch (e) {
                // Log but continue - some chunks might be incomplete
                if (data.length < 100) {
                  console.error('[OpenRouter] Error parsing streaming response chunk:', data.substring(0, 100), e);
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      console.log('[OpenRouter] Streaming completed', {
        contentLength: fullContent.length,
        totalTokens,
        citationsCount: citations.length,
        toolCallsCount: toolCalls.length,
        imagesCount: generatedImages.length
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
        operator: 'openrouter'
      };
    } else {
      const data = await response.json();
      
      console.log('[OpenRouter] Non-streaming response received');
      
      // Extract citations from annotations
      const citations: Citation[] = [];
      const message = data.choices[0]?.message;
      if (message?.annotations) {
        this.extractCitationsFromAnnotations(message.annotations, citations);
      }
      
      // Extract generated images
      const generatedImages: GeneratedImage[] = [];
      if (message?.images && Array.isArray(message.images)) {
        message.images.forEach((img: any) => {
          if (img.image_url?.url) {
            generatedImages.push({
              type: 'image_url',
              image_url: {
                url: img.image_url.url
              }
            });
          }
        });
      }
      
      console.log('[OpenRouter] Extracted citations:', citations.length);
      console.log('[OpenRouter] Generated images:', generatedImages.length);
      
      return {
        content: data.choices[0].message.content || '',
        tokens: data.usage ? {
          total: data.usage.total_tokens,
          input: data.usage.prompt_tokens,
          output: data.usage.completion_tokens
        } : undefined,
        citations: citations.length > 0 ? citations : undefined,
        tool_calls: message?.tool_calls || undefined,
        images: generatedImages.length > 0 ? generatedImages : undefined,
        finish_reason: data.choices[0]?.finish_reason || 'stop',
        model,
        operator: 'openrouter'
      };
    }
  }

  async listModels(apiKey: string, endpoint?: string): Promise<any[]> {
    console.log('[OpenRouter] listModels - Starting');
    console.log('[OpenRouter] listModels - API Key length:', apiKey?.length || 0);
    console.log('[OpenRouter] listModels - Endpoint:', endpoint || 'default');
    
    const baseUrl = endpoint || 'https://openrouter.ai/api/v1';
    const url = `${baseUrl}/models`;

    console.log('[OpenRouter] listModels - Fetching from:', url);

    try {
      const response = await loggedFetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      console.log('[OpenRouter] listModels - Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OpenRouter] listModels - Error response:', errorText);
        throw new Error('Failed to fetch OpenRouter models');
      }

      const data = await response.json();
      console.log('[OpenRouter] listModels - Response data keys:', Object.keys(data));
      console.log('[OpenRouter] listModels - Models count:', data.data?.length || 0);
      
      const models = data.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        operator: 'openrouter'
      }));
      
      console.log('[OpenRouter] listModels - Mapped models:', models.length);
      console.log('[OpenRouter] listModels - First 3 models:', models.slice(0, 3));
      
      return models;
    } catch (error) {
      console.error('[OpenRouter] listModels - Error:', error);
      throw error;
    }
  }

  async testConnection(apiKey: string, endpoint?: string): Promise<boolean> {
    console.log('[OpenRouter] testConnection - Starting');
    console.log('[OpenRouter] testConnection - API Key length:', apiKey?.length || 0);
    
    try {
      const models = await this.listModels(apiKey, endpoint);
      console.log('[OpenRouter] testConnection - Success, models loaded:', models.length);
      return true;
    } catch (error) {
      console.error('[OpenRouter] testConnection - Failed:', error);
      return false;
    }
  }
}

