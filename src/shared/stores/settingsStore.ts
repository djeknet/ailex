import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ExtensionSettings, Instruction } from '@shared/types/extension';
import { encryptApiKey, decryptApiKey } from '@shared/utils/encryption';
import { i18nService } from '@shared/i18n/i18nService';

interface SettingsStore extends ExtensionSettings {
  activeView: 'chat' | 'settings' | 'history' | 'help' | 'tools';
  activeSettingsTab: 'operators' | 'general' | 'personalInfo' | 'instructions';
  setActiveView: (view: SettingsStore['activeView']) => void;
  setActiveSettingsTab: (tab: SettingsStore['activeSettingsTab']) => void;
  setTheme: (theme: ExtensionSettings['theme']) => void;
  setLanguage: (language: ExtensionSettings['language']) => Promise<void>;
  setHistoryMode: (mode: ExtensionSettings['historyMode']) => void;
  setShowAISuggestions: (enabled: boolean) => void;
  setDeveloperMode: (enabled: boolean) => void;
  updateOperators: (operators: ExtensionSettings['operators']) => Promise<void>;
  updatePersonalInfo: (info: ExtensionSettings['personalInfo']) => void;
  updateGeneralInstruction: (instruction: string) => void;
  addInstruction: (instruction: Instruction) => void;
  updateInstruction: (instruction: Instruction) => void;
  deleteInstruction: (id: string) => void;
  initializeSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, _get) => ({
      // Default values
      theme: 'system',
      language: 'en',
      historyMode: 'all',
      operators: [],
      instructions: [],
      activeView: 'chat',
      activeSettingsTab: 'operators',
      showAISuggestions: true,
      maxFileSize: 10, // 10MB by default
      maxImageSize: 5, // 5MB by default
      developerMode: false, // Developer mode disabled by default

      setActiveView: (view) => set({ activeView: view }),

      setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),

      setTheme: (theme) => {
        set({ theme });
        chrome.storage.sync.set({ theme });
      },

      setLanguage: async (language) => {
        // Сначала загружаем язык через i18n сервис
        await i18nService.changeLanguage(language as 'en' | 'ru');
        // Потом сохраняем в store и storage (storage вызовет обновление в компонентах)
        set({ language });
        await chrome.storage.sync.set({ language });
      },

      setHistoryMode: (historyMode) => {
        set({ historyMode });
        chrome.storage.sync.set({ historyMode });
      },

      setShowAISuggestions: (showAISuggestions) => {
        set({ showAISuggestions });
        chrome.storage.sync.set({ showAISuggestions });
      },

      setDeveloperMode: (developerMode) => {
        set({ developerMode });
        chrome.storage.sync.set({ developerMode });
      },

      updateOperators: async (operators) => {
        console.log('[settingsStore] updateOperators called with:', operators.length, 'operators');
        
        // Prepare operators for sync storage WITHOUT models (to avoid quota)
        // Encrypt API keys before saving
        const operatorsForSync = await Promise.all(operators.map(async (op) => {
          console.log(`[settingsStore] Operator ${op.operator}:`, {
            hasApiKey: !!op.apiKey,
            hasEndpoint: !!op.endpoint,
            hasModels: !!op.models,
            modelsCount: op.models?.length || 0,
            selectedModel: op.selectedModel
          });
          
          // Encrypt API key if present
          const encryptedApiKey = op.apiKey ? await encryptApiKey(op.apiKey) : '';
          console.log(`[settingsStore] API key encrypted for ${op.operator}:`, {
            original_length: op.apiKey?.length || 0,
            encrypted_length: encryptedApiKey?.length || 0
          });
          
          // Return operator config without models array
          return {
            operator: op.operator,
            apiKey: encryptedApiKey,
            endpoint: op.endpoint,
            selectedModel: op.selectedModel
          };
        }));
        
        // Save full config to Zustand state (with models, plain API keys in memory)
        set({ operators });
        
        // Save only config to sync storage (without models, with encrypted API keys)
        chrome.storage.sync.set({ operators: operatorsForSync }, () => {
          console.log('[settingsStore] Operators config saved to sync storage (encrypted)');
          if (chrome.runtime.lastError) {
            console.error('[settingsStore] Error saving to sync storage:', chrome.runtime.lastError);
          }
        });
      },

      updatePersonalInfo: (personalInfo) => {
        set({ personalInfo });
        chrome.storage.sync.set({ personalInfo });
      },

      updateGeneralInstruction: (generalInstruction) => {
        set({ generalInstruction });
        chrome.storage.sync.set({ generalInstruction });
      },

      addInstruction: (instruction) => {
        set((state) => {
          const instructions = [...state.instructions, instruction];
          chrome.storage.sync.set({ instructions });
          return { instructions };
        });
      },

      updateInstruction: (instruction) => {
        set((state) => {
          const instructions = state.instructions.map(i => 
            i.id === instruction.id ? instruction : i
          );
          chrome.storage.sync.set({ instructions });
          return { instructions };
        });
      },

      deleteInstruction: (id) => {
        set((state) => {
          const instructions = state.instructions.filter(i => i.id !== id);
          chrome.storage.sync.set({ instructions });
          return { instructions };
        });
      },

      initializeSettings: async () => {
        console.log('[settingsStore] initializeSettings called');
        return new Promise((resolve) => {
          chrome.storage.sync.get(
            ['theme', 'language', 'historyMode', 'operators', 'personalInfo', 'generalInstruction', 'instructions', 'showAISuggestions', 'developerMode'],
            async (result) => {
              console.log('[settingsStore] Loaded from sync storage:', {
                theme: result.theme,
                language: result.language,
                historyMode: result.historyMode,
                operatorsCount: result.operators?.length || 0,
                hasPersonalInfo: !!result.personalInfo,
                showAISuggestions: result.showAISuggestions
              });
              
              // Load operators from sync (without models, with encrypted API keys)
              const operatorsFromSync = result.operators || [];
              
              // Load cached models from local storage for each operator and decrypt API keys
              const operatorsWithModels = await Promise.all(
                operatorsFromSync.map(async (op: any) => {
                  console.log(`[settingsStore] Loading operator ${op.operator} from sync`);
                  
                  try {
                    // Decrypt API key
                    const decryptedApiKey = op.apiKey ? await decryptApiKey(op.apiKey) : '';
                    console.log(`[settingsStore] API key decrypted for ${op.operator}:`, {
                      encrypted_length: op.apiKey?.length || 0,
                      decrypted_length: decryptedApiKey?.length || 0
                    });
                    
                    // Get cached models from local storage
                    const cachedData = await new Promise<any>((res) => {
                      chrome.storage.local.get([`models_${op.operator}`], (result) => {
                        res(result[`models_${op.operator}`]);
                      });
                    });
                    
                    // Extract models from cache structure { data: [], timestamp: number }
                    const models = cachedData?.data || [];
                    console.log(`[settingsStore] Loaded ${models.length} cached models for ${op.operator}`);
                    
                    return {
                      ...op,
                      apiKey: decryptedApiKey,
                      models
                    };
                  } catch (error) {
                    console.error(`[settingsStore] Error loading models for ${op.operator}:`, error);
                    return {
                      ...op,
                      apiKey: '', // Clear API key on error
                      models: []
                    };
                  }
                })
              );
              
              operatorsWithModels.forEach((op: any) => {
                console.log(`[settingsStore] Final operator ${op.operator}:`, {
                  hasApiKey: !!op.apiKey,
                  hasEndpoint: !!op.endpoint,
                  modelsCount: op.models?.length || 0,
                  selectedModel: op.selectedModel
                });
              });
              
              set({
                theme: result.theme || 'system',
                language: result.language || 'en',
                historyMode: result.historyMode || 'all',
                operators: operatorsWithModels,
                personalInfo: result.personalInfo,
                generalInstruction: result.generalInstruction || '',
                instructions: result.instructions || [],
                showAISuggestions: result.showAISuggestions !== undefined ? result.showAISuggestions : true,
                developerMode: result.developerMode || false
              });
              resolve();
            }
          );
        });
      }
    }),
    {
      name: 'ailex-settings',
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

