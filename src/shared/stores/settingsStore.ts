import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ExtensionSettings, Instruction } from '@shared/types/extension';
import { encryptApiKey, decryptApiKey, getEncryptionMetadata } from '@shared/utils/encryption';
import { i18nService } from '@shared/i18n/i18nService';
import { ColorScheme } from '@shared/constants/colorSchemes';
import { applyColorScheme } from '@shared/utils/colorScheme';
import { FontFamily } from '@shared/constants/fonts';
import { applyFontFamily } from '@shared/utils/fontFamily';

export interface ExportedSettings {
  version: string;
  exportDate: string;
  encryptionKey: string;
  encryptionSalt: string;
  operators: ExtensionSettings['operators'];
  generalSettings: {
    theme: ExtensionSettings['theme'];
    colorScheme?: ColorScheme;
    fontFamily?: FontFamily;
    language: ExtensionSettings['language'];
    historyMode: ExtensionSettings['historyMode'];
    showAISuggestions: boolean;
    showSiteWidget: boolean;
    developerMode?: boolean;
    autoDeletionDays?: number;
  };
  personalInfo?: ExtensionSettings['personalInfo'];
  instructions: {
    general?: string;
    siteSpecific: Instruction[];
  };
}

export interface ImportOptions {
  operators: boolean;
  generalSettings: boolean;
  personalInfo: boolean;
  instructions: boolean;
}

interface SettingsStore extends ExtensionSettings {
  activeView: 'chat' | 'settings' | 'history' | 'help' | 'tools';
  activeSettingsTab: 'operators' | 'general' | 'personalInfo' | 'instructions';
  historyInitialTab?: 'chats' | 'statistics';
  setActiveView: (view: SettingsStore['activeView']) => void;
  setActiveSettingsTab: (tab: SettingsStore['activeSettingsTab']) => void;
  setHistoryInitialTab: (tab: 'chats' | 'statistics') => void;
  setTheme: (theme: ExtensionSettings['theme']) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setFontFamily: (font: FontFamily) => void;
  setLanguage: (language: ExtensionSettings['language']) => Promise<void>;
  setHistoryMode: (mode: ExtensionSettings['historyMode']) => void;
  setShowAISuggestions: (enabled: boolean) => void;
  setShowSiteWidget: (enabled: boolean) => void;
  setDeveloperMode: (enabled: boolean) => void;
  setAutoDeletionDays: (days: number) => void;
  updateOperators: (operators: ExtensionSettings['operators']) => Promise<void>;
  updatePersonalInfo: (info: ExtensionSettings['personalInfo']) => void;
  updateGeneralInstruction: (instruction: string) => void;
  addInstruction: (instruction: Instruction) => void;
  updateInstruction: (instruction: Instruction) => void;
  deleteInstruction: (id: string) => void;
  initializeSettings: () => Promise<void>;
  exportSettings: () => Promise<ExportedSettings>;
  importSettings: (data: ExportedSettings, options: ImportOptions) => Promise<void>;
  validateImportData: (data: any) => { valid: boolean; error?: string };
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, _get) => ({
      // Default values
      theme: 'system',
      colorScheme: 'green',
      fontFamily: 'system',
      language: 'en',
      historyMode: 'all',
      operators: [],
      instructions: [],
      activeView: 'chat',
      activeSettingsTab: 'operators',
      showAISuggestions: true,
      showSiteWidget: true,
      maxFileSize: 10, // 10MB by default
      maxImageSize: 5, // 5MB by default
      developerMode: false, // Developer mode disabled by default
      autoDeletionDays: 30, // Auto-delete chats older than 30 days by default

      setActiveView: (view) => set({ activeView: view }),

      setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),

      setHistoryInitialTab: (tab) => set({ historyInitialTab: tab }),

      setTheme: (theme) => {
        set({ theme });
        chrome.storage.sync.set({ theme });
        // Применяем цветовую схему при изменении темы
        const { colorScheme } = _get();
        applyColorScheme(colorScheme || 'green', theme);
      },

      setColorScheme: (colorScheme) => {
        set({ colorScheme });
        chrome.storage.sync.set({ colorScheme });
        // Применяем цветовую схему сразу
        const { theme } = _get();
        applyColorScheme(colorScheme, theme);
      },

      setFontFamily: (fontFamily) => {
        set({ fontFamily });
        chrome.storage.sync.set({ fontFamily });
        // Применяем шрифт сразу
        applyFontFamily(fontFamily);
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

      setShowSiteWidget: (showSiteWidget) => {
        set({ showSiteWidget });
        chrome.storage.sync.set({ showSiteWidget });
      },

      setDeveloperMode: (developerMode) => {
        set({ developerMode });
        chrome.storage.sync.set({ developerMode });
      },

      setAutoDeletionDays: (autoDeletionDays) => {
        set({ autoDeletionDays });
        chrome.storage.sync.set({ autoDeletionDays });
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
            ['theme', 'colorScheme', 'fontFamily', 'language', 'historyMode', 'operators', 'personalInfo', 'generalInstruction', 'instructions', 'showAISuggestions', 'showSiteWidget', 'developerMode', 'autoDeletionDays'],
            async (result) => {
              console.log('[settingsStore] Loaded from sync storage:', {
                theme: result.theme,
                colorScheme: result.colorScheme,
                fontFamily: result.fontFamily,
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
                colorScheme: result.colorScheme || 'green',
                fontFamily: result.fontFamily || 'system',
                language: result.language || 'en',
                historyMode: result.historyMode || 'all',
                operators: operatorsWithModels,
                personalInfo: result.personalInfo,
                generalInstruction: result.generalInstruction || '',
                instructions: result.instructions || [],
                showAISuggestions: result.showAISuggestions !== undefined ? result.showAISuggestions : true,
                showSiteWidget: result.showSiteWidget !== undefined ? result.showSiteWidget : true,
                developerMode: result.developerMode || false,
                autoDeletionDays: result.autoDeletionDays || 30
              });

              // Применяем цветовую схему после загрузки настроек
              const colorScheme = result.colorScheme || 'green';
              const theme = result.theme || 'system';
              applyColorScheme(colorScheme as ColorScheme, theme);

              // Применяем шрифт после загрузки настроек
              const fontFamily = result.fontFamily || 'system';
              applyFontFamily(fontFamily as FontFamily);

              resolve();
            }
          );
        });
      },

      exportSettings: async () => {
        const state = _get();
        const { encryptionKey, encryptionSalt } = getEncryptionMetadata();

        // Prepare operators with decrypted API keys (they are already decrypted in memory)
        const operatorsForExport = state.operators.map((op) => ({
          operator: op.operator,
          apiKey: op.apiKey,
          endpoint: op.endpoint,
          selectedModel: op.selectedModel
        }));

        const exportData: ExportedSettings = {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          encryptionKey,
          encryptionSalt,
          operators: operatorsForExport,
          generalSettings: {
            theme: state.theme,
            colorScheme: state.colorScheme,
            fontFamily: state.fontFamily,
            language: state.language,
            historyMode: state.historyMode,
            showAISuggestions: state.showAISuggestions,
            showSiteWidget: state.showSiteWidget,
            developerMode: state.developerMode,
            autoDeletionDays: state.autoDeletionDays
          },
          personalInfo: state.personalInfo,
          instructions: {
            general: state.generalInstruction,
            siteSpecific: state.instructions
          }
        };

        return exportData;
      },

      validateImportData: (data: any) => {
        // Check if data is an object
        if (!data || typeof data !== 'object') {
          return { valid: false, error: 'invalidFileFormat' };
        }

        // Check version
        if (!data.version || typeof data.version !== 'string') {
          return { valid: false, error: 'missingVersion' };
        }

        // Check exportDate
        if (!data.exportDate || typeof data.exportDate !== 'string') {
          return { valid: false, error: 'missingExportDate' };
        }

        // Check encryption metadata
        if (!data.encryptionKey || !data.encryptionSalt) {
          return { valid: false, error: 'missingEncryptionData' };
        }

        // Check operators structure
        if (data.operators && !Array.isArray(data.operators)) {
          return { valid: false, error: 'invalidOperators' };
        }

        // Check generalSettings structure
        if (data.generalSettings && typeof data.generalSettings !== 'object') {
          return { valid: false, error: 'invalidGeneralSettings' };
        }

        // Check personalInfo structure
        if (data.personalInfo && typeof data.personalInfo !== 'object') {
          return { valid: false, error: 'invalidPersonalInfo' };
        }

        // Check instructions structure
        if (data.instructions) {
          if (typeof data.instructions !== 'object') {
            return { valid: false, error: 'invalidInstructions' };
          }
          if (data.instructions.siteSpecific && !Array.isArray(data.instructions.siteSpecific)) {
            return { valid: false, error: 'invalidInstructions' };
          }
        }

        return { valid: true };
      },

      importSettings: async (data: ExportedSettings, options: ImportOptions) => {
        const state = _get();

        // Import operators
        if (options.operators && data.operators) {
          // Re-encrypt API keys for storage
          const operatorsWithEncryption = await Promise.all(
            data.operators.map(async (op) => ({
              ...op,
              models: [] // Will be loaded from cache
            }))
          );
          
          await state.updateOperators(operatorsWithEncryption);
        }

        // Import general settings
        if (options.generalSettings && data.generalSettings) {
          const { theme, colorScheme, fontFamily, language, historyMode, showAISuggestions, showSiteWidget, developerMode, autoDeletionDays } = data.generalSettings;
          
          if (theme) state.setTheme(theme);
          if (colorScheme) state.setColorScheme(colorScheme);
          if (fontFamily) state.setFontFamily(fontFamily);
          if (language) await state.setLanguage(language);
          if (historyMode) state.setHistoryMode(historyMode);
          if (showAISuggestions !== undefined) state.setShowAISuggestions(showAISuggestions);
          if (showSiteWidget !== undefined) state.setShowSiteWidget(showSiteWidget);
          if (developerMode !== undefined) state.setDeveloperMode(developerMode);
          if (autoDeletionDays !== undefined) state.setAutoDeletionDays(autoDeletionDays);
        }

        // Import personal info
        if (options.personalInfo && data.personalInfo) {
          state.updatePersonalInfo(data.personalInfo);
        }

        // Import instructions
        if (options.instructions && data.instructions) {
          // Import general instruction
          if (data.instructions.general) {
            state.updateGeneralInstruction(data.instructions.general);
          }

          // Import site-specific instructions
          if (data.instructions.siteSpecific && Array.isArray(data.instructions.siteSpecific)) {
            // Clear existing instructions and add imported ones
            set({ instructions: data.instructions.siteSpecific });
            chrome.storage.sync.set({ instructions: data.instructions.siteSpecific });
          }
        }
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

