export type AIOperator = 'openai' | 'anthropic' | 'openrouter' | 'grok' | 'gemini' | 'lmstudio' | 'deepseek';

export interface AIModel {
  id: string;
  name: string;
  operator: AIOperator;
}

export interface AIOperatorConfig {
  operator: AIOperator;
  apiKey: string;
  endpoint?: string;
  selectedModel?: string;
  models?: AIModel[];
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | Array<{
    type: 'text' | 'image_url' | 'document';
    text?: string;
    image_url?: {
      url: string;
    };
    document?: {
      url: string;
      filename?: string;
    };
  }>;
  timestamp?: number;
  tool_calls?: ToolCall[]; // Вызовы инструментов от assistant
  tool_call_id?: string; // ID вызова для role: 'tool'
  name?: string; // Имя инструмента для role: 'tool'
}

// Tool calling types
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface AIResponse {
  content: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  operator: AIOperator;
  citations?: Citation[];
  inlineCitations?: boolean; // Whether to show citations inline in text
  tool_calls?: ToolCall[]; // Вызовы инструментов
  finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  images?: GeneratedImage[]; // Сгенерированные изображения
  response_id?: string; // ID ответа от OpenAI Responses API для редактирования
  reasoning_content?: string; // Цепочка рассуждений (DeepSeek reasoner)
}

// Image Generation Types
export interface GeneratedImage {
  type: 'image_url';
  image_url: {
    url: string; // base64 data URL
  };
  response_id?: string; // ID ответа для редактирования (OpenAI)
  image_generation_call_id?: string; // ID вызова генерации
  base64Image?: string; // base64 данные для редактирования (Gemini)
}

// Web Search Types
export interface Citation {
  url: string;
  title: string;
  cited_text: string;
}

export interface ClaudeWebSearchSettings {
  maxUses: number; // default: 5
  allowedDomains: string[];
  blockedDomains: string[];
  location?: {
    city: string;
    region: string;
    country: string;
    timezone: string;
  };
}

export interface OpenAIWebSearchSettings {
  allowedDomains: string[]; // max 20 URLs
  externalWebAccess: boolean; // default: true (live access), false = cache-only
  location?: {
    city: string;
    region: string;
    country: string; // two-letter ISO code
    timezone: string; // IANA timezone
  };
}

export interface GrokWebSearchSettings {
  // Web Search settings (always enabled when web search is active)
  webSearchAllowedDomains: string[]; // max 5 domains
  webSearchExcludedDomains: string[]; // max 5 domains
  webSearchEnableImageUnderstanding: boolean;
  
  // X Search settings (optional, toggle in UI)
  xSearchEnabled: boolean; // User can choose to enable X search in addition to web search
  xSearchAllowedHandles: string[]; // max 10 handles
  xSearchExcludedHandles: string[]; // max 10 handles
  xSearchFromDate?: string; // ISO8601 format YYYY-MM-DD
  xSearchToDate?: string; // ISO8601 format YYYY-MM-DD
  xSearchEnableImageUnderstanding: boolean;
  xSearchEnableVideoUnderstanding: boolean;
}

export interface OpenRouterWebSearchSettings {
  engine: 'native' | 'exa' | 'auto'; // 'native' = provider's built-in, 'exa' = Exa API, 'auto' = automatic
  maxResults: number; // default: 5
  searchPrompt: string; // Custom prompt for search results
  searchContextSize: 'low' | 'medium' | 'high'; // Only for 'native' engine
}

// Для других операторов (будет расширяться)
export type WebSearchSettings = ClaudeWebSearchSettings | OpenAIWebSearchSettings | GrokWebSearchSettings | OpenRouterWebSearchSettings;

