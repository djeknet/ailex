import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Chat, ChatMessage, ChatFolder, MessageAttachment } from '@shared/types/database';
import { AIOperatorConfig, AIOperator, AIMessage } from '@shared/types/ai';
import { chatAPI, historyAPI, folderAPI } from '@shared/utils/messaging';
import { sendMessage as sendAIMessage, generateImage as generateAIImage } from '@shared/services/aiService';
import { PageContextType, HistoryMode } from '@shared/types/extension';
import { AIServiceError, AIErrorCode, detectErrorType } from '@shared/types/errors';
import { getTranslation } from '@shared/i18n/useTranslation';
import { i18nService } from '@shared/i18n/i18nService';
import { isSystemPage } from '@shared/utils/pageUtils';
import { getAILanguageName } from '@shared/constants';
import { getAllAvailableTools, toolsToDefinitions } from '@shared/services/toolsService';
import { executeToolCall } from '@shared/services/toolExecutor';
import { ToolExecution } from '@shared/types/tools';

interface ChatStore {
  currentChat: Chat | null;
  messages: ChatMessage[];
  isLoading: boolean;
  selectedOperator: AIOperatorConfig | null;
  pageContextEnabled: boolean;
  pageContextType: PageContextType;
  streamingContent: string;
  streamingImages: number; // Количество генерируемых изображений
  editingImageResponseId: string | null; // Response ID для редактирования изображения
  error: string | null;
  folders: ChatFolder[];
  chats: Chat[];
  generatingQuestionsForMessage: string | null;
  activeToolExecutions: ToolExecution[]; // Текущие выполняемые инструменты
  contextTruncationInfo: {
    wasTruncated: boolean;
    originalTokenCount: number;
    currentModel: string;
    currentModelLimit: number;
  } | null;
  
  // Track loading state per chat to prevent cross-tab issues
  loadingChats: Set<string>;
  activeRequestController: AbortController | null;
  
  // Actions
  setCurrentChat: (chat: Chat | null) => void;
  loadMessages: (chatId: string) => Promise<void>;
  addMessage: (message: ChatMessage) => Promise<void>;
  sendUserMessage: (
    content: string, 
    pageContext?: string, 
    replyTo?: string, 
    actionLabel?: string,
    attachments?: Array<{type: 'file' | 'image' | 'dom' | 'tab'; name: string; data: string; xpath?: string; mimeType?: string; tabUrl?: string; tabTitle?: string; tabFavicon?: string}>,
    webSearchEnabled?: boolean,
    instructionData?: { id: string; content: string },
    quotedText?: string,
    previousResponseId?: string,
    retryMessageId?: string // ID существующего сообщения для повтора
  ) => Promise<void>;
  setSelectedOperator: (operator: AIOperatorConfig | null) => void;
  setPageContextEnabled: (enabled: boolean) => void;
  setPageContextType: (type: PageContextType) => void;
  setEditingImageResponseId: (responseId: string | null) => void;
  createNewChat: (site: string) => Promise<Chat>;
  loadOrCreateChat: (site: string, historyMode: HistoryMode) => Promise<void>;
  clearChat: () => void;
  clearError: () => void;
  setContextTruncationInfo: (info: { wasTruncated: boolean; originalTokenCount: number; currentModel: string; currentModelLimit: number } | null) => void;
  clearContextTruncationInfo: () => void;
  generateSuggestedQuestions: (messageId: string, aiResponse: string, operator: AIOperator, model: string) => Promise<void>;
  setGeneratingQuestionsForMessage: (messageId: string | null) => void;
  stopGeneration: () => Promise<string>;
  sendSitePrompt: (prompt: any) => Promise<void>;
  
  // Folders
  loadFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  
  // Chat management
  loadAllChats: () => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  moveChatToFolder: (chatId: string, folderId?: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  deleteOldChats: (daysOld: number) => Promise<void>;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      currentChat: null,
      messages: [],
      isLoading: false,
      selectedOperator: null,
      pageContextEnabled: true,
      pageContextType: 'text',
      streamingContent: '',
      streamingImages: 0,
      editingImageResponseId: null,
      error: null,
      folders: [],
      chats: [],
      contextTruncationInfo: null,
      generatingQuestionsForMessage: null,
      activeToolExecutions: [], // Инициализация
      loadingChats: new Set<string>(),
      activeRequestController: null,

      setCurrentChat: (chat) => set({ currentChat: chat }),

  loadMessages: async (chatId) => {
    try {
      const messages = await historyAPI.getMessages(chatId);
      set({ messages });
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  },

  addMessage: async (message) => {
    try {
      await historyAPI.addMessage(message);
      set(state => ({ messages: [...state.messages, message] }));
    } catch (error) {
      console.error('Error adding message:', error);
    }
  },

  sendUserMessage: async (content, pageContext, replyTo, actionLabel, attachments = [], webSearchEnabled = false, instructionData, quotedText, previousResponseId, retryMessageId) => {
    const { currentChat, selectedOperator, addMessage, pageContextEnabled, pageContextType, loadingChats, activeRequestController, editingImageResponseId } = get();
    
    if (!currentChat || !selectedOperator) {
      console.error('No chat or operator selected');
      return;
    }

    // Check if this chat is already processing a request
    if (loadingChats.has(currentChat.id)) {
      console.warn('[chatStore] Request already in progress for chat:', currentChat.id);
      return;
    }

    // Cancel previous request if exists
    if (activeRequestController) {
      console.log('[chatStore] Cancelling previous request');
      activeRequestController.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    
    // Mark this chat as loading
    const newLoadingChats = new Set(loadingChats);
    newLoadingChats.add(currentChat.id);
    
    set({ 
      isLoading: true, 
      streamingContent: '', 
      error: null,
      loadingChats: newLoadingChats,
      activeRequestController: controller
    });
    
    // Auto-generate chat title from first user message
    if (currentChat.title === 'New Chat' && !replyTo) {
      console.log('[chatStore] Auto-generating chat title from first message:', { currentTitle: currentChat.title, content: content.substring(0, 50) });
      const newTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;
      const updatedChat = {
        ...currentChat,
        title: newTitle,
        updatedAt: Date.now()
      };
      console.log('[chatStore] Updating chat in database:', { chatId: updatedChat.id, newTitle: updatedChat.title });
      await chatAPI.updateChat(updatedChat);
      console.log('[chatStore] Chat updated successfully in database');
      
      // Update both currentChat and chats array
      set(state => ({ 
        currentChat: updatedChat,
        chats: state.chats.map(c => c.id === updatedChat.id ? updatedChat : c)
      }));
      console.log('[chatStore] Chat title updated in state');
    }

    try {
      // Get current page URL, title and icon for context tracking
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab?.url || '';
      const pageTitle = tab?.title ? (tab.title.length > 30 ? tab.title.substring(0, 30) + '...' : tab.title) : undefined;
      const pageIcon = tab?.favIconUrl || undefined;

      // Disable page context for system pages
      const isSystem = isSystemPage(currentUrl);
      const effectivePageContextEnabled = pageContextEnabled && !isSystem;

      // Calculate hash of page context if provided
      let pageContextHash: string | undefined;
      if (pageContext && effectivePageContextEnabled) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pageContext);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        pageContextHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }

      console.log('[chatStore] sendUserMessage:', {
        hasPageContext: !!pageContext,
        pageContextLength: pageContext?.length || 0,
        pageContextEnabled: effectivePageContextEnabled,
        originalPageContextEnabled: pageContextEnabled,
        pageContextType,
        url: currentUrl,
        isSystemPage: isSystem,
        hasAttachments: attachments.length > 0,
        attachmentTypes: attachments.map(a => a.type)
      });

      // Handle attachments - save all attachments to new field
      const binaryFileAttachments = attachments.filter(a => {
        if (a.type !== 'file') return false;
        return a.data.match(/^[A-Za-z0-9+/=]+$/);
      });
      
      // Save all attachments in new format
      const allAttachments = attachments.map(att => ({
        type: att.type,
        name: att.name,
        data: att.data,
        xpath: att.xpath,
        mimeType: (att as any).mimeType, // Preserve MIME type for images
        // Preserve tab-specific fields
        tabUrl: (att as any).tabUrl,
        tabTitle: (att as any).tabTitle,
        tabFavicon: (att as any).tabFavicon
      }));
      
      console.log('[chatStore] Prepared allAttachments for saving:', allAttachments.map(att => ({
        type: att.type,
        name: att.name,
        dataLength: att.data?.length || 0,
        dataPreview: att.data?.substring(0, 100),
        tabUrl: att.tabUrl,
        tabTitle: att.tabTitle
      })));
      
      // First attachment for backward compatibility
      const firstAttachment = attachments[0];
      
      // Prepare content for saving to database (only user text + text attachments, NO page context)
      let contentForDatabase = content;
      
      // Add text file/DOM attachments content to database (for display and compare)
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          if (attachment.type === 'file') {
            // Check if it's a text file (not base64)
            const isTextFile = !attachment.data.match(/^[A-Za-z0-9+/=]+$/);
            if (isTextFile) {
              contentForDatabase += `\n\nAttached file (${attachment.name}):\n${attachment.data}`;
            }
          }
          // Note: DOM and tab attachments are displayed as badges, no need to add text
        }
      }
      
      // Create user message with metadata (page context NOT included in text)
      let userMessage: ChatMessage;
      
      // If retrying, use existing message instead of creating new one
      if (retryMessageId) {
        const existingMessage = get().messages.find(m => m.id === retryMessageId);
        if (existingMessage && existingMessage.isUser) {
          userMessage = existingMessage;
          console.log('[chatStore] Retrying existing message:', retryMessageId);
        } else {
          console.error('[chatStore] Retry message not found:', retryMessageId);
          return;
        }
      } else {
        // Create new user message
        userMessage = {
          id: `msg_${Date.now()}_user`,
          createdAt: Date.now(),
          chatId: currentChat.id,
          isUser: true,
          text: contentForDatabase, // Save only user text + text attachments (NO page context)
          tokens: 0,
          replyTo,
          actionLabel,
          quotedText, // Save quoted text from context menu actions
          webSearch: webSearchEnabled, // Save web search flag
          
          // NEW: Save all attachments as JSON
          attachments: allAttachments.length > 0 ? JSON.stringify(allAttachments) : undefined,
          
          // OLD: Save first attachment for backward compatibility (skip 'tab' type as it's not supported in old format)
          attach_type: firstAttachment?.type !== 'tab' ? firstAttachment?.type : undefined,
          attach_name: firstAttachment?.type !== 'tab' ? firstAttachment?.name : undefined,
          xpath: firstAttachment?.type !== 'tab' ? firstAttachment?.xpath : undefined,
          file_data: firstAttachment?.type === 'image' || (firstAttachment?.type === 'file' && binaryFileAttachments.length > 0) 
            ? firstAttachment.data 
            : undefined,
          // Save page context metadata (not actual content)
          pageContextEnabled: pageContext && effectivePageContextEnabled ? true : undefined,
          pageContextType: pageContext && effectivePageContextEnabled ? pageContextType : undefined,
          pageContextHash: pageContextHash,
          pageUrl: currentUrl,
          pageTitle: pageContext && effectivePageContextEnabled ? pageTitle : undefined,
          pageIcon: pageContext && effectivePageContextEnabled ? pageIcon : undefined,
          // Save instruction ID
          instructionId: instructionData?.id
        };

        await addMessage(userMessage);
      }

      // Get updated messages AFTER adding user message
      const messages = get().messages;

      // Prepare messages for AI with smart context insertion
      const chatMessages = messages.filter(m => m.chatId === currentChat.id && !m.branchId);
      
      const aiMessages: AIMessage[] = await Promise.all(chatMessages.map(async (m, idx) => {
        // Message text includes attachments but NOT page context
        let messageContent = m.text;
        
        console.log(`[chatStore] Processing message ${idx} (${m.id}):`, {
          isUser: m.isUser,
          hasAttachments: !!m.attachments,
          attachmentsLength: m.attachments?.length || 0
        });
        
        // Add page context dynamically for AI (only if needed)
        if (m.pageContextEnabled && m.isUser && m.pageContextHash && pageContext && m.pageUrl === currentUrl) {
          const prevMessages = chatMessages.slice(0, idx);
          const lastWithSameContext = prevMessages.reverse().find(msg => 
            msg.pageContextEnabled && 
            msg.pageUrl === m.pageUrl &&
            msg.pageContextHash === m.pageContextHash
          );
          
          // Add context only if it's new or changed
          if (!lastWithSameContext) {
            console.log('[chatStore] Adding page context for message:', m.id);
            
            // Убедимся что pageContext - строка
            let contextStr = typeof pageContext === 'string' ? pageContext : JSON.stringify(pageContext);
            
            // Очистка контекста страницы
            let cleanedContext = contextStr;
            // Убираем множественные пробелы и табы
            cleanedContext = cleanedContext.replace(/[ \t]+/g, ' ');
            // Убираем множественные переносы строк (оставляем максимум 2 подряд)
            cleanedContext = cleanedContext.replace(/\n{3,}/g, '\n\n');
            // Убираем пробелы в начале и конце строк
            cleanedContext = cleanedContext.split('\n').map(line => line.trim()).join('\n');
            // Убираем пустые строки в начале и конце
            cleanedContext = cleanedContext.trim();
            
            messageContent += `\n\nPage context:\n${cleanedContext}`;
          }
        }
        
        // NEW: Handle multimodal messages with multiple attachments
        if (m.isUser && m.attachments) {
          try {
            const atts: MessageAttachment[] = JSON.parse(m.attachments);
            const images = atts.filter(a => a.type === 'image');
            const files = atts.filter(a => a.type === 'file');
            const tabs = atts.filter(a => a.type === 'tab');
            
            // Add tab contents to message content
            if (tabs.length > 0) {
              console.log('[chatStore] Processing tab attachments for AI:', {
                tabCount: tabs.length,
                tabs: tabs.map(t => ({
                  title: t.tabTitle || t.name,
                  url: t.tabUrl,
                  dataLength: t.data?.length || 0,
                  dataPreview: t.data?.substring(0, 100)
                }))
              });
              
              messageContent += '\n\n--- Referenced Tabs ---';
              tabs.forEach((tab, index) => {
                messageContent += `\n\nTab ${index + 1}: ${tab.tabTitle || tab.name}`;
                if (tab.tabUrl) {
                  messageContent += ` (${tab.tabUrl})`;
                }
                if (tab.data) {
                  messageContent += `\nContent:\n${tab.data}`;
                } else {
                  console.warn('[chatStore] Tab attachment missing data:', tab);
                }
              });
              
              console.log('[chatStore] Final message content length with tabs:', messageContent.length);
            }
            
            // Build content parts array for multimodal
            if (images.length > 0 || files.some(f => f.data.match(/^[A-Za-z0-9+/=]+$/))) {
              const contentParts: any[] = [{ type: 'text', text: messageContent }];
              
              // Add all images (already converted to PNG at upload time if needed)
              for (const img of images) {
                const mimeType = img.mimeType || 'image/png';
                const imageData = img.data;
                
                console.log('[chatStore] Adding image to content:', img.name, 'with MIME type:', mimeType);
                
                const imageUrl = `data:${mimeType};base64,${imageData}`;
                console.log('[chatStore] Created image URL:', imageUrl.substring(0, 100) + '...');
                
                contentParts.push({
                  type: 'image_url',
                  image_url: {
                    url: imageUrl
                  }
                });
              }
              
              // Add all binary files (PDFs, etc.)
              for (const file of files) {
                const isBinary = file.data.match(/^[A-Za-z0-9+/=]+$/);
                if (isBinary) {
                  const ext = file.name.split('.').pop()?.toLowerCase();
                  let mimeType = 'application/octet-stream';
                  if (ext === 'pdf') mimeType = 'application/pdf';
                  else if (ext === 'doc') mimeType = 'application/msword';
                  else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                  
                  contentParts.push({
                    type: 'document',
                    document: {
                      url: `data:${mimeType};base64,${file.data}`,
                      filename: file.name
                    }
                  });
                }
              }
              
              return {
                role: 'user' as const,
                content: contentParts
              };
            }
          } catch (error) {
            console.error('[chatStore] Failed to parse attachments:', error);
          }
        }
        
        // Fallback: Handle old format (single image attachment)
        if (m.isUser && m.attach_type === 'image' && m.file_data) {
          return {
            role: 'user' as const,
            content: [
              { type: 'text', text: messageContent },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${m.file_data}`
                }
              }
            ]
          };
        }
        
        return {
          role: m.isUser ? 'user' as const : 'assistant' as const,
          content: messageContent
        };
      }));

      console.log('[chatStore] Preparing context for AI:', {
        totalMessages: messages.length,
        currentChatMessages: chatMessages.length,
        filteredMessages: aiMessages.length,
        excludedBranches: messages.filter(m => m.chatId === currentChat.id && m.branchId).length
      });
      
      // Log each aiMessage to debug
      aiMessages.forEach((msg, idx) => {
        if (msg.role === 'user' && Array.isArray(msg.content)) {
          console.log(`[chatStore] aiMessage ${idx} full content:`, JSON.stringify(msg.content.map(c => ({
            type: c.type,
            text: c.type === 'text' ? c.text?.substring(0, 50) : undefined,
            imageUrl: c.type === 'image_url' ? c.image_url?.url?.substring(0, 50) : undefined
          })), null, 2));
          
          const images = msg.content.filter((c: any) => c.type === 'image_url');
          if (images.length > 0) {
            console.log(`[chatStore] aiMessage ${idx} has ${images.length} images:`);
            images.forEach((img: any, imgIdx: number) => {
              const url = img.image_url?.url || '';
              console.log(`  Image ${imgIdx}: ${url.substring(0, 50)}`);
            });
          }
        }
      });

      // Determine if we should add language instruction
      // Skip for translation requests to avoid conflicts
      const isTranslationRequest = actionLabel && actionLabel.includes(getTranslation('translateTo'));
      
      // Check if this is a new chat (first message)
      const isNewChat = chatMessages.length === 1; // Only the message we just added
      
      // Get user's language preference and add system message
      if (!isTranslationRequest) {
        const userLanguage = i18nService.getCurrentLanguage();
        const languageInstruction = getAILanguageName(userLanguage);
        
        // Build system message content with instruction (if provided)
        let systemContent = '';
        
        // Add custom instruction if provided (takes priority)
        if (instructionData?.content) {
          systemContent = `${instructionData.content}\n\n`;
          console.log('[chatStore] Adding custom instruction to system prompt');
        }
        // Otherwise, add general instruction if this is a new chat
        else if (isNewChat) {
          const { useSettingsStore } = await import('./settingsStore');
          const { generalInstruction } = useSettingsStore.getState();
          
          if (generalInstruction) {
            systemContent = `${generalInstruction}\n\n`;
            console.log('[chatStore] Adding general instruction to system prompt (new chat)');
          }
        }
        
        systemContent += `You are a helpful AI assistant. IMPORTANT: Always respond in ${languageInstruction}, regardless of the language of any provided context or documentation. The user prefers to communicate in ${languageInstruction}.`;
        
        const systemMessage: AIMessage = {
          role: 'system' as const,
          content: systemContent
        };
        
        aiMessages.unshift(systemMessage);
        
        console.log('[chatStore] Added system message with language instruction:', languageInstruction);
      } else {
        console.log('[chatStore] Skipping language instruction for translation request');
      }

      // Handle multimodal content (images and PDF files) for the LAST user message
      // This modifies the last message in aiMessages to add attachments
      const imageAttachments = attachments.filter(a => a.type === 'image');
      // binaryFileAttachments already defined above (line 185)
      
      if ((imageAttachments.length > 0 || binaryFileAttachments.length > 0) && aiMessages.length > 0) {
        // Find the last user message in aiMessages
        const lastUserMessageIndex = aiMessages.length - 1;
        const lastMessage = aiMessages[lastUserMessageIndex];
        
        if (lastMessage && lastMessage.role === 'user') {
          // Convert to multimodal format
          const textContent = typeof lastMessage.content === 'string' ? lastMessage.content : '';
          const contentParts: any[] = [{ type: 'text', text: textContent }];
          
          // Add images
          imageAttachments.forEach(img => {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${img.data}`
              }
            });
          });
          
          // Add binary files (PDF, etc.) as documents
          binaryFileAttachments.forEach(file => {
            // Determine MIME type from file extension
            const ext = file.name.split('.').pop()?.toLowerCase();
            let mimeType = 'application/octet-stream';
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext === 'doc') mimeType = 'application/msword';
            else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            
            contentParts.push({
              type: 'document',
              document: {
                url: `data:${mimeType};base64,${file.data}`,
                filename: file.name
              }
            });
          });
          
          // Replace the last user message with multimodal version
          aiMessages[lastUserMessageIndex] = {
            role: 'user',
            content: contentParts
          };
          
          console.log('[chatStore] Converted last user message to multimodal format:', {
            images: imageAttachments.length,
            documents: binaryFileAttachments.length
          });
        }
      }

      // Create assistant message placeholder
      const assistantMessageId = `msg_${Date.now()}_assistant`;
      let assistantContent = '';

      // Get web search settings if enabled
      const webSearchSettings = webSearchEnabled 
        ? (await import('@shared/stores/webSearchStore')).useWebSearchStore.getState().getSettings(selectedOperator.operator)
        : undefined;

      // Get available tools for current URL (reuse tab from above)
      // При поиске команды НЕ фильтруем по URL - команда должна работать везде
      const allAvailableTools = await getAllAvailableTools();
      
      // Check if user message is a tool command (starts with /)
      const isToolCommand = content.trim().startsWith('/');
      const commandMatch = isToolCommand ? content.trim().match(/^\/(\S+)/) : null;
      const commandName = commandMatch ? commandMatch[1] : null;
      
      // Find matching tool by command (search in ALL tools, not filtered by URL)
      const matchingTool = commandName 
        ? allAvailableTools.find(t => t.command === `/${commandName}`)
        : null;
      
      // For AI - filter tools by URL (for suggestions in dropdown)
      const availableTools = await getAllAvailableTools(currentUrl);
      
      // Check if AI has already used tools in this conversation
      const hasToolHistory = aiMessages.some(msg => msg.tool_calls && msg.tool_calls.length > 0);
      
      // Check if any previous user message in this chat was a tool command
      const currentChatMessages = get().messages.filter(m => m.chatId === currentChat.id);
      const hasToolCommandInHistory = currentChatMessages.some(msg => 
        msg.isUser && msg.text.trim().startsWith('/')
      );
      
      // Decide whether to include tools in the request
      // Tools are included when:
      // 1. User explicitly called a tool command (starts with /)
      // 2. AI has already used tools in this chat (conversation context)
      // 3. User previously called a tool command in this chat (continuation of tool usage)
      const shouldIncludeTools = isToolCommand || hasToolHistory || hasToolCommandInHistory;
      
      console.log('[chatStore] Tools decision:', {
        isToolCommand,
        commandName,
        matchingTool: matchingTool?.id,
        hasToolHistory,
        hasToolCommandInHistory,
        shouldIncludeTools,
        availableToolsCount: availableTools.length
      });
      
      // Фильтруем инструменты: скрываем fill-form (он только для UI команды /fillform)
      // но показываем get-form-fields и fill-form-fields для AI
      // Передаем только если shouldIncludeTools = true
      let toolsForAI = shouldIncludeTools 
        ? availableTools.filter(tool => tool.id !== 'fill-form')
        : [];
      
      // ВАЖНО: если пользователь вызвал команду, добавляем этот инструмент в список,
      // даже если он не проходит фильтрацию по URL
      if (matchingTool && !toolsForAI.find(t => t.id === matchingTool.id)) {
        toolsForAI = [...toolsForAI, matchingTool];
      }
      
      const toolDefinitions = toolsToDefinitions(toolsForAI);
      
      console.log('[chatStore] Tools to send to AI:', toolDefinitions.length);
      
      // Add tool usage instructions to system message if tools are available
      if (toolDefinitions.length > 0 && aiMessages.length > 0 && aiMessages[0].role === 'system') {
        const systemMsg = aiMessages[0];
        let toolInstructions = '';
        
        // Collect system instructions from all tools that we're sending to AI
        const toolsWithInstructions = toolsForAI.filter(t => t.systemInstructions);
        if (toolsWithInstructions.length > 0) {
          toolInstructions += '\n\nTool-specific instructions:';
          toolsWithInstructions.forEach(tool => {
            toolInstructions += `\n- ${tool.id}: ${tool.systemInstructions}`;
          });
        }
        
        // Add special instruction if user sent a tool command
        if (isToolCommand && matchingTool) {
          toolInstructions += `\n\nIMPORTANT: User sent command "${content}". `;
          if (matchingTool.systemInstructions) {
            toolInstructions += matchingTool.systemInstructions;
          } else {
            toolInstructions += `This is a tool command for "${matchingTool.id}". You MUST call this tool immediately.`;
          }
        }
        
        if (toolInstructions) {
          systemMsg.content = (typeof systemMsg.content === 'string' ? systemMsg.content : '') + toolInstructions;
        }
      }

      // Track tool executions
      const toolExecutions: ToolExecution[] = [];
      
      // Callback for tool execution progress
      const onToolProgress = (execution: ToolExecution) => {
        console.log('[chatStore] Tool execution progress:', execution);
        const existingIndex = toolExecutions.findIndex(e => e.id === execution.id);
        if (existingIndex >= 0) {
          toolExecutions[existingIndex] = execution;
        } else {
          toolExecutions.push(execution);
        }
        
        // Update store for real-time UI updates
        set({ activeToolExecutions: [...toolExecutions] });
      };

      // Send to AI with streaming and tools
      // Use editingImageResponseId or previousResponseId parameter
      const responseIdForEditing = previousResponseId || editingImageResponseId;
      
      // For Gemini, extract base64 image instead of using responseId
      let editingImageBase64: string | undefined;
      if (editingImageResponseId && selectedOperator.operator === 'gemini') {
        console.log('[chatStore] Extracting base64 image for Gemini editing, messageId:', editingImageResponseId);
        
        // Find the message with this ID (for Gemini we use messageId, not responseId)
        const messageWithImage = messages.find(msg => msg.id === editingImageResponseId);
        console.log('[chatStore] Found message:', !!messageWithImage, messageWithImage?.generatedImages ? 'has images' : 'no images');
        
        if (messageWithImage && messageWithImage.generatedImages) {
          try {
            const images = JSON.parse(messageWithImage.generatedImages);
            console.log('[chatStore] Parsed images:', images);
            
            if (images && images.length > 0) {
              // Use base64Image if available, otherwise extract from data URL
              if (images[0].base64Image) {
                editingImageBase64 = `data:image/png;base64,${images[0].base64Image}`;
              } else if (images[0].image_url?.url) {
                editingImageBase64 = images[0].image_url.url;
              }
              console.log('[chatStore] Extracted base64 image for editing:', editingImageBase64 ? editingImageBase64.substring(0, 50) + '...' : 'none');
            }
          } catch (error) {
            console.error('[chatStore] Failed to parse generated images:', error);
          }
        } else {
          console.log('[chatStore] Message not found or has no images');
        }
      }
      
      let response;
      
      // Check if this is an image generation request (Grok with image model)
      const model = selectedOperator.selectedModel || '';
      const isImageGeneration = selectedOperator.operator === 'grok' && 
                                 model.toLowerCase().includes('grok') && 
                                 model.toLowerCase().includes('image');
      
      if (isImageGeneration) {
        console.log('[chatStore] Detected image generation request for Grok');
        
        // Get image settings
        const { useOperatorSettingsStore } = await import('@shared/stores/operatorSettingsStore');
        const imageSettings = useOperatorSettingsStore.getState().getImageSettings('grok');
        
        // Extract prompt from last user message
        const lastUserMessage = aiMessages[aiMessages.length - 1];
        const prompt = typeof lastUserMessage.content === 'string' 
          ? lastUserMessage.content 
          : lastUserMessage.content.find(c => c.type === 'text')?.text || '';
        
        try {
          const generatedImages = await generateAIImage(
            prompt,
            selectedOperator,
            imageSettings.n || 1,
            imageSettings.responseFormat || 'b64_json'
          );
          
          console.log('[chatStore] Generated images:', generatedImages.length);
          
          // Create response with images
          response = {
            content: '', // Empty content for image-only response
            images: generatedImages,
            model: model,
            operator: selectedOperator.operator,
            tokens: undefined
          };
        } catch (error: any) {
          console.error('[chatStore] Image generation error:', error);
          throw error;
        }
      } else {
        // Normal chat request
        response = await sendAIMessage(
          aiMessages,
          selectedOperator,
          (chunk) => {
            assistantContent += chunk;
            set({ streamingContent: assistantContent });
          },
          webSearchEnabled,
          webSearchSettings,
          controller.signal,
          toolDefinitions.length > 0 ? toolDefinitions : undefined,
          undefined, // Don't execute tools during first call
          selectedOperator.operator === 'gemini' ? undefined : (responseIdForEditing || undefined), // previousResponseId only for non-Gemini
          editingImageBase64 // editingImageBase64 for Gemini
        );
      }
      
      // Clear editing state after sending
      if (editingImageResponseId) {
        set({ editingImageResponseId: null });
      }
      
      // If AI called tools, execute them and send results back
      // Keep looping until AI stops calling tools
      
      // Check if this is a parsing session
      const isParsingSession = response.tool_calls?.some(tc => 
        tc.function.name === 'parse-pages' || tc.function.name === 'find-elements'
      );
      
      // Increase iteration limit for parsing
      let maxToolIterations = isParsingSession ? 25 : 5;
      let currentIteration = 0;
      
      while (response.tool_calls && response.tool_calls.length > 0 && currentIteration < maxToolIterations) {
        currentIteration++;
        console.log('[chatStore] AI called tools (iteration ' + currentIteration + '), executing:', response.tool_calls.length);
        
        // Execute all tools
        for (const toolCall of response.tool_calls) {
          console.log('[chatStore] Executing tool:', toolCall.function.name);
          const result = await executeToolCall(toolCall, tab?.id!, controller.signal, onToolProgress);
          
          // Store execution result
          const execution = toolExecutions.find(e => e.id === toolCall.id);
          if (execution && result.output) {
            execution.output = result.output;
          }
        }
        
        // Check if we should pause for user confirmation after 20 iterations
        if (currentIteration === 20 && isParsingSession) {
          // Check if parsing was already finished (action='finish')
          const hasFinishAction = response.tool_calls.some(tc => {
            try {
              const args = JSON.parse(tc.function.arguments);
              return args.action === 'finish';
            } catch {
              return false;
            }
          });
          
          if (!hasFinishAction) {
            // Get actual page count from tool results
            let pagesProcessed = 0;
            
            // Find the last extract-data or navigate result which contains currentPage
            for (let i = toolExecutions.length - 1; i >= 0; i--) {
              const exec = toolExecutions[i];
              if (exec?.output && typeof exec.output === 'object' && 'currentPage' in exec.output) {
                pagesProcessed = (exec.output as any).currentPage || 0;
                break;
              }
            }
            
            // Fallback to iteration count if no currentPage found
            if (pagesProcessed === 0) {
              pagesProcessed = Math.floor(currentIteration / 3); // Rough estimate: 3 calls per page
            }
            
            console.log('[chatStore] Pausing parsing after 20 iterations, pages processed:', pagesProcessed);
            assistantContent += `\n\n${getTranslation('parsingContinuePrompt', [pagesProcessed.toString()])}`;
            set({ streamingContent: assistantContent });
            break; // Pause loop until user confirms
          } else {
            console.log('[chatStore] Parsing finished, skipping pause prompt');
          }
        }
        
        // Add assistant message with tool calls
        aiMessages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: response.tool_calls
        });
        
        // Add tool results as tool messages
        for (const toolCall of response.tool_calls) {
          const execution = toolExecutions.find(e => e.id === toolCall.id);
          
          // ВАЖНО: всегда добавляем tool message, даже если была ошибка
          // OpenAI API требует ответ на каждый tool_call_id
          let content: string;
          if (execution?.error) {
            content = `Error: ${execution.error}`;
          } else if (execution?.output) {
            content = typeof execution.output === 'string' ? execution.output : JSON.stringify(execution.output);
          } else {
            content = 'Tool executed with no output';
          }
          
          aiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content
          });
        }
        
        console.log('[chatStore] Sending results back to AI, total messages:', aiMessages.length);
        
        // Send again to get final response from AI
        assistantContent = ''; // Reset content for new response
        set({ streamingContent: '', isLoading: true }); // Keep loading state with empty content
        
        response = await sendAIMessage(
          aiMessages,
          selectedOperator,
          (chunk) => {
            assistantContent += chunk;
            set({ streamingContent: assistantContent });
          },
          webSearchEnabled,
          webSearchSettings,
          controller.signal,
          toolDefinitions.length > 0 ? toolDefinitions : undefined, // Pass tools again for follow-up calls
          undefined
        );
      }
      
      if (currentIteration >= maxToolIterations) {
        console.warn('[chatStore] Max tool iterations reached, stopping');
      }

      // Check if response is empty
      let finalContent = assistantContent || response.content;
      const hasImages = response.images && response.images.length > 0;
      
      if ((!finalContent || finalContent.trim() === '') && toolExecutions.length === 0 && !hasImages) {
        // Empty response without tool executions or images - this is an error
        throw new AIServiceError(AIErrorCode.EMPTY_RESPONSE, 'Empty response from AI');
      }
      
      // If content is empty but tools were executed or images were generated, use a default message
      if (!finalContent || finalContent.trim() === '') {
        if (hasImages) {
          finalContent = ''; // Empty content is OK when images are present
        } else {
          finalContent = '✓'; // Minimal placeholder to indicate tools were executed
        }
      }

      console.log('[chatStore] AI response received:', {
        contentLength: finalContent.length,
        tokens: response.tokens,
        model: selectedOperator.selectedModel,
        hasCitations: !!response.citations,
        citationsCount: response.citations?.length || 0,
        hasImages: !!response.images,
        imagesCount: response.images?.length || 0
      });

      // Save assistant message with citations, tool executions and generated images
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        createdAt: Date.now(),
        chatId: currentChat.id,
        isUser: false,
        operator: selectedOperator.operator,
        model: selectedOperator.selectedModel,
        text: finalContent,
        tokens: response.tokens?.total || 0,
        citations: response.citations,
        toolCalls: toolExecutions.length > 0 ? toolExecutions : undefined,
        generatedImages: response.images ? JSON.stringify(response.images) : undefined,
        responseId: response.response_id
      };

      await addMessage(assistantMessage);

      // Запись статистики
      if (response.tokens) {
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const statsId = `${dateStr}-${selectedOperator.operator}-${selectedOperator.selectedModel}`;
        
        const statistics = {
          id: statsId,
          date: dateStr,
          operator: selectedOperator.operator,
          model: selectedOperator.selectedModel!,
          totalTokens: response.tokens.total || 0,
          inputTokens: response.tokens.input || 0,
          outputTokens: response.tokens.output || 0,
          messageCount: 1
        };
        
        const { statisticsAPI } = await import('@shared/utils/messaging');
        await statisticsAPI.addStatistics(statistics);
      }

      // Update chat - use get() to get the latest currentChat state
      const latestCurrentChat = get().currentChat;
      if (latestCurrentChat) {
        const updatedChat = {
          ...latestCurrentChat,
          updatedAt: Date.now()
        };
        await chatAPI.updateChat(updatedChat);
        
        // Update state
        set(state => ({
          chats: state.chats.map(c => c.id === updatedChat.id ? updatedChat : c)
        }));
      }

      // Generate suggested questions (asynchronously, non-blocking)
      // Skip if:
      // 1. Tools were used - suggestions are not relevant when working with tools
      // 2. User sent a tool command - even if AI didn't call tool yet (like asking clarifying questions)
      // 3. Response contains generated images - suggestions are not relevant for image generation
      const { useSettingsStore } = await import('./settingsStore');
      const { showAISuggestions } = useSettingsStore.getState();
      const hasToolCalls = toolExecutions.length > 0;
      const hasGeneratedImages = !!response.images && response.images.length > 0;
      const shouldSkipSuggestions = hasToolCalls || isToolCommand || hasGeneratedImages;
      
      if (showAISuggestions && !shouldSkipSuggestions && selectedOperator) {
        setTimeout(() => {
          get().generateSuggestedQuestions(
            assistantMessageId,
            finalContent,
            selectedOperator.operator,
            selectedOperator.selectedModel!
          );
        }, 500);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if error is AbortError (user cancelled)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[chatStore] Request was aborted by user');
        // Don't show error for user-initiated cancellation
        return;
      }
      
      // Detect error type
      const errorCode = detectErrorType(error);
      
      // Get error message from error object
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Get localized error message
      let userFriendlyError: string;
      
      switch (errorCode) {
        case AIErrorCode.EMPTY_RESPONSE:
          userFriendlyError = getTranslation('errorEmptyResponse');
          break;
        case AIErrorCode.CONNECTION_FAILED:
          userFriendlyError = getTranslation('errorConnectionFailed');
          break;
        case AIErrorCode.TIMEOUT:
          userFriendlyError = getTranslation('errorTimeout');
          break;
        case AIErrorCode.AUTH_ERROR:
          userFriendlyError = `${getTranslation('errorAuth')}: ${errorMessage}`;
          break;
        case AIErrorCode.RATE_LIMIT:
          userFriendlyError = `${getTranslation('errorRateLimit')}: ${errorMessage}`;
          break;
        case AIErrorCode.SERVER_ERROR:
          // For server errors, show the actual error message from API
          userFriendlyError = errorMessage;
          break;
        default:
          // For unknown errors, also show the actual message
          userFriendlyError = errorMessage || getTranslation('errorUnknown');
      }
      
      set({ error: userFriendlyError });
    } finally {
      // Stop any active visual effects (parsing, tool execution)
      const tab = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab[0]?.id) {
        try {
          await chrome.tabs.sendMessage(tab[0].id, { type: 'STOP_VISUAL_EFFECT' });
          console.log('[chatStore] Visual effects stopped');
        } catch (e) {
          // Ignore errors if tab is closed or content script not ready
          console.warn('[chatStore] Failed to stop visual effects:', e);
        }
      }
      
      // Remove this chat from loading set
      const { loadingChats } = get();
      const newLoadingChats = new Set(loadingChats);
      newLoadingChats.delete(currentChat.id);
      
      set({ 
        isLoading: false, 
        streamingContent: '',
        activeToolExecutions: [], // Очищаем после завершения
        loadingChats: newLoadingChats,
        activeRequestController: null
      });
    }
  },

  setSelectedOperator: (operator) => set({ selectedOperator: operator }),

  setPageContextEnabled: (enabled) => set({ pageContextEnabled: enabled }),

  setPageContextType: (type) => set({ pageContextType: type }),

  setEditingImageResponseId: (responseId) => set({ editingImageResponseId: responseId }),

  createNewChat: async (site) => {
    const chat: Chat = {
      id: `chat_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      title: 'New Chat',
      site
    };

    await chatAPI.createChat(chat);
    set({ currentChat: chat, messages: [], error: null }); // Clear error on new chat
    return chat;
  },

  loadOrCreateChat: async (site, historyMode) => {
    try {
      console.log('[chatStore] loadOrCreateChat called:', { site, historyMode });
      
      const { activeRequestController, currentChat: previousChat } = get();
      
      // Only cancel active requests and clear loading when switching between different site chats in 'per-site' mode
      // In 'all' and 'session' modes, the dialog is continuous across tabs/sites
      if (historyMode === 'per-site' && previousChat) {
        // Check if we're actually switching to a different site's chat
        const isChangingSite = previousChat.site !== site;
        
        if (isChangingSite) {
          // Cancel any active request when switching between sites
          if (activeRequestController) {
            console.log('[chatStore] Cancelling active request due to site switch (per-site mode)');
            activeRequestController.abort();
          }
          
          // Clear loading state from previous site's chat
          const { loadingChats } = get();
          const newLoadingChats = new Set(loadingChats);
          newLoadingChats.delete(previousChat.id);
          set({ 
            loadingChats: newLoadingChats,
            isLoading: false,
            streamingContent: '',
            activeToolExecutions: [], // Очищаем
            activeRequestController: null
          });
        }
      }
      
      let chat: Chat | null = null;
      let messages: ChatMessage[] = [];

      switch (historyMode) {
        case 'per-site':
          // Load last chat for this specific site
          const chatsForSite = await chatAPI.getChatsBySite(site);
          console.log('[chatStore] Chats for site:', { site, count: chatsForSite.length, chats: chatsForSite.map((c: Chat) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt })) });
          
          if (chatsForSite.length > 0) {
            // Get the most recent chat for this site
            chat = chatsForSite.sort((a: Chat, b: Chat) => b.updatedAt - a.updatedAt)[0];
            console.log('[chatStore] Using existing chat:', { id: chat?.id, title: chat?.title, updatedAt: chat?.updatedAt });
            if (chat) {
              messages = await historyAPI.getMessages(chat.id);
              console.log('[chatStore] Loaded messages:', messages.length);
            }
          } else {
            // Create new chat for this site
            console.log('[chatStore] Creating new chat for site:', site);
            chat = await get().createNewChat(site);
          }
          break;

        case 'all':
          // Load the most recent chat regardless of site
          const allChats = await chatAPI.getAllChats();
          console.log('[chatStore] All chats:', { count: allChats.length });
          
          if (allChats.length > 0) {
            chat = allChats.sort((a: Chat, b: Chat) => b.updatedAt - a.updatedAt)[0];
            console.log('[chatStore] Using most recent chat:', chat?.id);
            if (chat) {
              messages = await historyAPI.getMessages(chat.id);
              console.log('[chatStore] Loaded messages:', messages.length);
            }
          } else {
            // Create new chat
            console.log('[chatStore] Creating new chat (no chats exist)');
            chat = await get().createNewChat(site);
          }
          break;

        case 'session':
          // Always create new chat for session mode
          console.log('[chatStore] Creating new session chat');
          chat = await get().createNewChat(site);
          break;

        default:
          console.log('[chatStore] Unknown history mode, creating new chat');
          chat = await get().createNewChat(site);
      }

      console.log('[chatStore] Setting current chat:', { chatId: chat?.id, messagesCount: messages.length });
      set({ currentChat: chat, messages, error: null }); // Clear error when loading/creating chat
    } catch (error) {
      console.error('[chatStore] Error loading or creating chat:', error);
      
      // Try to recover by checking if we already have a current chat
      const currentState = get();
      if (currentState.currentChat && currentState.currentChat.site === site) {
        console.log('[chatStore] Keeping current chat after error:', currentState.currentChat.id);
        // Keep current chat, just reload messages
        try {
          const messages = await historyAPI.getMessages(currentState.currentChat.id);
          set({ messages });
        } catch (msgError) {
          console.error('[chatStore] Error reloading messages:', msgError);
        }
      } else {
        // Last resort: try to load any existing chat for this site
        try {
          const chatsForSite = await chatAPI.getChatsBySite(site);
          if (chatsForSite.length > 0) {
            const chat = chatsForSite.sort((a: Chat, b: Chat) => b.updatedAt - a.updatedAt)[0];
            const messages = await historyAPI.getMessages(chat.id);
            console.log('[chatStore] Recovered with existing chat:', chat.id);
            set({ currentChat: chat, messages });
          } else {
            // Truly no recovery possible, clear state
            console.log('[chatStore] No recovery possible, clearing chat');
            set({ currentChat: null, messages: [] });
          }
        } catch (recoveryError) {
          console.error('[chatStore] Recovery failed:', recoveryError);
          set({ currentChat: null, messages: [] });
        }
      }
    }
  },

  clearChat: () => set({ currentChat: null, messages: [], streamingContent: '', error: null }),

  clearError: () => set({ error: null }),

  setContextTruncationInfo: (info) => set({ contextTruncationInfo: info }),

  clearContextTruncationInfo: () => set({ contextTruncationInfo: null }),

  generateSuggestedQuestions: async (messageId, aiResponse, operator, model) => {
    const { useSettingsStore } = await import('./settingsStore');
    const { showAISuggestions } = useSettingsStore.getState();
    
    if (!showAISuggestions) {
      console.log('[chatStore] AI suggestions disabled, skipping generation');
      return;
    }

    set({ generatingQuestionsForMessage: messageId });

    try {
      // Get user language
      const userLanguage = i18nService.getCurrentLanguage();
      const languageName = getAILanguageName(userLanguage);
      
      // Use up to 2000 characters (roughly 500 tokens) for context
      // This provides enough context while keeping the request efficient
      const contextLength = Math.min(aiResponse.length, 2000);
      const responseContext = aiResponse.substring(0, contextLength);
      const isTruncated = aiResponse.length > contextLength;
      
      // Create system prompt for generating questions
      const systemPrompt = `Generate 3 short, relevant follow-up questions based on this AI response. 
Questions must be in ${languageName} language.
Return ONLY plain text questions, one per line, without numbering, bullets, or HTML tags.
Do not use any formatting like <span>, <li>, <p> or markdown.

AI Response${isTruncated ? ' (excerpt)' : ''}:
${responseContext}`;

      console.log('[chatStore] Generating suggested questions for message:', {
        messageId,
        operator,
        model,
        language: languageName,
        responseLength: aiResponse.length,
        contextLength,
        isTruncated
      });

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: 'Generate 3 follow-up questions' }
      ];

      // Get operator configuration from settings
      const { useSettingsStore } = await import('./settingsStore');
      const { operators } = useSettingsStore.getState();
      const operatorFromSettings = operators.find(op => op.operator === operator);
      
      if (!operatorFromSettings) {
        console.error('[chatStore] Operator not found in settings:', operator);
        return;
      }

      // Create operator config for the specific model with proper credentials
      const operatorConfig: AIOperatorConfig = {
        ...operatorFromSettings,
        selectedModel: model
      };

      // Send request using the specific operator and model (for branches)
      const response = await sendAIMessage(
        messages,
        operatorConfig
      );

      if (response && response.content) {
        // Helper function to strip HTML tags
        const stripHtml = (text: string): string => {
          return text.replace(/<[^>]*>/g, '').trim();
        };
        
        // Parse questions (one per line)
        const questions = response.content
          .split('\n')
          .map((q: string) => {
            // Remove HTML tags and clean up
            let cleaned = stripHtml(q.trim());
            // Remove leading dashes, numbers, bullets
            cleaned = cleaned.replace(/^[-•*\d]+\.?\s*/, '');
            return cleaned;
          })
          .filter((q: string) => q.length > 0 && q.length <= 200)
          .slice(0, 3); // Maximum 3 questions

        console.log('[chatStore] Generated questions:', questions);
        console.log('[chatStore] Tokens used for questions:', response.tokens);

        // Calculate tokens used for generating questions
        const questionsTokens = response.tokens?.total || 0;

        // Update message with questions and add tokens
        set(state => ({
          messages: state.messages.map(msg => {
            if (msg.id === messageId) {
              const updatedTokens = (msg.tokens || 0) + questionsTokens;
              console.log('[chatStore] Updating message tokens:', {
                originalTokens: msg.tokens,
                questionsTokens,
                totalTokens: updatedTokens
              });
              return { 
                ...msg, 
                suggestedQuestions: questions,
                tokens: updatedTokens
              };
            }
            return msg;
          })
        }));

        // Save to database
        const updatedMessage = get().messages.find(m => m.id === messageId);
        if (updatedMessage) {
          await chatAPI.updateMessage(messageId, { 
            suggestedQuestions: questions,
            tokens: updatedMessage.tokens
          });
        }
      }
    } catch (error) {
      console.error('[chatStore] Error generating suggested questions:', error);
    } finally {
      set({ generatingQuestionsForMessage: null });
    }
  },

  setGeneratingQuestionsForMessage: (messageId) => set({ generatingQuestionsForMessage: messageId }),

  stopGeneration: async () => {
    const { activeRequestController, currentChat, loadingChats } = get();
    
    if (activeRequestController && currentChat) {
      console.log('[chatStore] Stopping generation...');
      activeRequestController.abort();
      
      // Clear loading state
      const newLoadingChats = new Set(loadingChats);
      newLoadingChats.delete(currentChat.id);
      
      set({ 
        isLoading: false, 
        streamingContent: '',
        loadingChats: newLoadingChats,
        activeRequestController: null
      });
      
      console.log('[chatStore] Generation stopped, user message preserved in history');
      
      // Return empty string (no need to restore message in input)
      return '';
    }
    
    return '';
  },

  sendSitePrompt: async (prompt: any) => {
    const { sendUserMessage, selectedOperator, pageContextType } = get();
    
    if (!selectedOperator) {
      console.error('[chatStore] No operator selected for site prompt');
      return;
    }

    try {
      const { capabilities, text, textKey } = prompt;
      
      console.log('[chatStore] Sending site prompt:', { text: textKey || text, capabilities });
      
      let pageContext: string | undefined;
      let attachments: any[] = [];
      let webSearchEnabled = false;

      // Get current tab for content script operations
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        console.warn('[chatStore] No active tab found');
      }

      // Обработка capability 'context' - получить контекст страницы
      if (capabilities.includes('context') && tab && tab.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'GET_PAGE_CONTEXT',
            data: { type: pageContextType }
          });
          
          if (response?.success && response.data) {
            pageContext = typeof response.data === 'string' ? response.data : response.data.content;
            console.log('[chatStore] Got page context:', pageContext?.length || 0, 'chars');
          }
        } catch (error) {
          console.warn('[chatStore] Could not get page context:', error);
        }
      }

      // Обработка capability 'search' - включить web search
      if (capabilities.includes('search')) {
        webSearchEnabled = true;
        console.log('[chatStore] Web search enabled for site prompt');
      }

      // Обработка capability 'vision' - сделать скриншот
      if (capabilities.includes('vision')) {
        try {
          const { captureScreenshot } = await import('@shared/utils/screenshotUtils');
          const screenshotData = await captureScreenshot();
          
          attachments.push({
            type: 'image',
            name: `screenshot_${Date.now()}.png`,
            data: screenshotData,
            mimeType: 'image/png'
          });
          
          console.log('[chatStore] Screenshot captured for site prompt');
        } catch (error) {
          console.error('[chatStore] Error capturing screenshot:', error);
        }
      }

      // Обработка capability 'transcribe_youtube' - получить транскрипцию YouTube
      if (capabilities.includes('transcribe_youtube') && tab && tab.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'EXECUTE_DOM_FUNCTION',
            data: {
              functionName: 'youtubeTranscribe',
              params: { language: 'ru', autoGenerated: true }
            }
          });
          
          if (response?.success && response.result) {
            const transcript = response.result;
            pageContext = (pageContext || '') + '\n\n--- YouTube Video Transcript ---\n' + transcript;
            console.log('[chatStore] YouTube transcript added:', transcript.length, 'chars');
          } else {
            console.warn('[chatStore] Could not get YouTube transcript:', response?.error);
          }
        } catch (error) {
          console.warn('[chatStore] Error getting YouTube transcript:', error);
        }
      }

      // Получаем локализованный текст
      const { i18nService } = await import('@shared/i18n/i18nService');
      const localizedText = textKey ? i18nService.getMessage(textKey) : text;

      // Отправляем сообщение
      await sendUserMessage(
        localizedText,
        pageContext,
        undefined, // replyTo
        undefined, // actionLabel
        attachments,
        webSearchEnabled
      );
      
      console.log('[chatStore] Site prompt sent successfully');
    } catch (error) {
      console.error('[chatStore] Error sending site prompt:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to send site prompt' });
    }
  },

  // Folders
  loadFolders: async () => {
    try {
      const folders = await folderAPI.getAllFolders();
      set({ folders });
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  },

  createFolder: async (name) => {
    try {
      const folder: ChatFolder = {
        id: `folder_${Date.now()}`,
        createdAt: Date.now(),
        name
      };
      await folderAPI.createFolder(folder);
      const folders = await folderAPI.getAllFolders();
      set({ folders });
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  },

  updateFolder: async (id, name) => {
    try {
      const folders = get().folders;
      const folder = folders.find(f => f.id === id);
      if (folder) {
        await folderAPI.updateFolder({ ...folder, name });
        const updatedFolders = await folderAPI.getAllFolders();
        set({ folders: updatedFolders });
      }
    } catch (error) {
      console.error('Error updating folder:', error);
    }
  },

  deleteFolder: async (id) => {
    try {
      // Remove folder reference from chats
      const chats = get().chats;
      for (const chat of chats) {
        if (chat.folderId === id) {
          await chatAPI.updateChat({ ...chat, folderId: undefined, updatedAt: Date.now() });
        }
      }
      
      await folderAPI.deleteFolder(id);
      const folders = await folderAPI.getAllFolders();
      const updatedChats = await chatAPI.getAllChats();
      set({ folders, chats: updatedChats });
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  },

  // Chat management
  loadAllChats: async () => {
    try {
      const chats = await chatAPI.getAllChats();
      set({ chats });
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  },

  updateChatTitle: async (chatId, title) => {
    try {
      const chats = get().chats;
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        const updatedChat = { ...chat, title, updatedAt: Date.now() };
        await chatAPI.updateChat(updatedChat);
        
        const updatedChats = chats.map(c => c.id === chatId ? updatedChat : c);
        set({ chats: updatedChats });
        
        // Update current chat if it's the same
        const currentChat = get().currentChat;
        if (currentChat?.id === chatId) {
          set({ currentChat: updatedChat });
        }
      }
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  },

  moveChatToFolder: async (chatId, folderId) => {
    try {
      const chats = get().chats;
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        const updatedChat = { ...chat, folderId, updatedAt: Date.now() };
        await chatAPI.updateChat(updatedChat);
        
        const updatedChats = chats.map(c => c.id === chatId ? updatedChat : c);
        set({ chats: updatedChats });
        
        // Update current chat if it's the same
        const currentChat = get().currentChat;
        if (currentChat?.id === chatId) {
          set({ currentChat: updatedChat });
        }
      }
    } catch (error) {
      console.error('Error moving chat to folder:', error);
    }
  },

  deleteChat: async (chatId) => {
    try {
      await chatAPI.deleteChat(chatId);
      const chats = get().chats.filter(c => c.id !== chatId);
      set({ chats });
      
      // Clear current chat if it's deleted
      const currentChat = get().currentChat;
      if (currentChat?.id === chatId) {
        set({ currentChat: null, messages: [] });
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  },

  deleteOldChats: async (daysOld) => {
    try {
      const now = Date.now();
      const cutoffTime = now - (daysOld * 24 * 60 * 60 * 1000);
      const chats = await chatAPI.getAllChats();
      
      // Find chats to delete: older than cutoff AND not in a folder
      const chatsToDelete = chats.filter((chat: Chat) => 
        chat.createdAt < cutoffTime && !chat.folderId
      );
      
      console.log(`[chatStore] Deleting ${chatsToDelete.length} chats older than ${daysOld} days`);
      
      // Delete each old chat
      for (const chat of chatsToDelete) {
        await chatAPI.deleteChat(chat.id);
      }
      
      // Reload chats list
      const updatedChats = await chatAPI.getAllChats();
      set({ chats: updatedChats });
    } catch (error) {
      console.error('Error deleting old chats:', error);
    }
  }
    }),
    {
      name: 'ailex-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedOperator: state.selectedOperator,
        pageContextEnabled: state.pageContextEnabled,
        pageContextType: state.pageContextType,
      }),
    }
  )
);

