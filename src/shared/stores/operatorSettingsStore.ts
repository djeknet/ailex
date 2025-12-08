import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AIOperator } from '@shared/types/ai';

export interface ImageGenerationSettings {
  // OpenRouter
  imageAspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  
  // OpenAI
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  format?: 'png' | 'jpeg' | 'webp';
  compression?: number; // 0-100 для JPEG/WebP
  background?: 'opaque' | 'transparent';
  inputFidelity?: 'low' | 'high';
  moderation?: 'auto' | 'low';
  
  // Grok
  n?: number; // 1-10 images
  responseFormat?: 'url' | 'b64_json';
  
  // Gemini
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  imageSize?: '1K' | '2K' | '4K';
}

export interface GenerationSettings {
  // Основные параметры
  temperature?: number;
  top_p?: number;
  top_k?: number;
  verbosity?: 'low' | 'medium' | 'high';
  
  // Контроль повторений
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  
  // Расширенные параметры
  min_p?: number;
  top_a?: number;
  
  // Технические параметры
  seed?: number;
  max_tokens?: number;
  stop?: string[];
  response_format?: { type: string };
}

interface OperatorSettings {
  [operator: string]: ImageGenerationSettings;
}

interface ModelGenerationSettings {
  [modelId: string]: GenerationSettings;
}

interface GenerationSettingsData {
  [operator: string]: ModelGenerationSettings;
}

interface OperatorSettingsStore {
  settings: OperatorSettings;
  generationSettings: GenerationSettingsData;
  getImageSettings: (operator: AIOperator) => ImageGenerationSettings;
  setImageSettings: (operator: AIOperator, settings: ImageGenerationSettings) => void;
  getGenerationSettings: (operator: AIOperator, modelId: string) => GenerationSettings;
  setGenerationSettings: (operator: AIOperator, modelId: string, settings: GenerationSettings) => void;
  resetGenerationSettings: (operator: AIOperator, modelId: string) => void;
  hasGenerationSettings: (operator: AIOperator, modelId: string) => boolean;
}

const defaultImageSettings: Record<AIOperator, ImageGenerationSettings> = {
  openrouter: { imageAspectRatio: '1:1' },
  openai: {
    size: 'auto',
    quality: 'auto',
    format: 'png',
    background: 'opaque',
    inputFidelity: 'low',
    moderation: 'auto'
  },
  anthropic: {},
  grok: {
    n: 1,
    responseFormat: 'b64_json'
  },
  gemini: {
    aspectRatio: '16:9',
    imageSize: '2K'
  },
  lmstudio: {},
  deepseek: {}
};

export const useOperatorSettingsStore = create<OperatorSettingsStore>()(
  persist(
    (set, get) => ({
      settings: {},
      generationSettings: {},

      getImageSettings: (operator: AIOperator) => {
        const settings = get().settings[operator];
        if (!settings) {
          return defaultImageSettings[operator] || {};
        }
        // Merge with defaults to ensure all default values are present
        return { ...defaultImageSettings[operator], ...settings };
      },

      setImageSettings: (operator: AIOperator, settings: ImageGenerationSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [operator]: settings
          }
        }));
      },

      getGenerationSettings: (operator: AIOperator, modelId: string) => {
        const operatorSettings = get().generationSettings[operator];
        if (!operatorSettings || !operatorSettings[modelId]) {
          return {};
        }
        return operatorSettings[modelId];
      },

      setGenerationSettings: (operator: AIOperator, modelId: string, settings: GenerationSettings) => {
        set((state) => ({
          generationSettings: {
            ...state.generationSettings,
            [operator]: {
              ...state.generationSettings[operator],
              [modelId]: settings
            }
          }
        }));
      },

      resetGenerationSettings: (operator: AIOperator, modelId: string) => {
        set((state) => {
          const operatorSettings = { ...state.generationSettings[operator] };
          delete operatorSettings[modelId];
          return {
            generationSettings: {
              ...state.generationSettings,
              [operator]: operatorSettings
            }
          };
        });
      },

      hasGenerationSettings: (operator: AIOperator, modelId: string) => {
        const operatorSettings = get().generationSettings[operator];
        return !!(operatorSettings && operatorSettings[modelId] && Object.keys(operatorSettings[modelId]).length > 0);
      }
    }),
    {
      name: 'operators_settings',
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

