import { Tool } from '@shared/types/tools';
import { getTranslation } from '@shared/i18n/useTranslation';

export const summarizeTool: Tool = {
  id: 'summarize',
  name: 'Summary page',
  description: 'Gets the text content of the current page to create a short summary',
  nameKey: 'tool_summarize',
  descriptionKey: 'tool_summarize_desc',
  icon: '📄',
  command: '/summarize',
  urlPattern: undefined, // Works on all websites
  isBuiltIn: true,
  requiresPageContext: true, // Automatically includes page context
  systemInstructions: 'After calling this tool, you will receive an instruction. IMPORTANT: You MUST then create a comprehensive summary of the page based on the page context that was provided to you in the initial message. DO NOT just say you called the tool - actually generate the summary text.',
  
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },

  async execute(_params: { tabId: number }) {
    // Page context was already passed to AI through pageContext when the tool was called
    // This tool simply returns the instruction for AI
    return getTranslation('createPageSummary');
  }
};


