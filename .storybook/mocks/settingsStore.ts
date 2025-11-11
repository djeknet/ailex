import { create } from 'zustand';

// Mock SettingsStore для Storybook
export const useSettingsStore = create((set) => ({
  activeView: 'chat',
  theme: 'system',
  language: 'ru',
  historyMode: 'per-site',
  showAISuggestions: true,
  maxFileSize: 10,
  maxImageSize: 5,
  operators: [
    {
      operator: 'anthropic',
      apiKey: 'mock-key',
      selectedModel: 'claude-sonnet-4-5-20250929',
      models: []
    },
    {
      operator: 'openai',
      apiKey: 'mock-key',
      selectedModel: 'gpt-4o',
      models: []
    }
  ],
  personalInfo: {
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    position: ''
  },
  generalInstruction: '',
  instructions: [],

  setActiveView: (view: any) => set({ activeView: view }),
  setTheme: (theme: any) => set({ theme }),
  setLanguage: async (language: any) => set({ language }),
  setHistoryMode: (mode: any) => set({ historyMode: mode }),
  setShowAISuggestions: (enabled: boolean) => set({ showAISuggestions: enabled }),
  updateOperators: async (operators: any) => set({ operators }),
  updatePersonalInfo: (info: any) => set({ personalInfo: info }),
  updateGeneralInstruction: (instruction: string) => set({ generalInstruction: instruction }),
  addInstruction: (instruction: any) => set((state: any) => ({
    instructions: [...state.instructions, instruction]
  })),
  updateInstruction: (instruction: any) => set((state: any) => ({
    instructions: state.instructions.map((i: any) => 
      i.id === instruction.id ? instruction : i
    )
  })),
  deleteInstruction: (id: string) => set((state: any) => ({
    instructions: state.instructions.filter((i: any) => i.id !== id)
  })),
  initializeSettings: async () => {}
}));

