import { Tool } from '@shared/types/tools';

export const summarizeTool: Tool = {
  id: 'summarize',
  name: 'Саммари страницы',
  description: 'Создает краткое содержание текущей страницы',
  icon: '📄',

  async execute(params: { tabId: number; operator: any }) {
    try {
      // Get page content
      const response = await chrome.tabs.sendMessage(params.tabId, {
        type: 'GET_PAGE_CONTEXT',
        data: { type: 'text' }
      });

      if (!response.success) {
        throw new Error('Failed to get page content');
      }

      const pageContent = response.data;

      // Return content to be processed by AI
      return {
        success: true,
        prompt: `Создай краткое саммари следующего контента страницы:\n\n${pageContent}`,
        requiresAI: true
      };
    } catch (error) {
      console.error('Error in summarize tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

