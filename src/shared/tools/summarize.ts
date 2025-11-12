import { Tool } from '@shared/types/tools';

export const summarizeTool: Tool = {
  id: 'summarize',
  name: 'Саммари страницы',
  description: 'Получает текстовый контент текущей страницы для создания краткого содержания',
  icon: '📄',
  command: '/summarize',
  urlPattern: undefined, // Работает на всех сайтах
  isBuiltIn: true,
  
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },

  async execute(params: { tabId: number }) {
    try {
      // Get page content using executeDOMFunction
      const { executeDOMFunction } = await import('@shared/services/toolExecutor');
      
      // Get text content from page - pass maxLength as a single parameter
      const pageText = await executeDOMFunction('getText', 10000, params.tabId);

      if (!pageText || pageText.trim().length === 0) {
        return 'Страница не содержит текстового контента или контент недоступен.';
      }

      // Return the page content - AI will create summary based on this
      return `Контент страницы для саммари:\n\n${pageText}`;
    } catch (error) {
      console.error('Error in summarize tool:', error);
      return `Ошибка при получении контента страницы: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};


