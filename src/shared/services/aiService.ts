import { AIMessage, AIResponse, AIOperator, AIOperatorConfig, WebSearchSettings, ToolCall } from '@shared/types/ai';
import { ToolDefinition } from '@shared/types/tools';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { OpenRouterProvider } from './providers/openrouter';
import { GrokProvider } from './providers/grok';
import { GeminiProvider } from './providers/gemini';
import { LMStudioProvider } from './providers/lmstudio';
import { AIProvider } from './providers/base';

const providers: Record<AIOperator, AIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  openrouter: new OpenRouterProvider(),
  grok: new GrokProvider(),
  gemini: new GeminiProvider(),
  lmstudio: new LMStudioProvider()
};

export async function sendMessage(
  messages: AIMessage[],
  config: AIOperatorConfig,
  onChunk?: (chunk: string) => void,
  webSearchEnabled?: boolean,
  webSearchSettings?: WebSearchSettings,
  signal?: AbortSignal,
  tools?: ToolDefinition[],
  onToolCall?: (toolCall: ToolCall) => Promise<any>
): Promise<AIResponse> {
  console.log('[aiService] sendMessage - Starting');
  console.log('[aiService] sendMessage - Operator:', config.operator);
  console.log('[aiService] sendMessage - Selected Model:', config.selectedModel);
  console.log('[aiService] sendMessage - onChunk:', typeof onChunk, onChunk);
  console.log('[aiService] sendMessage - Streaming enabled:', !!onChunk);
  console.log('[aiService] sendMessage - Tools count:', tools?.length || 0);
  console.log('[aiService] sendMessage - Config:', {
    operator: config.operator,
    hasApiKey: !!config.apiKey,
    hasEndpoint: !!config.endpoint,
    selectedModel: config.selectedModel,
    modelsCount: config.models?.length || 0
  });
  
  const provider = providers[config.operator];
  
  if (!provider) {
    throw new Error(`Unsupported AI operator: ${config.operator}`);
  }

  if (!config.selectedModel) {
    throw new Error('No model selected');
  }

  return await provider.chat(
    messages,
    config.selectedModel,
    config.apiKey,
    config.endpoint,
    onChunk,
    webSearchEnabled,
    webSearchSettings,
    signal,
    tools,
    onToolCall
  );
}

export async function listModels(config: AIOperatorConfig): Promise<any[]> {
  const provider = providers[config.operator];
  
  if (!provider) {
    throw new Error(`Unsupported AI operator: ${config.operator}`);
  }

  return await provider.listModels(config.apiKey, config.endpoint);
}

export async function testConnection(config: AIOperatorConfig): Promise<boolean> {
  const provider = providers[config.operator];
  
  if (!provider) {
    throw new Error(`Unsupported AI operator: ${config.operator}`);
  }

  return await provider.testConnection(config.apiKey, config.endpoint);
}

// Helper to get operator display name
export function getOperatorName(operator: AIOperator): string {
  const names: Record<AIOperator, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    openrouter: 'OpenRouter',
    grok: 'Grok',
    gemini: 'Gemini',
    lmstudio: 'LM Studio'
  };
  
  return names[operator] || operator;
}

// Helper to get operator icon path
export function getOperatorIcon(operator: AIOperator): string {
  return `/icons/ai/${operator}.png`;
}

