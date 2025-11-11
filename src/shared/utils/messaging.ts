// Helper functions for working with database via background service worker

export async function sendMessage<T = any>(type: string, data?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, data }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

// Chat operations
export const chatAPI = {
  getChat: (id: string) => sendMessage('GET_CHAT', { id }),
  createChat: (chat: any) => sendMessage('CREATE_CHAT', chat),
  updateChat: (chat: any) => sendMessage('UPDATE_CHAT', chat),
  deleteChat: (id: string) => sendMessage('DELETE_CHAT', { id }),
  getAllChats: () => sendMessage('GET_CHATS'),
  getChatsBySite: (site: string) => sendMessage('GET_CHATS_BY_SITE', { site }),
  updateMessage: (messageId: string, updates: any) => sendMessage('UPDATE_MESSAGE', { messageId, updates })
};

// History operations
export const historyAPI = {
  addMessage: (message: any) => sendMessage('ADD_MESSAGE', message),
  getMessages: (chatId: string) => sendMessage('GET_MESSAGES', { chatId }),
  deleteMessage: (messageId: string) => sendMessage('DELETE_MESSAGE', { messageId }),
  deleteAllHistory: () => sendMessage('DELETE_ALL_HISTORY')
};

// Folder operations
export const folderAPI = {
  getAllFolders: () => sendMessage('GET_FOLDERS'),
  createFolder: (folder: any) => sendMessage('CREATE_FOLDER', folder),
  updateFolder: (folder: any) => sendMessage('UPDATE_FOLDER', folder),
  deleteFolder: (id: string) => sendMessage('DELETE_FOLDER', { id })
};

// Statistics operations
export const statisticsAPI = {
  addStatistics: (stats: any) => sendMessage('ADD_STATISTICS', stats),
  getStatistics: (startDate: string, endDate: string, operator?: string) =>
    sendMessage('GET_STATISTICS', { startDate, endDate, operator })
};

// Storage operations
export const storageAPI = {
  getStorage: (storage: 'sync' | 'local', keys?: string | string[]) => 
    sendMessage('GET_STORAGE', { storage, keys }),
  setStorage: (storage: 'sync' | 'local', data: any) => 
    sendMessage('SET_STORAGE', { storage, data }),
  cacheModels: (operator: string, models: any[]) => 
    sendMessage('CACHE_MODELS', { operator, models }),
  getCachedModels: (operator: string) => 
    sendMessage('GET_CACHED_MODELS', { operator })
};

