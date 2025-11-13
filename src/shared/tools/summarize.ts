import { Tool } from '@shared/types/tools';
import { getTranslation } from '@shared/i18n/useTranslation';

export const summarizeTool: Tool = {
  id: 'summarize',
  name: 'Саммари страницы',
  description: 'Получает текстовый контент текущей страницы для создания краткого содержания',
  nameKey: 'tool_summarize',
  descriptionKey: 'tool_summarize_desc',
  icon: '📄',
  command: '/summarize',
  urlPattern: undefined, // Работает на всех сайтах
  isBuiltIn: true,
  requiresPageContext: true, // Автоматически включает передачу контекста страницы
  
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },

  async execute(_params: { tabId: number }) {
    // Контекст страницы уже передан AI через pageContext при вызове инструмента
    // Этот инструмент просто возвращает инструкцию для AI
    return getTranslation('createPageSummary');
  }
};


