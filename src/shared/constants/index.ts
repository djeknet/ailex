// 🔧 Centralized Constants
// All URLs, configuration and default values should be stored here

import { AIOperator } from '@shared/types/ai';
import modelsData from './models.json';

// =============================================================================
// 🧠 MODELS DATA
// =============================================================================

interface ModelData {
  id: string;
  name: string;
  context_length: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt: string;
    completion: string;
  };
}

// Parse models from JSON
const MODELS_DATABASE: ModelData[] = modelsData.data as ModelData[];

// Кеш для результатов getModelInfo
const modelInfoCache = new Map<string, ModelData | null>();

// Mapping of operator names to their prefixes in models.json
const OPERATOR_PREFIX_MAP: Record<string, string> = {
  'gemini': 'google',
  'openai': 'openai',
  'anthropic': 'anthropic',
  'grok': 'x-ai',
  'openrouter': '', // OpenRouter uses direct model IDs
  'lmstudio': '' // LM Studio uses custom models
};

// Helper to get detailed model information
export function getModelInfo(modelName: string, operator?: string): ModelData | null {
  if (!modelName) {
    console.log('[getModelInfo] No model name provided');
    return null;
  }
  
  // Build search ID
  let searchId = modelName;
  if (operator && operator !== 'lmstudio' && !modelName.includes('/')) {
    // Use mapped prefix for the operator
    const prefix = OPERATOR_PREFIX_MAP[operator] || operator;
    searchId = prefix ? `${prefix}/${modelName}` : modelName;
  }
  
  // Проверяем кеш
  const cacheKey = `${searchId}::${operator || ''}`;
  if (modelInfoCache.has(cacheKey)) {
    return modelInfoCache.get(cacheKey) || null;
  }
  
  console.log('[getModelInfo] Searching for model:', {
    originalModelName: modelName,
    operator,
    mappedPrefix: operator ? OPERATOR_PREFIX_MAP[operator] : undefined,
    searchId,
    databaseSize: MODELS_DATABASE.length
  });
  
  // Try exact match
  let modelData = MODELS_DATABASE.find(m => m.id === searchId);
  
  if (modelData) {
    console.log('[getModelInfo] ✅ Found exact match:', {
      searchId,
      foundId: modelData.id,
      name: modelData.name,
      contextLength: modelData.context_length,
      hasArchitecture: !!modelData.architecture,
      hasPricing: !!modelData.pricing
    });
    modelInfoCache.set(cacheKey, modelData);
    return modelData;
  }
  
  console.log('[getModelInfo] ❌ No exact match, trying partial match...');
  
  // Try partial match if not found
  const modelNameOnly = modelName.split('/').pop() || modelName;
  
  // First, try exact match on the model name only
  modelData = MODELS_DATABASE.find(m => {
    const dbModelName = m.id.split('/').pop() || m.id;
    return dbModelName.toLowerCase() === modelNameOnly.toLowerCase();
  });
  
  if (modelData) {
    console.log('[getModelInfo] ✅ Found partial match (exact name):', {
      searchId,
      modelNameOnly,
      foundId: modelData.id,
      name: modelData.name,
      contextLength: modelData.context_length
    });
    modelInfoCache.set(cacheKey, modelData);
    return modelData;
  }
  
  // Try fuzzy match - check if model name starts with or contains the DB model name
  // Example: "claude-sonnet-4-5-20250929" should match "claude-sonnet-4-5"
  modelData = MODELS_DATABASE.find(m => {
    const dbModelName = (m.id.split('/').pop() || m.id).toLowerCase();
    const searchModelName = modelNameOnly.toLowerCase();
    
    // Check if search name starts with DB name
    if (searchModelName.startsWith(dbModelName)) {
      return true;
    }
    
    // Check if DB name is contained in search name with word boundaries
    const dbNameParts = dbModelName.split('-');
    const searchNameParts = searchModelName.split('-');
    
    // All parts of DB name should be present in search name in the same order
    let dbIndex = 0;
    for (const searchPart of searchNameParts) {
      if (dbIndex < dbNameParts.length && searchPart === dbNameParts[dbIndex]) {
        dbIndex++;
      }
    }
    
    return dbIndex === dbNameParts.length;
  });
  
  if (modelData) {
    console.log('[getModelInfo] ✅ Found fuzzy match:', {
      searchId,
      modelNameOnly,
      foundId: modelData.id,
      name: modelData.name,
      contextLength: modelData.context_length
    });
    modelInfoCache.set(cacheKey, modelData);
    return modelData;
  }
  
  console.warn('[getModelInfo] ❌ Model not found in database:', {
    searchId,
    modelNameOnly,
    availableModelsExample: MODELS_DATABASE.slice(0, 5).map(m => m.id)
  });
  
  modelInfoCache.set(cacheKey, null);
  return null;
}

// Helper to get context length range from models database
export function getContextRange(): { min: number; max: number } {
  const contexts = MODELS_DATABASE
    .map(m => m.context_length)
    .filter(c => c > 0);
  
  if (contexts.length === 0) {
    return { min: 0, max: 2000000 };
  }
  
  return {
    min: Math.min(...contexts),
    max: Math.max(...contexts)
  };
}

// =============================================================================
// 🌐 EXTERNAL URLS
// =============================================================================

export const EXTERNAL_URLS = {
  // AI Operators - API Key Management
  OPENAI_API_KEYS: 'https://platform.openai.com/api-keys',
  ANTHROPIC_API_KEYS: 'https://console.anthropic.com/settings/keys',
  OPENROUTER_API_KEYS: 'https://openrouter.ai/keys',
  GROK_CONSOLE: 'https://console.x.ai/',
  GEMINI_API_KEY: 'https://makersuite.google.com/app/apikey',
  
  // Tools and Resources
  LMSTUDIO_DOWNLOAD: 'https://lmstudio.ai/',
} as const;

// =============================================================================
// 🤖 AI OPERATORS CONFIGURATION
// =============================================================================

export const AI_OPERATOR_LINKS: Record<AIOperator, string> = {
  openai: EXTERNAL_URLS.OPENAI_API_KEYS,
  anthropic: EXTERNAL_URLS.ANTHROPIC_API_KEYS,
  openrouter: EXTERNAL_URLS.OPENROUTER_API_KEYS,
  grok: EXTERNAL_URLS.GROK_CONSOLE,
  gemini: EXTERNAL_URLS.GEMINI_API_KEY,
  lmstudio: '', // Local operator, no API key needed
} as const;

// =============================================================================
// ⚙️ API CONFIGURATION
// =============================================================================

export const API_CONFIG = {
  // Default endpoints
  OPENAI_ENDPOINT: 'https://api.openai.com/v1',
  ANTHROPIC_ENDPOINT: 'https://api.anthropic.com/v1',
  OPENROUTER_ENDPOINT: 'https://openrouter.ai/api/v1',
  GROK_ENDPOINT: 'https://api.x.ai/v1',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta',
  LMSTUDIO_ENDPOINT: 'http://localhost:1234/v1',
  
  // Cache settings
  MODELS_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// =============================================================================
// 🌍 LANGUAGES CONFIGURATION
// =============================================================================

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  aiName: string; // Name to use in AI instructions
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    aiName: 'English',
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    aiName: 'Russian',
  },
  'zh-CN': {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    aiName: 'Simplified Chinese',
  },
  'zh-TW': {
    code: 'zh-TW',
    name: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    aiName: 'Traditional Chinese',
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    aiName: 'Portuguese',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    aiName: 'Spanish',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    aiName: 'French',
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    aiName: 'Korean',
  },
  vi: {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    aiName: 'Vietnamese',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    aiName: 'German',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    aiName: 'Japanese',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    aiName: 'Arabic',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    aiName: 'Hindi',
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    aiName: 'Italian',
  },
  pl: {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    aiName: 'Polish',
  },
  nl: {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    aiName: 'Dutch',
  },
  tr: {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    aiName: 'Turkish',
  },
  sv: {
    code: 'sv',
    name: 'Swedish',
    nativeName: 'Svenska',
    aiName: 'Swedish',
  },
  id: {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    aiName: 'Indonesian',
  },
  th: {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    aiName: 'Thai',
  },
  cs: {
    code: 'cs',
    name: 'Czech',
    nativeName: 'Čeština',
    aiName: 'Czech',
  },
  ro: {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română',
    aiName: 'Romanian',
  },
  el: {
    code: 'el',
    name: 'Greek',
    nativeName: 'Ελληνικά',
    aiName: 'Greek',
  },
  hu: {
    code: 'hu',
    name: 'Hungarian',
    nativeName: 'Magyar',
    aiName: 'Hungarian',
  },
  da: {
    code: 'da',
    name: 'Danish',
    nativeName: 'Dansk',
    aiName: 'Danish',
  },
} as const;

// UI languages (languages available in the extension interface)
export const UI_LANGUAGES = ['en', 'ru'] as const;

// Helper to get all translation language codes (for translate actions)
export function getTranslationLanguages(): LanguageConfig[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

// Helper to get language by code
export function getLanguageByCode(code: string): LanguageConfig | undefined {
  return SUPPORTED_LANGUAGES[code];
}

// Helper to get AI language name for system prompt
export function getAILanguageName(code: string): string {
  return SUPPORTED_LANGUAGES[code]?.aiName || 'English';
}

// =============================================================================
// 🎨 UI CONFIGURATION
// =============================================================================

export const UI_CONFIG = {
  // Theme
  DEFAULT_THEME: 'system',
  DEFAULT_LANGUAGE: 'en',
  
  // History
  DEFAULT_HISTORY_MODE: 'all',
  
  // Scrollbar
  SCROLLBAR_WIDTH: 8,
  
  // Border radius
  BORDER_RADIUS: 0.65, // rem
} as const;

// =============================================================================
// 📊 DEFAULT DATA
// =============================================================================

export const DEFAULT_DATA = {
  // Chat
  MAX_TOKENS: 4096,
  DEFAULT_CONTEXT_TOKEN_LIMIT: 30000, // Default limit for page context
  
  // Token estimation
  CHARS_PER_TOKEN: 4, // Approximate: 4 chars = 1 token for English text
  
  // Storage keys
  STORAGE_KEY_SETTINGS: 'ailex-settings',
  STORAGE_KEY_MODELS_PREFIX: 'models_',
} as const;

// =============================================================================
// 🧠 MODEL TOKEN LIMITS
// =============================================================================

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // OpenAI
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-preview': 128000,
  'gpt-4-1106-preview': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 16385,
  'gpt-3.5-turbo-16k': 16385,
  
  // Anthropic Claude
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-sonnet-20240620': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
  'claude-2.1': 200000,
  'claude-2.0': 100000,
  'claude-4.5-sonnet': 200000,
  'claude-4.5-haiku': 200000,
  'claude-4.5-opus': 200000,
  'claude-4.5-sonnet-20241022': 200000,
  'claude-4.5-sonnet-20240620': 200000,
  'claude-4.5-sonnet-20240229': 200000,
  'claude-4.5-sonnet-20240307': 200000,
  'claude-sonnet-4-5-20250929': 200000,
  'claude-haiku-4-5-20251001': 200000,
  'claude-opus-4-1-20250805': 200000,
  'claude-opus-4-20250514': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-3-5-haiku-20241022': 200000,

  // Google Gemini
  'gemini-1.5-pro-latest': 2000000,
  'gemini-1.5-pro': 2000000,
  'gemini-1.5-flash-latest': 1000000,
  'gemini-1.5-flash': 1000000,
  'gemini-1.0-pro': 32000,
  'gemini-pro': 32000,  
  'gemini-2.5-flash': 1000000, 
  'gemini-2.5-flash-lite': 1000000, 
  'gemini-2.0-flash': 1000000, 
  'gemini-2.0-flash-lite': 1000000, 
  'gemini-2.5-flash-preview-09-2025': 1000000, 
  'gemini-flash-latest': 1000000, 
  'gemini-2.5-pro': 1000000, 
  
  // Grok
  'grok-2-1212': 131072,
  'grok-2-vision-1212': 32768,
  'grok-beta': 131072,
  'grok-3': 131072,
  
  // Common local models
  'llama-3.1-70b': 128000,
  'llama-3.1-8b': 128000,
  'llama-2-70b': 4096,
  'llama-2-13b': 4096,
  'mistral-large': 128000,
  'mixtral-8x7b': 32768,
} as const;

// Helper function to get model context limit
export function getModelContextLimit(modelName: string, operator?: string): number {
  // If no model name provided, return default
  if (!modelName) {
    return DEFAULT_DATA.DEFAULT_CONTEXT_TOKEN_LIMIT;
  }
  
  // For lmstudio, the modelName already includes operator prefix (e.g., "lmstudio/model-name")
  // For other operators, construct the full ID
  let searchId = modelName;
  
  // If operator is provided and it's not lmstudio, construct full ID
  if (operator && operator !== 'lmstudio' && !modelName.includes('/')) {
    searchId = `${operator}/${modelName}`;
  }
  
  // Try to find exact match in models database
  const modelData = MODELS_DATABASE.find(m => m.id === searchId);
  if (modelData && modelData.context_length) {
    return modelData.context_length;
  }
  
  // Try partial match (search without operator prefix)
  const modelNameOnly = modelName.split('/').pop() || modelName;
  const partialMatch = MODELS_DATABASE.find(m => {
    const dbModelName = m.id.split('/').pop() || m.id;
    return dbModelName.toLowerCase() === modelNameOnly.toLowerCase();
  });
  
  if (partialMatch && partialMatch.context_length) {
    return partialMatch.context_length;
  }
  
  // Fallback to old hardcoded limits if model not found in database
  if (MODEL_CONTEXT_LIMITS[modelName]) {
    return MODEL_CONTEXT_LIMITS[modelName];
  }
  
  // Try partial match in hardcoded limits
  const normalizedModel = modelName.toLowerCase();
  for (const [key, value] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (normalizedModel.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedModel)) {
      return value;
    }
  }
  
  // Return default if no match
  console.warn('[getModelContextLimit] No match found, using default:', { 
    modelName, 
    operator,
    searchId,
    defaultLimit: DEFAULT_DATA.DEFAULT_CONTEXT_TOKEN_LIMIT 
  });
  return DEFAULT_DATA.DEFAULT_CONTEXT_TOKEN_LIMIT;
}

// Helper to get models with sufficient context
export function getModelsWithSufficientContext(requiredTokens: number): string[] {
  // First, get models from database
  const dbModels = MODELS_DATABASE
    .filter(m => m.context_length >= requiredTokens)
    .map(m => m.id);
  
  // Then add hardcoded models
  const hardcodedModels = Object.entries(MODEL_CONTEXT_LIMITS)
    .filter(([_, limit]) => limit >= requiredTokens)
    .map(([model]) => model);
  
  // Combine and deduplicate
  const allModels = [...new Set([...dbModels, ...hardcodedModels])];
  
  // Sort by context limit descending
  return allModels.sort((a, b) => {
    const limitA = getModelContextLimit(a) || 0;
    const limitB = getModelContextLimit(b) || 0;
    return limitB - limitA;
  });
}

// =============================================================================
// 🎯 MODEL CAPABILITIES
// =============================================================================

export interface ModelCapabilities {
  supportsFiles: boolean;
  supportsImages: boolean;
}

// Helper to get model capabilities based on input modalities
export function getModelCapabilities(modelId: string, operator?: string): ModelCapabilities {
  const modelInfo = getModelInfo(modelId, operator);
  
  // If model not found in database or no input_modalities info - enable by default
  if (!modelInfo || !modelInfo.architecture || !modelInfo.architecture.input_modalities) {
    return {
      supportsFiles: true,
      supportsImages: true
    };
  }
  
  const inputModalities = modelInfo.architecture.input_modalities;
  
  // Disable only if explicitly NOT supported in input_modalities
  return {
    supportsFiles: inputModalities.includes('file'),
    supportsImages: inputModalities.includes('image')
  };
}

// =============================================================================
// 🎭 RESPONSE TONES
// =============================================================================

export const RESPONSE_TONES = [
  'professional',
  'friendly',
  'direct',
  'confident',
  'casual'
] as const;

export type ResponseTone = typeof RESPONSE_TONES[number];

