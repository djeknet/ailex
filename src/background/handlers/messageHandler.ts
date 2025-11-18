import * as dbService from '../services/dbService';
import * as storageService from '../services/storageService';

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
  | 'CAPTURE_SCREENSHOT'
  | 'ADD_API_LOG'
  | 'GET_API_LOGS'
  | 'CLEAR_API_LOGS'
  | 'STOP_PARSING'
  | 'GET_PARSING_STATE'
  | 'UPDATE_PARSING_STATE'
  | 'NAVIGATE_TAB';

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

      case 'CAPTURE_SCREENSHOT': {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.id || !tab.windowId) {
          throw new Error('No active tab found');
        }
        
        // Capture visible tab from background (has required permissions)
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: 'png'
        });
        
        return { dataUrl };
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

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

