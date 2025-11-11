// Mock for zustand stores used in components

export const mockChatStore = {
  chats: [],
  activeChat: null,
  isLoading: false,
  error: null,
  createChat: () => {},
  deleteChat: () => {},
  sendUserMessage: () => Promise.resolve(),
  // Add other methods as needed
};

export const mockSettingsStore = {
  operators: {},
  getOperatorConfig: () => ({
    operator: 'anthropic',
    apiKey: '',
    selectedModel: '',
    endpoint: '',
  }),
  // Add other methods as needed
};




