// Mock Chrome API для Storybook
(window as any).chrome = {
  runtime: {
    sendMessage: (message: any, callback?: any) => {
      console.log('[Mock Chrome] sendMessage:', message);
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    },
    onMessage: {
      addListener: (callback: any) => {
        console.log('[Mock Chrome] onMessage.addListener');
      },
      removeListener: (callback: any) => {
        console.log('[Mock Chrome] onMessage.removeListener');
      }
    },
    getURL: (path: string) => {
      return `chrome-extension://mock/${path}`;
    }
  },
  tabs: {
    query: (queryInfo: any, callback?: any) => {
      const mockTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
        status: 'complete'
      };
      if (callback) callback([mockTab]);
      return Promise.resolve([mockTab]);
    },
    sendMessage: (tabId: number, message: any, callback?: any) => {
      console.log('[Mock Chrome] tabs.sendMessage:', message);
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    },
    onActivated: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {}
    },
    onUpdated: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {}
    }
  },
  storage: {
    local: {
      get: (keys: any, callback?: any) => {
        const result = {};
        if (callback) callback(result);
        return Promise.resolve(result);
      },
      set: (items: any, callback?: any) => {
        if (callback) callback();
        return Promise.resolve();
      }
    }
  }
};

export {};

