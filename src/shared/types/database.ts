import { AIOperator, Citation } from './ai';
import { ToolExecution } from './tools';

export interface Chat {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  folderId?: string;
  site: string;
}

export interface ChatMessage {
  id: string;
  createdAt: number;
  chatId: string;
  isUser: boolean;
  operator?: AIOperator;
  model?: string;
  replyTo?: string;
  actionLabel?: string; // Label for rewrite actions (e.g., "Make longer", "Translate to: Russian")
  quotedText?: string; // Quoted text for context menu actions (stores the selected text)
  branchId?: string; // ID of the original message if this is a branch/alternative response
  text: string;
  tokens: number;
  fileData?: string;
  suggestedQuestions?: string[]; // Array of related follow-up questions for AI responses
  citations?: Citation[]; // Web search citations from AI responses
  webSearch?: boolean; // Whether web search was used for this message
  
  // Tool calling информация
  toolCalls?: ToolExecution[]; // Информация о выполненных инструментах
  
  // Attachment metadata (старые поля для обратной совместимости)
  attach_type?: 'file' | 'image' | 'dom'; // Type of attached content
  attach_name?: string; // Name of file or DOM element
  xpath?: string; // XPath for DOM elements
  file_data?: string; // Base64 data for files and images
  
  // Multiple attachments (новое поле)
  attachments?: string; // JSON array of MessageAttachment objects
  
  // Generated images metadata
  generatedImages?: string; // JSON array of GeneratedImage objects
  
  // OpenAI response ID for image editing
  responseId?: string; // OpenAI response ID для редактирования изображений
  
  // Page context metadata (NOT storing actual content to save space)
  pageContextEnabled?: boolean; // Whether page context was used for this message
  pageContextType?: 'text' | 'dom' | 'html'; // Type of page context used
  pageContextHash?: string; // Hash of page context to detect changes
  pageUrl?: string; // URL of the page at the time of message
  pageTitle?: string; // Title of the page (truncated to 30 chars)
  pageIcon?: string; // Favicon URL of the page
  
  // Instruction metadata
  instructionId?: string; // ID of the instruction used for this message
}

// Type for individual attachment
export interface MessageAttachment {
  type: 'file' | 'image' | 'dom' | 'tab';
  name: string;
  data: string;
  mimeType?: string; // MIME type for images and files
  xpath?: string;
  // For tab attachments
  tabUrl?: string; // URL of the tab
  tabTitle?: string; // Title of the tab
  tabFavicon?: string; // Favicon URL of the tab
}

export interface ChatFolder {
  id: string;
  createdAt: number;
  name: string;
}

export interface Statistics {
  id: string;
  date: string;
  operator: AIOperator;
  model: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  messageCount: number;
  spent?: number; // Опционально, для будущей реализации
}

export interface ApiLogEntry {
  id: string; // UUID
  timestamp: number;
  type: 'request' | 'response';
  url: string;
  method: string;
  status?: number;
  requestBody?: string;
  responseBody?: string;
  headers?: Record<string, string>;
  duration?: number;
  error?: string;
}

// Custom Tools (пользовательские инструменты)
export interface CustomTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  command: string;
  urlPattern?: string; // Паттерн URL для фильтрации
  prompt: string; // Промпт для AI
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  // API Integration
  apiUrl?: string; // API endpoint
  apiMethod?: 'GET' | 'POST'; // HTTP метод
  apiHeaders?: Record<string, string>; // Headers для аутентификации
}

