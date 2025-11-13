export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  command: string; // Команда для вызова через чат (например, "/summarize")
  urlPattern?: string; // Паттерн URL для фильтрации (точное совпадение начала)
  isBuiltIn: boolean; // Встроенный или пользовательский
  execute: (params: any) => Promise<any>;
  requiresPersonalInfo?: boolean;
  requiresPageContext?: boolean; // Автоматически включает передачу контекста страницы
  parameters?: ToolParameters; // JSON Schema параметров для AI
  hiddenFromUI?: boolean; // Скрыть из UI (инструмент доступен только для AI)
  nameKey?: string; // Ключ локализации для name
  descriptionKey?: string; // Ключ локализации для description
  systemInstructions?: string; // Дополнительные инструкции для AI при вызове этого инструмента
}

export interface ToolRegistry {
  [key: string]: Tool;
}

// JSON Schema для параметров инструмента
export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ToolParameterProperty;
  default?: any;
}

// Типы для tool calling в AI
export interface ToolCall {
  id: string; // Уникальный ID вызова
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string с параметрами
  };
}

export interface ToolResult {
  tool_call_id: string;
  output: any; // Результат выполнения
  error?: string;
}

// Формат определения инструмента для AI провайдеров
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameters;
  };
}

// Пользовательский инструмент (для хранения в БД)
export interface CustomTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  command: string;
  urlPattern?: string;
  prompt: string; // Промпт, который будет отправлен AI
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// Статус выполнения инструмента
export type ToolExecutionState = 
  | 'input-streaming'    // Параметры стримятся
  | 'input-available'    // Параметры получены, ожидание выполнения
  | 'approval-requested' // Требуется подтверждение пользователя
  | 'approval-responded' // Пользователь ответил
  | 'output-available'   // Результат получен
  | 'output-error'       // Ошибка выполнения
  | 'output-denied';     // Отклонено пользователем

// Информация о выполнении инструмента для отображения в UI
export interface ToolExecution {
  id: string;
  toolName: string;
  state: ToolExecutionState;
  input?: any;
  output?: any;
  error?: string;
  startTime: number;
  endTime?: number;
}

