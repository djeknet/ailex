import { create } from 'zustand';

// Mock ChatStore для Storybook
export const useChatStore = create((set, get: any) => ({
  currentChat: {
    id: 'chat_mock',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: 'Mock Chat',
    site: 'example.com'
  },
  messages: [],
  isLoading: false,
  selectedOperator: {
    operator: 'anthropic',
    apiKey: 'mock-key',
    selectedModel: 'claude-sonnet-4-5-20250929',
    models: []
  },
  pageContextEnabled: true,
  pageContextType: 'text',
  streamingContent: '',
  error: null,
  folders: [],
  chats: [],
  generatingQuestionsForMessage: null,
  contextTruncationInfo: null,
  loadingChats: new Set(),
  activeRequestController: null,

  setCurrentChat: (chat: any) => set({ currentChat: chat }),
  loadMessages: async (chatId: string) => {},
  addMessage: async (message: any) => {
    set((state: any) => ({ 
      messages: [...state.messages, message] 
    }));
  },
  sendUserMessage: async () => {},
  setSelectedOperator: (operator: any) => set({ selectedOperator: operator }),
  setPageContextEnabled: (enabled: boolean) => set({ pageContextEnabled: enabled }),
  setPageContextType: (type: any) => set({ pageContextType: type }),
  createNewChat: async () => ({
    id: 'new_chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: 'New Chat',
    site: 'example.com'
  }),
  loadOrCreateChat: async () => {},
  clearChat: () => set({ messages: [] }),
  clearError: () => set({ error: null }),
  setContextTruncationInfo: (info: any) => set({ contextTruncationInfo: info }),
  clearContextTruncationInfo: () => set({ contextTruncationInfo: null }),
  generateSuggestedQuestions: async () => {},
  setGeneratingQuestionsForMessage: (id: string | null) => set({ generatingQuestionsForMessage: id }),
  stopGeneration: async () => '',
  loadFolders: async () => {},
  createFolder: async () => {},
  updateFolder: async () => {},
  deleteFolder: async () => {},
  loadAllChats: async () => {},
  updateChatTitle: async () => {},
  moveChatToFolder: async () => {},
  deleteChat: async () => {}
}));

