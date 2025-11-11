import { Tool, ToolRegistry } from '@shared/types/tools';
import { summarizeTool } from './summarize';
import { collectContactsTool } from './collectContacts';
import { fillFormTool } from './fillForm';

export const toolRegistry: ToolRegistry = {
  [summarizeTool.id]: summarizeTool,
  [collectContactsTool.id]: collectContactsTool,
  [fillFormTool.id]: fillFormTool
};

export function getTool(id: string): Tool | undefined {
  return toolRegistry[id];
}

export function getAllTools(): Tool[] {
  return Object.values(toolRegistry);
}

// Get tools descriptions for AI
export function getToolsDescriptions(): string {
  const tools = getAllTools();
  
  return tools.map(tool => {
    let desc = `- ${tool.name}: ${tool.description}`;
    if (tool.requiresPersonalInfo) {
      desc += ' (требуется личная информация)';
    }
    return desc;
  }).join('\n');
}

// Execute tool
export async function executeTool(toolId: string, params: any): Promise<any> {
  const tool = getTool(toolId);
  
  if (!tool) {
    throw new Error(`Tool not found: ${toolId}`);
  }

  return await tool.execute(params);
}

