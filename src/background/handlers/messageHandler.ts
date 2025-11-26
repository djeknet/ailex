import * as dbService from '../services/dbService';
import * as storageService from '../services/storageService';
import { handleCustomInstructionRequest } from './contextMenuHandler';

export type MessageType =
  | 'GET_CHAT'
  | 'CREATE_CHAT'
  | 'UPDATE_CHAT'
  | 'DELETE_CHAT'
  | 'GET_CHATS'
  | 'GET_CHATS_BY_SITE'
  | 'ADD_MESSAGE'
  | 'GET_MESSAGES'
  | 'UPDATE_MESSAGE'
  | 'DELETE_MESSAGE'
  | 'DELETE_ALL_HISTORY'
  | 'GET_FOLDERS'
  | 'CREATE_FOLDER'
  | 'UPDATE_FOLDER'
  | 'DELETE_FOLDER'
  | 'ADD_STATISTICS'
  | 'GET_STATISTICS'
  | 'GET_STORAGE'
  | 'SET_STORAGE'
  | 'CACHE_MODELS'
  | 'GET_CACHED_MODELS'
  | 'CLEAR_OPERATOR_CACHE'
  | 'CAPTURE_SCREENSHOT'
  | 'ADD_API_LOG'
  | 'GET_API_LOGS'
  | 'CLEAR_API_LOGS'
  | 'STOP_PARSING'
  | 'GET_PARSING_STATE'
  | 'UPDATE_PARSING_STATE'
  | 'NAVIGATE_TAB'
  | 'GET_CURRENT_TAB_ID'
  | 'OPEN_FULLSCREEN_WITH_PROMPT'
  | 'GET_SITE_PROMPTS_CONFIG'
  | 'PROCESS_CUSTOM_INSTRUCTION'
  | 'GET_YOUTUBE_TRANSCRIPT'
  | 'GET_PDF_FILE';

export interface Message {
  type: MessageType;
  data?: any;
}

export async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender
): Promise<any> {
  try {
    switch (message.type) {
      // Chat operations
      case 'GET_CHAT':
        return await dbService.getChat(message.data.id);

      case 'CREATE_CHAT':
        await dbService.createChat(message.data);
        return { success: true };

      case 'UPDATE_CHAT':
        await dbService.updateChat(message.data);
        return { success: true };

      case 'DELETE_CHAT':
        await dbService.deleteChat(message.data.id);
        return { success: true };

      case 'GET_CHATS':
        return await dbService.getAllChats();

      case 'GET_CHATS_BY_SITE':
        return await dbService.getChatsBySite(message.data.site);

      // History operations
      case 'ADD_MESSAGE':
        await dbService.addMessage(message.data);
        return { success: true };

      case 'GET_MESSAGES':
        return await dbService.getMessagesByChat(message.data.chatId);

      case 'UPDATE_MESSAGE':
        await dbService.updateMessage(message.data.messageId, message.data.updates);
        return { success: true };

      case 'DELETE_MESSAGE':
        await dbService.deleteMessage(message.data.messageId);
        return { success: true };

      case 'DELETE_ALL_HISTORY':
        await dbService.deleteAllHistory();
        return { success: true };

      // Folder operations
      case 'GET_FOLDERS':
        return await dbService.getAllFolders();

      case 'CREATE_FOLDER':
        await dbService.createFolder(message.data);
        return { success: true };

      case 'UPDATE_FOLDER':
        await dbService.updateFolder(message.data);
        return { success: true };

      case 'DELETE_FOLDER':
        await dbService.deleteFolder(message.data.id);
        return { success: true };

      // Statistics operations
      case 'ADD_STATISTICS':
        await dbService.addStatistics(message.data);
        return { success: true };

      case 'GET_STATISTICS':
        return await dbService.getStatisticsByDateRange(
          message.data.startDate,
          message.data.endDate,
          message.data.operator
        );

      // Storage operations
      case 'GET_STORAGE':
        if (message.data.storage === 'sync') {
          return await storageService.getSyncStorage(message.data.keys);
        } else {
          return await storageService.getLocalStorage(message.data.keys);
        }

      case 'SET_STORAGE':
        if (message.data.storage === 'sync') {
          await storageService.setSyncStorage(message.data.data);
        } else {
          await storageService.setLocalStorage(message.data.data);
        }
        return { success: true };

      case 'CACHE_MODELS':
        await storageService.cacheModels(message.data.operator, message.data.models);
        return { success: true };

      case 'GET_CACHED_MODELS':
        return await storageService.getCachedModels(message.data.operator);

      case 'CLEAR_OPERATOR_CACHE':
        await storageService.removeLocalStorage([`models_${message.data.operator}`]);
        return { success: true };

      case 'CAPTURE_SCREENSHOT': {
        // Получаем tabId целевой страницы из данных или используем активную вкладку
        let targetTabId = message.data?.tabId;
        
        if (!targetTabId) {
          // Fallback на активную вкладку если tabId не передан
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          targetTabId = tab.id;
        }
        
        if (!targetTabId) {
          throw new Error('No tab ID found for screenshot');
        }
        
        // Получаем информацию о вкладке для windowId
        const tab = await chrome.tabs.get(targetTabId);
        
        if (!tab.windowId) {
          throw new Error('No window ID found for tab');
        }
        
        // Сохраняем текущую активную вкладку
        const [currentActiveTab] = await chrome.tabs.query({ 
          active: true, 
          windowId: tab.windowId 
        });
        
        try {
          // Временно активируем целевую вкладку для захвата скриншота
          if (currentActiveTab?.id !== targetTabId) {
            await chrome.tabs.update(targetTabId, { active: true });
            // Даём время на рендеринг (100ms)
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Захватываем скриншот АКТИВНОЙ вкладки в окне
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png'
          });
          
          return { success: true, data: dataUrl };
        } finally {
          // Возвращаем активность обратно на исходную вкладку
          if (currentActiveTab?.id && currentActiveTab.id !== targetTabId) {
            await chrome.tabs.update(currentActiveTab.id, { active: true });
          }
        }
      }

      // API Logs operations (developer mode)
      case 'ADD_API_LOG':
        await dbService.addApiLog(message.data);
        return { success: true };

      case 'GET_API_LOGS':
        return await dbService.getApiLogs(message.data?.limit);

      case 'CLEAR_API_LOGS':
        await dbService.clearApiLogs();
        return { success: true };

      // Parsing operations
      case 'STOP_PARSING': {
        const sessionKey = `parsing_${message.data.sessionId}`;
        const state = await storageService.getLocalStorage([sessionKey]);
        
        if (state[sessionKey]) {
          await storageService.setLocalStorage({
            [sessionKey]: {
              ...state[sessionKey],
              status: 'paused'
            }
          });
        }
        
        return { success: true };
      }

      case 'GET_PARSING_STATE':
        const getSessionKey = `parsing_${message.data.sessionId}`;
        return await storageService.getLocalStorage([getSessionKey]);

      case 'UPDATE_PARSING_STATE':
        await storageService.setLocalStorage({
          [`parsing_${message.data.sessionId}`]: message.data.state
        });
        return { success: true };

      case 'NAVIGATE_TAB':
        await chrome.tabs.update(message.data.tabId, { url: message.data.url });
        return { success: true };

      case 'GET_CURRENT_TAB_ID':
        // Get tab ID from sender (more reliable for content scripts)
        if (_sender.tab?.id) {
          return { tabId: _sender.tab.id };
        }
        // Fallback to active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return { tabId: activeTab?.id || null };

      case 'OPEN_FULLSCREEN_WITH_PROMPT':
        // Open fullscreen extension page
        try {
          const { url } = message.data;
          await chrome.tabs.create({ url, active: true });
          return { success: true };
        } catch (error) {
          console.error('[background] Error opening fullscreen:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }

      case 'GET_SITE_PROMPTS_CONFIG':
        // Load site-prompts.json and return it
        try {
          const configUrl = chrome.runtime.getURL('site-prompts.json');
          const configResponse = await fetch(configUrl);
          const config = await configResponse.json();
          return { success: true, config };
        } catch (error) {
          console.error('[background] Error loading site-prompts.json:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Failed to load configuration' };
        }

      case 'PROCESS_CUSTOM_INSTRUCTION':
        // Get the tab ID from sender
        const tabId = _sender.tab?.id;
        if (!tabId) {
          throw new Error('No tab ID found');
        }
        
        const { instruction } = message.data;
        if (!instruction) {
          throw new Error('No instruction provided');
        }
        
        // Process the custom instruction
        await handleCustomInstructionRequest(tabId, instruction);
        return { success: true };

      case 'GET_YOUTUBE_TRANSCRIPT':
        // Возвращаем перехваченный URL субтитров из background
        try {
          // Получаем lastWorkingSubtitleUrl из глобального контекста background
          const lastUrl = (globalThis as any).lastWorkingSubtitleUrl;
          
          if (!lastUrl) {
            return {
              success: false,
              error: 'No working subtitle URL captured yet. Try playing the video or enabling captions first.'
            };
          }
          
          console.log('[background] Fetching transcript from captured URL...');
          
          // Скачиваем XML субтитров
          const response = await fetch(lastUrl, { credentials: 'omit' });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const xmlText = await response.text();
          console.log('[background] Fetched XML, length:', xmlText.length);
          
          return {
            success: true,
            xmlText
          };
        } catch (error) {
          console.error('[background] Error fetching YouTube transcript:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }

      case 'GET_PDF_FILE':
        // Handle file:// PDF URLs (requires special permissions)
        try {
          const pdfUrl = message.data?.url;
          
          if (!pdfUrl) {
            return { success: false, error: 'No PDF URL provided' };
          }
          
          console.log('[background] Attempting to fetch PDF from:', pdfUrl);
          
          // Try to fetch the file:// URL
          // Note: This will only work if user enabled "Allow access to file URLs" in extension settings
          try {
            const response = await fetch(pdfUrl);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch PDF: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // Convert blob to base64
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            console.log('[background] PDF fetched successfully, size:', blob.size, 'bytes');
            
            return {
              success: true,
              data: base64,
              mimeType: 'application/pdf',
              size: blob.size
            };
          } catch (fetchError) {
            // If fetch fails for file://, it's likely a permissions issue
            if (pdfUrl.startsWith('file://')) {
              return {
                success: false,
                error: 'FILE_ACCESS_DENIED',
                message: 'Extension needs permission to access local files. Please enable "Allow access to file URLs" in chrome://extensions'
              };
            }
            throw fetchError;
          }
        } catch (error) {
          console.error('[background] Error fetching PDF file:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch PDF file'
          };
        }

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

