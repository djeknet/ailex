import { Tool } from '@shared/types/tools';
import { getTranslation } from '@shared/i18n/useTranslation';

export const findElementsTool: Tool = {
  id: 'find-elements',
  name: 'Find Elements',
  description: 'Automatically finds CSS selector for elements based on natural language description',
  nameKey: 'tool_findElements',
  descriptionKey: 'tool_findElements_desc',
  icon: '🔍',
  command: '/find',
  urlPattern: undefined,
  isBuiltIn: true,
  hiddenFromUI: true, // Скрыт из UI, используется только AI
  
  systemInstructions: 'Use this tool to automatically find CSS selectors when user describes elements in natural language. IMPORTANT: This tool is hidden from UI, only you can call it. Always call this before extracting data if selector is not provided. If a selector is not found or returns 0 matches, try alternative descriptions (e.g., for "product names" try "product titles", "h1 headings", "article names"). For links, always try "a[href]" as fallback. MAX 3 ATTEMPTS: If after 3 attempts no selector is found with matches > 0, stop trying and report that the page does not contain the requested elements.',
  
  parameters: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'Natural language description of elements to find (e.g., "article titles", "product prices", "author names")'
      },
      limit: {
        type: 'number',
        description: 'Number of example elements to return for verification (default: 3)'
      }
    },
    required: ['description']
  },
  
  async execute(params: { tabId: number; description: string; limit?: number }) {
    try {
      const { tabId, description, limit = 3 } = params;
      
      console.log('[find-elements] Execute called:', { tabId, description, limit });
      
      // Получить упрощенный HTML
      console.log('[find-elements] Getting simplified HTML from page');
      const htmlResponse = await chrome.tabs.sendMessage(tabId, {
        type: 'EXECUTE_DOM_FUNCTION',
        data: { functionName: 'getSimplifiedHTML' }
      });
      
      if (!htmlResponse.success) {
        console.error('[find-elements] Failed to get HTML:', htmlResponse);
        throw new Error('Failed to get simplified HTML');
      }
      
      const simplifiedHTML = htmlResponse.result;
      console.log('[find-elements] HTML length:', simplifiedHTML.length);
      
      // Получить meta-данные страницы для контекста
      console.log('[find-elements] Getting page metadata');
      const metaResponse = await chrome.tabs.sendMessage(tabId, {
        type: 'EXECUTE_DOM_FUNCTION',
        data: { functionName: 'getPageMetadata' }
      });
      
      const metadata = metaResponse.success ? metaResponse.result : {};
      console.log('[find-elements] Metadata:', metadata);
      
      // Получить URL страницы
      const urlResponse = await chrome.tabs.sendMessage(tabId, {
        type: 'EXECUTE_DOM_FUNCTION',
        data: { functionName: 'getCurrentUrl' }
      });
      
      const currentUrl = urlResponse.success ? urlResponse.result : '';
      console.log('[find-elements] Current URL:', currentUrl);
      
      // Создать промпт для AI
      const prompt = `Task: Find CSS selector for elements matching this description: "${description}"

Page URL: ${currentUrl}

Page metadata (use as hints):
- Title: ${metadata.title || 'N/A'}
- Meta description: ${metadata.description || 'N/A'}
- H1: ${metadata.h1 || 'N/A'}

HTML structure (first 5000 chars):
${simplifiedHTML}

Requirements:
- Return ONLY the CSS selector, no explanations
- Selector should be as specific as needed but not overly complex
- Test that it captures multiple similar elements
- Prefer class/id selectors over complex nested paths

Common patterns for typical data:
- Product/Article titles: h1, h2, .title, .product-title, [data-testid*="title"]
- Prices: .price, .amount, [class*="price"], span[data-price]
- Descriptions: .description, .product-description, p[class*="desc"]
- Images: img[src], picture img, [data-image]

Examples of good selectors:
- "h1.article-title"
- "div.product-card .price"
- "span[data-testid='author-name']"

CSS Selector:`;
      
      // Импортируем функции для работы с AI
      const { useChatStore } = await import('@shared/stores/chatStore');
      const { sendMessage } = await import('@shared/services/aiService');
      
      const { selectedOperator } = useChatStore.getState();
      
      if (!selectedOperator || !selectedOperator.selectedModel) {
        console.error('[find-elements] No AI operator selected');
        throw new Error('No AI operator selected');
      }
      
      console.log('[find-elements] Sending request to AI:', selectedOperator.operator);
      
      // Отправить запрос к AI
      const response = await sendMessage(
        [
          { role: 'system' as const, content: 'You are a CSS selector expert. Return only the selector without any explanations.' },
          { role: 'user' as const, content: prompt }
        ],
        selectedOperator
      );
      
      console.log('[find-elements] AI response:', response.content);
      
      // Извлечь селектор из ответа
      let selector = response.content.trim();
      
      // Очистить селектор от возможных кавычек и markdown
      selector = selector.replace(/```[a-z]*\n?/g, '').replace(/`/g, '').replace(/['"]/g, '').trim();
      
      console.log('[find-elements] Cleaned selector:', selector);
      
      // Протестировать селектор на странице
      console.log('[find-elements] Testing selector on page');
      const testResponse = await chrome.tabs.sendMessage(tabId, {
        type: 'EXECUTE_DOM_FUNCTION',
        data: {
          functionName: 'getElements',
          params: { selector, limit }
        }
      });
      
      if (!testResponse.success) {
        console.error('[find-elements] Selector test failed:', testResponse);
        throw new Error(`Selector test failed: ${selector}`);
      }
      
      const elements = testResponse.result || [];
      console.log('[find-elements] Selector matched elements:', elements.length);
      
      return {
        selector,
        matchCount: elements.length,
        examples: elements.map((el: any) => ({
          text: el.text,
          tagName: el.tagName
        })),
        message: getTranslation('selectorFound', [selector, elements.length.toString()])
      };
      
    } catch (error) {
      console.error('[find-elements] Error:', error);
      throw error;
    }
  }
};

