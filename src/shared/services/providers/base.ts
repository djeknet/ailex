import { AIMessage, AIResponse, WebSearchSettings, ToolCall, GeneratedImage } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';

export interface AIProvider {
  chat(
    messages: AIMessage[], 
    model: string, 
    apiKey: string, 
    endpoint?: string, 
    onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    webSearchSettings?: WebSearchSettings,
    signal?: AbortSignal,
    tools?: ToolDefinition[], // Доступные инструменты
    onToolCall?: (toolCall: ToolCall) => Promise<any>, // Callback при вызове инструмента
    previousResponseId?: string, // ID предыдущего ответа для редактирования (OpenAI)
    editingImageBase64?: string, // base64 изображения для редактирования (Gemini)
    onReasoningChunk?: (chunk: string) => void // Callback для reasoning chunks (DeepSeek)
  ): Promise<AIResponse>;
  listModels(apiKey: string, endpoint?: string): Promise<any[]>;
  testConnection(apiKey: string, endpoint?: string): Promise<boolean>;
  
  // Image generation method (optional, for providers that support it)
  generateImage?(
    prompt: string,
    apiKey: string,
    endpoint?: string,
    n?: number,
    responseFormat?: 'url' | 'b64_json'
  ): Promise<GeneratedImage[]>;
}


