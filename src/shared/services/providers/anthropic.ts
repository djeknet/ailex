import { AIProvider } from './base';
import { AIMessage, AIResponse, ClaudeWebSearchSettings, Citation, ToolCall } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { loggedFetch } from '@shared/utils/apiLogger';
import { useOperatorSettingsStore } from '@shared/stores/operatorSettingsStore';

export class AnthropicProvider implements AIProvider {
  async chat(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    endpoint?: string,
    onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    webSearchSettings?: ClaudeWebSearchSettings,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
    onToolCall?: (toolCall: ToolCall) => Promise<any>,
    _previousResponseId?: string,
    _editingImageBase64?: string,
    _onReasoningChunk?: (chunk: string) => void,
    skipCustomGenerationSettings?: boolean
  ): Promise<AIResponse> {
    console.log('[Anthropic] Starting chat request');
    console.log('[Anthropic] Model:', model);
    console.log('[Anthropic] Messages count:', messages.length);
    console.log('[Anthropic] Endpoint:', endpoint || 'default');
    console.log('[Anthropic] API Key length:', apiKey?.length || 0);
    console.log('[Anthropic] Streaming:', !!onChunk);
    console.log('[Anthropic] onChunk type:', typeof onChunk);
    console.log('[Anthropic] onChunk value:', onChunk);
    
    // Log incoming messages to debug MIME type issue
    messages.forEach((msg, idx) => {
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        const images = msg.content.filter((c: any) => c.type === 'image_url');
        if (images.length > 0) {
          console.log(`[Anthropic] INCOMING message ${idx} has ${images.length} images:`);
          images.forEach((img: any, imgIdx: number) => {
            const url = img.image_url?.url || '';
            console.log(`  [Anthropic] Incoming image ${imgIdx}: ${url.substring(0, 50)}`);
          });
        }
      }
    });

    const baseUrl = endpoint || 'https://api.anthropic.com/v1';
    const url = `${baseUrl}/messages`;

    // Separate system message from other messages
    const systemMessage = messages.find(msg => msg.role === 'system');
    const chatMessages = messages.filter(msg => msg.role !== 'system');

    console.log('[Anthropic] System message:', systemMessage ? 'present' : 'none');
    console.log('[Anthropic] Chat messages count:', chatMessages.length);

    // Convert messages to Anthropic format
    // Anthropic требует специальный формат: assistant messages с tool_use, затем user messages с tool_result
    const anthropicMessages = [];
    
    for (let i = 0; i < chatMessages.length; i++) {
      const msg = chatMessages[i];
      
      // Skip tool messages - они будут обработаны отдельно
      if (msg.role === 'tool') {
        continue;
      }
      
      const role = msg.role === 'user' ? 'user' : 'assistant';
      
      // Handle both string content and array content (multimodal)
      let content;
      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Multimodal content
        content = msg.content.map(item => {
          if (item.type === 'text') {
            return {
              type: 'text',
              text: item.text || ''
            };
          } else if (item.type === 'image_url' && item.image_url) {
            // Convert to Anthropic image format
            const dataUrl = item.image_url.url;
            console.log('[Anthropic] Processing image_url, data URL starts with:', dataUrl.substring(0, 100));
            
            // Extract MIME type from data URL
            let mediaType = 'image/png'; // default
            const mimeMatch = dataUrl.match(/^data:(image\/[a-z0-9+.-]+);base64,/i);
            console.log('[Anthropic] MIME regex match result:', mimeMatch);
            if (mimeMatch) {
              mediaType = mimeMatch[1];
              console.log('[Anthropic] Extracted MIME type:', mediaType);
            } else {
              console.warn('[Anthropic] Could not extract MIME type from data URL, using default:', mediaType);
            }
            
            // Extract base64 data
            const base64Data = dataUrl.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '');
            console.log('[Anthropic] Base64 data length:', base64Data.length);
            console.log('[Anthropic] First 50 chars of base64:', base64Data.substring(0, 50));
            
            return {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            };
          } else if (item.type === 'document' && item.document) {
            // Document (PDF, etc.)
            const dataUrl = item.document.url;
            
            // Extract MIME type
            let mediaType = 'application/pdf'; // default
            const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
            if (mimeMatch) {
              mediaType = mimeMatch[1];
            }
            
            // Extract base64 data
            const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
            
            return {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            };
          }
          return { type: 'text', text: '' };
        }).filter(item => {
          // Filter out empty text blocks
          if (item.type === 'text' && (!item.text || !item.text.trim())) {
            return false;
          }
          return true;
        });
      } else {
        content = String(msg.content);
      }
      
      // Convert tool_calls to Anthropic format
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Assistant message с tool_use blocks
        const contentArray = [];
        
        // Add text content if present
        if (content && typeof content === 'string' && content.trim()) {
          contentArray.push({
            type: 'text',
            text: content
          });
        }
        
        // Add tool_use blocks
        for (const toolCall of msg.tool_calls) {
          contentArray.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments)
          });
        }
        
        anthropicMessages.push({ role: 'assistant', content: contentArray });
        
        // Теперь собираем все tool results следующие за этим assistant message
        const toolResults = [];
        let j = i + 1;
        while (j < chatMessages.length && chatMessages[j].role === 'tool') {
          const toolMsg = chatMessages[j];
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolMsg.tool_call_id,
            content: toolMsg.content
          });
          j++;
        }
        
        // Добавляем user message с tool_result blocks
        if (toolResults.length > 0) {
          anthropicMessages.push({ role: 'user', content: toolResults });
          // Skip processed tool messages
          i = j - 1;
        }
      } else {
        // Обычное сообщение без tool_calls
        anthropicMessages.push({ role, content });
      }
    }

    // Convert tools from OpenAI format to Anthropic format
    const anthropicTools = tools?.map(tool => ({
      type: 'custom',
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters
    }));

    const requestBody: any = {
      model,
      max_tokens: 4096, // default, will be overridden by generation settings if set
      system: typeof systemMessage?.content === 'string' ? systemMessage.content : undefined,
      messages: anthropicMessages,
      stream: !!onChunk,
      ...(webSearchEnabled && webSearchSettings || anthropicTools && anthropicTools.length > 0 ? {
        tools: [
          // Add web search tool if enabled
          ...(webSearchEnabled && webSearchSettings ? [{
            type: "web_search_20250305",
            name: "web_search",
            max_uses: webSearchSettings.maxUses,
            ...(webSearchSettings.allowedDomains.length > 0 ? {
              allowed_domains: webSearchSettings.allowedDomains
            } : {}),
            ...(webSearchSettings.blockedDomains.length > 0 ? {
              blocked_domains: webSearchSettings.blockedDomains
            } : {}),
            ...(webSearchSettings.location && (
              webSearchSettings.location.city || 
              webSearchSettings.location.region || 
              webSearchSettings.location.country || 
              webSearchSettings.location.timezone
            ) ? {
              user_location: {
                type: "approximate",
                ...(webSearchSettings.location.city ? { city: webSearchSettings.location.city } : {}),
                ...(webSearchSettings.location.region ? { region: webSearchSettings.location.region } : {}),
                ...(webSearchSettings.location.country ? { country: webSearchSettings.location.country } : {}),
                ...(webSearchSettings.location.timezone ? { timezone: webSearchSettings.location.timezone } : {})
              }
            } : {})
          }] : []),
          // Add custom tools (converted to Anthropic format)
          ...(anthropicTools || [])
        ]
      } : {})
    };

    // Add generation settings (only compatible Anthropic parameters)
    if (!skipCustomGenerationSettings) {
      const generationSettings = useOperatorSettingsStore.getState().getGenerationSettings('anthropic', model);
      if (Object.keys(generationSettings).length > 0) {
        console.log('[Anthropic] Applying generation settings:', generationSettings);
        
        if (generationSettings.temperature !== undefined) {
          // Anthropic supports 0-1, cap at 1.0
          requestBody.temperature = Math.min(generationSettings.temperature, 1.0);
        }
        if (generationSettings.max_tokens !== undefined) {
          requestBody.max_tokens = generationSettings.max_tokens;
        }
        if (generationSettings.stop && generationSettings.stop.length > 0) {
          requestBody.stop_sequences = generationSettings.stop;
        }
        // Skip incompatible parameters: top_p, top_k, penalties, seed, response_format, verbosity
      }
    } else {
      console.log('[Anthropic] Skipping custom generation settings (internal request)');
    }

    console.log('[Anthropic] Request body:', JSON.stringify(requestBody, null, 2));
    if (anthropicTools && anthropicTools.length > 0) {
      console.log('[Anthropic] Added tools:', anthropicTools.length);
    }

    try {
      console.log('[Anthropic] Sending request to:', url);
      
      const response = await loggedFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(requestBody),
        signal
      });

      console.log('[Anthropic] Response status:', response.status);
      console.log('[Anthropic] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Anthropic] Error response text:', errorText);
        
        try {
          const error = JSON.parse(errorText);
          console.error('[Anthropic] Error JSON:', error);
          throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
        } catch (parseError) {
          console.error('[Anthropic] Failed to parse error response:', parseError);
          throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
        }
      }

      if (onChunk && response.body) {
        console.log('[Anthropic] Processing streaming response');
        
        // Streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let inputTokens = 0;
        let outputTokens = 0;
        let chunkCount = 0;
        const citations: Citation[] = [];
        const contentBlocks: any[] = []; // Store all content blocks
        const toolCalls: ToolCall[] = []; // Store tool calls
        let currentBlockIndex = -1;
        let buffer = ''; // Buffer for incomplete lines

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('[Anthropic] Stream ended');
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            chunkCount++;
            console.log('[Anthropic] Raw chunk received #', chunkCount, 'length:', chunk.length);
            
            // Add to buffer
            buffer += chunk;
            
            // Split by newlines but keep the last incomplete line in buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep last incomplete line
            
            console.log('[Anthropic] Processing', lines.length, 'lines from chunk');
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                // Skip if it's just a ping or empty
                if (data === '[DONE]' || !data.trim()) continue;

                try {
                  const json = JSON.parse(data);
                  
                  // Full event logging for debugging
                  if (json.type && json.type !== 'content_block_delta' && json.type !== 'ping') {
                    console.log('[Anthropic] Event:', json.type, JSON.stringify(json, null, 2));
                  }

                  if (json.type === 'content_block_delta') {
                    console.log('[Anthropic] content_block_delta received:', json.delta);
                    const content = json.delta?.text;
                    console.log('[Anthropic] Delta text:', content);
                    if (content) {
                      fullContent += content;
                      console.log('[Anthropic] Calling onChunk with content:', content.substring(0, 50));
                      onChunk(content);
                      console.log('[Anthropic] onChunk called successfully');
                    } else {
                      console.log('[Anthropic] No text in delta');
                    }
                  }

                  if (json.type === 'message_delta') {
                    if (json.usage) {
                      outputTokens = json.usage.output_tokens;
                    }
                  }

                  if (json.type === 'message_start') {
                    if (json.message?.usage) {
                      inputTokens = json.message.usage.input_tokens;
                    }
                  }

                  // Extract citations from tool_use events
                  if (json.type === 'content_block_start' && json.content_block) {
                    console.log('[Anthropic] content_block_start:', json.content_block.type);
                    currentBlockIndex++;
                    contentBlocks[currentBlockIndex] = { ...json.content_block };
                    
                    // Initialize tool_use block
                    if (json.content_block.type === 'tool_use') {
                      contentBlocks[currentBlockIndex] = {
                        type: 'tool_use',
                        id: json.content_block.id,
                        name: json.content_block.name,
                        // Use existing input if provided, otherwise prepare for streaming
                        input: json.content_block.input,
                        inputJson: json.content_block.input ? JSON.stringify(json.content_block.input) : ''
                      };
                      console.log('[Anthropic] Tool use block started:', json.content_block.name);
                    }
                    
                    // Check for web_search_tool_result
                    if (json.content_block.type === 'web_search_tool_result') {
                      const content = json.content_block.content;
                      if (Array.isArray(content)) {
                        content.forEach((item: any) => {
                          if (item.type === 'web_search_result') {
                            citations.push({
                              url: item.url || '',
                              title: item.title || item.url || '',
                              cited_text: '' // We'll get this from citations in text blocks
                            });
                          }
                        });
                      }
                      console.log('[Anthropic] Web search results found:', citations.length);
                    }
                  }

                  // Update content blocks as deltas arrive
                  if (json.type === 'content_block_delta' && currentBlockIndex >= 0) {
                    // Handle tool input accumulation
                    const block = contentBlocks[currentBlockIndex];
                    if (block?.type === 'tool_use' && json.delta?.type === 'input_json_delta') {
                      block.inputJson = (block.inputJson || '') + (json.delta.partial_json || '');
                      console.log('[Anthropic] Accumulated tool input length:', block.inputJson.length);
                    }
                    
                    // Store delta for other block types
                    if (!contentBlocks[currentBlockIndex].delta) {
                      contentBlocks[currentBlockIndex].delta = {};
                    }
                    Object.assign(contentBlocks[currentBlockIndex].delta, json.delta);
                  }

                  // When content block stops, check for citations and tool calls
                  if (json.type === 'content_block_stop' && currentBlockIndex >= 0) {
                    const block = contentBlocks[currentBlockIndex];
                    console.log('[Anthropic] content_block_stop, block:', block.type);
                    
                    // Finalize tool_use block
                    if (block.type === 'tool_use') {
                      try {
                        // Use existing parsed input or parse accumulated inputJson
                        const input = block.input || (block.inputJson ? JSON.parse(block.inputJson) : {});
                        
                        // Convert to standard ToolCall format
                        const toolCall: ToolCall = {
                          id: block.id,
                          type: 'function',
                          function: {
                            name: block.name,
                            arguments: JSON.stringify(input)
                          }
                        };
                        toolCalls.push(toolCall);
                        console.log('[Anthropic] Tool call finalized:', toolCall.function.name, 'with args:', toolCall.function.arguments);
                        
                        // Execute tool if callback provided
                        if (onToolCall) {
                          console.log('[Anthropic] Executing tool:', toolCall.function.name);
                          try {
                            await onToolCall(toolCall);
                          } catch (error) {
                            console.error('[Anthropic] Tool execution error:', error);
                          }
                        }
                      } catch (error) {
                        console.error('[Anthropic] Failed to parse tool input:', error);
                      }
                    }
                    
                    // Check if this text block has citations
                    if (block.type === 'text' && block.citations) {
                      block.citations.forEach((citation: any) => {
                        const existingIndex = citations.findIndex(c => c.url === citation.url);
                        if (existingIndex >= 0) {
                          // Update with cited_text
                          citations[existingIndex].cited_text = citation.cited_text || '';
                        } else {
                          citations.push({
                            url: citation.url || '',
                            title: citation.title || citation.url || '',
                            cited_text: citation.cited_text || ''
                          });
                        }
                      });
                      console.log('[Anthropic] Citations from text block:', citations.length);
                    }
                  }
                } catch (e) {
                  // Only log if it's not a buffer issue
                  if (data.length > 100) {
                    console.error('[Anthropic] Error parsing JSON (line may be incomplete):', e);
                  }
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        console.log('[Anthropic] Stream complete. Total chunks:', chunkCount);
        console.log('[Anthropic] Full content length:', fullContent.length);
        console.log('[Anthropic] Content blocks collected:', contentBlocks.length);
        console.log('[Anthropic] Tool calls:', toolCalls.length);
        console.log('[Anthropic] Tokens - Input:', inputTokens, 'Output:', outputTokens);
        console.log('[Anthropic] Citations found:', citations.length);
        
        // Log all content blocks for debugging
        contentBlocks.forEach((block, idx) => {
          console.log(`[Anthropic] Block ${idx}:`, block.type, block.citations ? `(${block.citations.length} citations)` : '');
        });

        return {
          content: fullContent,
          tokens: {
            total: inputTokens + outputTokens,
            input: inputTokens,
            output: outputTokens
          },
          model,
          operator: 'anthropic',
          citations: citations.length > 0 ? citations : undefined,
          inlineCitations: true,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop'
        };
      } else {
        console.log('[Anthropic] Processing non-streaming response');
        
        // Non-streaming response
        const data = await response.json();
        console.log('[Anthropic] Response data:', JSON.stringify(data, null, 2));
        
        const content = data.content[0]?.text || '';
        console.log('[Anthropic] Extracted content length:', content.length);

        // Extract citations from content blocks
        const citations: Citation[] = [];
        if (data.content) {
          data.content.forEach((block: any) => {
            console.log('[Anthropic] Non-streaming block:', block.type);
            
            // Check for web_search_tool_result blocks that contain search results
            if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
              block.content.forEach((item: any) => {
                if (item.type === 'web_search_result') {
                  citations.push({
                    url: item.url || '',
                    title: item.title || item.url || '',
                    cited_text: '' // Will be updated from text blocks with citations
                  });
                }
              });
            }
            
            // Check text blocks with citations field
            if (block.type === 'text' && block.citations) {
              block.citations.forEach((citation: any) => {
                const existingIndex = citations.findIndex((c: Citation) => c.url === citation.url);
                if (existingIndex >= 0) {
                  // Update existing citation with cited_text
                  citations[existingIndex].cited_text = citation.cited_text || '';
                  citations[existingIndex].title = citation.title || citations[existingIndex].title;
                } else {
                  // Add new citation
                  citations.push({
                    url: citation.url || '',
                    title: citation.title || citation.url || '',
                    cited_text: citation.cited_text || ''
                  });
                }
              });
            }
          });
        }
        console.log('[Anthropic] Citations found:', citations.length);

        return {
          content,
          tokens: data.usage ? {
            total: data.usage.input_tokens + data.usage.output_tokens,
            input: data.usage.input_tokens,
            output: data.usage.output_tokens
          } : undefined,
          model,
          operator: 'anthropic',
          citations: citations.length > 0 ? citations : undefined
        };
      }
    } catch (error) {
      console.error('[Anthropic] Chat error:', error);
      console.error('[Anthropic] Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }
 // Метод рабочий! Не менять!
  async listModels(apiKey: string, endpoint?: string): Promise<any[]> {
    console.log('[Anthropic] listModels - Starting');
    console.log('[Anthropic] listModels - API Key length:', apiKey?.length || 0);
    console.log('[Anthropic] listModels - Endpoint:', endpoint || 'default');
    
    const baseUrl = endpoint || 'https://api.anthropic.com/v1';
    const url = `${baseUrl}/models`;

    console.log('[Anthropic] listModels - Fetching from:', url);

    try {
      const response = await loggedFetch(url, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        }
      });

      console.log('[Anthropic] listModels - Response status:', response.status);
      console.log('[Anthropic] listModels - Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Anthropic] listModels - Error response:', errorText);
        throw new Error('Failed to fetch Anthropic models');
      }

      const data = await response.json();
      console.log('[Anthropic] listModels - Response data:', JSON.stringify(data, null, 2));
      
      const models = data.data.map((model: any) => ({
        id: model.id,
        name: model.display_name || model.id,
        operator: 'anthropic'
      }));
      
      console.log('[Anthropic] listModels - Mapped models:', models.length);
      return models;
    } catch (error) {
      console.error('[Anthropic] listModels - Error:', error);
      console.error('[Anthropic] listModels - Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async testConnection(apiKey: string, endpoint?: string): Promise<boolean> {
    console.log('[Anthropic] testConnection - Starting');
    console.log('[Anthropic] testConnection - API Key length:', apiKey?.length || 0);
    console.log('[Anthropic] testConnection - Endpoint:', endpoint || 'default');
    
    try {
      // Test with a simple message using the most recent model
      console.log('[Anthropic] testConnection - Testing with claude-sonnet-4-5');
      
      await this.chat(
        [{ role: 'user', content: 'Hello' }],
        'claude-sonnet-4-5',
        apiKey,
        endpoint
      );
      
      console.log('[Anthropic] testConnection - Success');
      return true;
    } catch (error) {
      console.error('[Anthropic] testConnection - Failed:', error);
      console.error('[Anthropic] testConnection - Error message:', error instanceof Error ? error.message : 'Unknown');
      return false;
    }
  }
}

