import { AIMessage, AIResponse, WebSearchSettings, ToolCall } from '@shared/types/ai';
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
    previousResponseId?: string // ID предыдущего ответа для редактирования (OpenAI)
  ): Promise<AIResponse>;
  listModels(apiKey: string, endpoint?: string): Promise<any[]>;
  testConnection(apiKey: string, endpoint?: string): Promise<boolean>;
}


