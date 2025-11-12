import { Tool, ToolDefinition, CustomTool } from '@shared/types/tools';
import { toolRegistry } from '@shared/tools';
import * as dbService from '@/background/services/dbService';

/**
 * Получить все доступные инструменты (встроенные + пользовательские)
 */
export async function getAllAvailableTools(currentUrl?: string): Promise<Tool[]> {
  const builtInTools = Object.values(toolRegistry);
  const customTools = await dbService.getEnabledCustomTools();
  
  // Конвертируем пользовательские инструменты в формат Tool
  const customToolsAsTools: Tool[] = customTools.map(ct => customToolToTool(ct));
  
  const allTools = [...builtInTools, ...customToolsAsTools];
  
  // Фильтруем по URL паттерну если указан
  if (currentUrl) {
    return allTools.filter(tool => matchesUrlPattern(tool, currentUrl));
  }
  
  return allTools;
}

/**
 * Получить только встроенные инструменты
 */
export function getBuiltInTools(): Tool[] {
  return Object.values(toolRegistry);
}

/**
 * Получить инструмент по ID
 */
export async function getToolById(id: string): Promise<Tool | null> {
  // Проверяем встроенные
  const builtInTool = toolRegistry[id];
  if (builtInTool) {
    return builtInTool;
  }
  
  // Проверяем пользовательские
  const customTool = await dbService.getCustomTool(id);
  if (customTool) {
    return customToolToTool(customTool);
  }
  
  return null;
}

/**
 * Получить инструмент по команде
 */
export async function getToolByCommand(command: string): Promise<Tool | null> {
  const allTools = await getAllAvailableTools();
  return allTools.find(tool => tool.command === command) || null;
}

/**
 * Фильтрация инструментов по URL паттерну
 */
export function filterToolsByUrl(tools: Tool[], url: string): Tool[] {
  return tools.filter(tool => matchesUrlPattern(tool, url));
}

/**
 * Проверка соответствия инструмента URL паттерну
 */
function matchesUrlPattern(tool: Tool, url: string): boolean {
  // Если паттерн не указан, инструмент работает везде
  if (!tool.urlPattern) {
    return true;
  }
  
  // Точное совпадение начала URL
  return url.startsWith(tool.urlPattern);
}

/**
 * Конвертация Tool в ToolDefinition для AI провайдеров
 */
export function toolToDefinition(tool: Tool): ToolDefinition {
  return {
    type: 'function',
    function: {
      name: tool.id,
      description: tool.description,
      parameters: tool.parameters || {
        type: 'object',
        properties: {},
        required: []
      }
    }
  };
}

/**
 * Конвертация массива инструментов в ToolDefinitions
 */
export function toolsToDefinitions(tools: Tool[]): ToolDefinition[] {
  return tools.map(tool => toolToDefinition(tool));
}

/**
 * Конвертация CustomTool в Tool
 */
function customToolToTool(customTool: CustomTool): Tool {
  return {
    id: customTool.id,
    name: customTool.name,
    description: customTool.description,
    icon: customTool.icon,
    command: customTool.command,
    urlPattern: customTool.urlPattern,
    isBuiltIn: false,
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    
    async execute(params: any) {
      // Для пользовательских инструментов возвращаем промпт для AI
      return {
        success: true,
        prompt: customTool.prompt,
        requiresAI: true
      };
    }
  };
}

/**
 * Создание нового пользовательского инструмента
 */
export async function createCustomTool(tool: Omit<CustomTool, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomTool> {
  const newTool: CustomTool = {
    ...tool,
    id: `custom_${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await dbService.saveCustomTool(newTool);
  return newTool;
}

/**
 * Обновление пользовательского инструмента
 */
export async function updateCustomTool(id: string, updates: Partial<CustomTool>): Promise<void> {
  await dbService.updateCustomTool(id, updates);
}

/**
 * Удаление пользовательского инструмента
 */
export async function deleteCustomTool(id: string): Promise<void> {
  await dbService.deleteCustomTool(id);
}

/**
 * Получить все пользовательские инструменты
 */
export async function getCustomTools(): Promise<CustomTool[]> {
  return await dbService.getAllCustomTools();
}

/**
 * Валидация команды инструмента (должна начинаться с /)
 */
export function validateCommand(command: string): boolean {
  return command.startsWith('/') && command.length > 1 && /^\/[a-z0-9-]+$/.test(command);
}

/**
 * Проверка уникальности команды
 */
export async function isCommandUnique(command: string, excludeId?: string): Promise<boolean> {
  const allTools = await getAllAvailableTools();
  const existingTool = allTools.find(t => t.command === command && t.id !== excludeId);
  return !existingTool;
}

