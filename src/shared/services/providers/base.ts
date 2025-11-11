import { AIMessage, AIResponse, WebSearchSettings } from '@shared/types/ai';

export interface AIProvider {
  chat(
    messages: AIMessage[], 
    model: string, 
    apiKey: string, 
    endpoint?: string, 
    onChunk?: (chunk: string) => void,
    webSearchEnabled?: boolean,
    webSearchSettings?: WebSearchSettings,
    signal?: AbortSignal
  ): Promise<AIResponse>;
  listModels(apiKey: string, endpoint?: string): Promise<any[]>;
  testConnection(apiKey: string, endpoint?: string): Promise<boolean>;
}

