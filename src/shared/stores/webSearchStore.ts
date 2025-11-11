import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AIOperator, WebSearchSettings, ClaudeWebSearchSettings, OpenAIWebSearchSettings, GrokWebSearchSettings, OpenRouterWebSearchSettings } from '@shared/types/ai';

interface WebSearchStore {
  settings: Record<AIOperator, WebSearchSettings>;
  citationMode: 'end' | 'inline' | 'both'; // Режим отображения цитат
  getSettings: (operator: AIOperator) => WebSearchSettings;
  updateSettings: (operator: AIOperator, settings: WebSearchSettings) => void;
  setCitationMode: (mode: 'end' | 'inline' | 'both') => void;
}

const defaultClaudeSettings: ClaudeWebSearchSettings = {
  maxUses: 5,
  allowedDomains: [],
  blockedDomains: [],
  location: undefined
};

const defaultOpenAISettings: OpenAIWebSearchSettings = {
  allowedDomains: [],
  externalWebAccess: true,
  location: undefined
};

const defaultGrokSettings: GrokWebSearchSettings = {
  webSearchAllowedDomains: [],
  webSearchExcludedDomains: [],
  webSearchEnableImageUnderstanding: false,
  xSearchEnabled: false,
  xSearchAllowedHandles: [],
  xSearchExcludedHandles: [],
  xSearchFromDate: undefined,
  xSearchToDate: undefined,
  xSearchEnableImageUnderstanding: false,
  xSearchEnableVideoUnderstanding: false
};

const defaultOpenRouterSettings: OpenRouterWebSearchSettings = {
  engine: 'auto', // auto-select best engine
  maxResults: 5,
  searchPrompt: 'Relevant information from the internet:',
  searchContextSize: 'medium' // balanced cost/quality
};

export const useWebSearchStore = create<WebSearchStore>()(
  persist(
    (set, get) => ({
      settings: {
        openai: { ...defaultOpenAISettings },
        anthropic: { ...defaultClaudeSettings },
        openrouter: { ...defaultOpenRouterSettings },
        grok: { ...defaultGrokSettings },
        gemini: { ...defaultClaudeSettings },
        lmstudio: { ...defaultOpenAISettings } // LM Studio uses OpenAI-compatible settings
      },
      citationMode: 'end', // По умолчанию цитаты в конце

      getSettings: (operator: AIOperator) => {
        const settings = get().settings[operator];
        if (!settings) {
          if (operator === 'openai') return defaultOpenAISettings;
          if (operator === 'grok') return defaultGrokSettings;
          if (operator === 'openrouter') return defaultOpenRouterSettings;
          if (operator === 'lmstudio') return defaultOpenAISettings;
          return defaultClaudeSettings;
        }
        return settings;
      },

      updateSettings: (operator: AIOperator, settings: WebSearchSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [operator]: settings
          }
        }));
      },
      
      setCitationMode: (mode: 'end' | 'inline' | 'both') => {
        set({ citationMode: mode });
      }
    }),
    {
      name: 'ailex-web-search',
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          return new Promise((resolve) => {
            chrome.storage.local.get([name], (result) => {
              resolve(result[name] || null);
            });
          });
        },
        setItem: (name, value) => {
          return new Promise<void>((resolve) => {
            chrome.storage.local.set({ [name]: value }, () => {
              resolve();
            });
          });
        },
        removeItem: (name) => {
          return new Promise<void>((resolve) => {
            chrome.storage.local.remove([name], () => {
              resolve();
            });
          });
        }
      }))
    }
  )
);

