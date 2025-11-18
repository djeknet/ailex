import { Tool } from '@shared/types/tools';
import { getTranslation } from '@shared/i18n/useTranslation';

interface ParsingState {
  sessionId: string;
  visitedUrls: string[];
  collectedData: any[];
  maxPages: number;
  currentPage: number;
  dataSelector?: string; // Deprecated: use dataSelectors instead
  dataSelectors?: { [key: string]: string }; // Multiple selectors: { title: "h1", price: ".price" }
  dataDescription: string;
  startedAt: number;
  status: 'active' | 'paused' | 'completed';
  lastFoundLinks?: any[]; // Last result from get-links for filtering
  filteredLinks?: any[]; // Links after AI filtering
}

export const parsePagesTool: Tool = {
  id: 'parse-pages',
  name: 'Parse Multiple Pages',
  description: 'Cyclically parse data from multiple pages with automatic navigation',
  nameKey: 'tool_parsePages',
  descriptionKey: 'tool_parsePages_desc',
  icon: '🔄',
  command: '/parse',
  urlPattern: undefined,
  isBuiltIn: true,
  
  systemInstructions: `CRITICAL PARSING WORKFLOW - You MUST follow ALL steps in exact order:

1. FIRST, ask user these 3 questions if ANY is missing:
   - What data to parse? (e.g., article titles, product prices, product names and prices)
   - How many pages? (default: 10)
   - What format? (json/csv/text, default: json)

2. THEN execute COMPLETE parsing workflow (DO NOT SKIP ANY STEP):
   Step A: parse-pages(action=init, sessionId=session_xxx, maxPages=N, dataDescription=...)
   Step B: parse-pages(action=get-links, sessionId=session_xxx) - get all links from current page
   Step C: parse-pages(action=filter-links, sessionId=session_xxx, linkPattern=only product/article pages) - AI filters relevant links
   Step D: parse-pages(action=navigate, sessionId=session_xxx, url=first_filtered_link) - go to first page
   Step E: For EACH data type, call find-elements ON THE NAVIGATED PAGE:
           - If single type: find-elements(description=article titles) returns h1
           - If multiple types: find-elements for EACH (titles, prices, descriptions, etc.)
           - IMPORTANT: You MUST find selectors for ALL requested data types before proceeding
           - If find-elements returns 0 matches after 3 attempts, STOP and call action=finish with error message
           - This means you navigated to wrong page type or page structure is different
   Step F: Save selector(s):
           - Single: parse-pages(action=save-selector, sessionId=s1, dataSelector=h1)
           - Multiple: parse-pages(action=save-selectors, sessionId=s1, dataSelectors={name:h2.name, price:.price})
   Step G: parse-pages(action=extract-data, sessionId=session_xxx) - extract from current page
   Step H: For remaining filtered links (until maxPages reached):
           - parse-pages(action=navigate, sessionId=session_xxx, url=next_link)
           - parse-pages(action=extract-data, sessionId=session_xxx)
   Step I: parse-pages(action=finish, sessionId=session_xxx) - return ALL collected data in requested format

IMPORTANT RULES:
- You MUST use the SAME sessionId in ALL calls (generate once, e.g. session_ + timestamp)
- You MUST call extract-data on EVERY page (including first page before navigation)
- CRITICAL: ALWAYS call filter-links IMMEDIATELY after get-links - this is NOT optional!
- You MUST continue loop until maxPages reached or no more links
- After 20 iterations, system will pause - user must confirm to continue
- Return final data ONLY after action=finish
- For multiple data types, use save-selectors (plural) with object containing field mappings`,
  
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform',
        enum: ['init', 'save-selector', 'save-selectors', 'get-links', 'filter-links', 'extract-data', 'navigate', 'finish', 'resume']
      },
      sessionId: {
        type: 'string',
        description: 'Unique session ID for this parsing job (generate once in init)'
      },
      maxPages: {
        type: 'number',
        description: 'Maximum pages to parse (for init action)'
      },
      dataDescription: {
        type: 'string',
        description: 'Natural language description of data to collect (for init action)'
      },
      dataSelector: {
        type: 'string',
        description: 'CSS selector for data extraction (for single data type, use with save-selector action)'
      },
      dataSelectors: {
        type: 'object',
        description: 'Multiple CSS selectors for extracting different data types (use with save-selectors action). Example: {title: "h1", price: ".price", description: "p.desc"}'
      },
      linkPattern: {
        type: 'string',
        description: 'Optional pattern for pagination links (e.g., "page", "next") or context for AI filtering (e.g., "product pages only")'
      },
      url: {
        type: 'string',
        description: 'URL to navigate to (for navigate action)'
      }
    },
    required: ['action', 'sessionId']
  },
  
  async execute(params: {
    tabId: number;
    action: string;
    sessionId: string;
    maxPages?: number;
    dataDescription?: string;
    dataSelector?: string;
    dataSelectors?: { [key: string]: string };
    linkPattern?: string;
    url?: string;
  }) {
    const { tabId, action, sessionId } = params;
    
    console.log('[parse-pages] Execute called:', { action, sessionId, tabId, params });
    
    try {
      // Получить текущее состояние из storage
      const getState = async (): Promise<ParsingState | null> => {
        const result = await chrome.storage.local.get(`parsing_${sessionId}`);
        return result[`parsing_${sessionId}`] || null;
      };
      
      // Сохранить состояние в storage
      const saveState = async (state: ParsingState) => {
        await chrome.storage.local.set({ [`parsing_${sessionId}`]: state });
      };
      
      // Инициализация новой сессии парсинга
      if (action === 'init') {
        const { maxPages = 10, dataDescription } = params;
        
        console.log('[parse-pages] INIT:', { maxPages, dataDescription });
        
        if (!dataDescription) {
          throw new Error('dataDescription is required for init action');
        }
        
        // Получить текущий URL
        const currentUrlResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'EXECUTE_DOM_FUNCTION',
          data: { functionName: 'getCurrentUrl' }
        });
        
        const currentUrl = currentUrlResponse.result;
        console.log('[parse-pages] Current URL:', currentUrl);
        
        const state: ParsingState = {
          sessionId,
          visitedUrls: [currentUrl],
          collectedData: [],
          maxPages,
          currentPage: 0,
          dataDescription,
          startedAt: Date.now(),
          status: 'active'
        };
        
        await saveState(state);
        console.log('[parse-pages] State saved:', state);
        
        return {
          status: 'initialized',
          sessionId,
          maxPages,
          dataDescription,
          message: getTranslation('parsingInProgress')
        };
      }
      
      // Все остальные действия требуют существующего состояния
      const state = await getState();
      console.log('[parse-pages] State loaded:', state);
      
      if (!state) {
        console.error('[parse-pages] Session not found:', sessionId);
        throw new Error('Session not found. Call init first.');
      }
      
      // Проверка, не приостановлен ли парсинг
      if (state.status === 'paused' && action !== 'resume' && action !== 'finish') {
        console.log('[parse-pages] Parsing is paused');
        return {
          status: 'paused',
          message: getTranslation('parsingPaused'),
          currentPage: state.currentPage,
          maxPages: state.maxPages
        };
      }
      
      // Сохранить селектор (единичный)
      if (action === 'save-selector') {
        const { dataSelector } = params;
        
        console.log('[parse-pages] SAVE-SELECTOR:', { dataSelector });
        
        if (!dataSelector) {
          throw new Error('dataSelector is required for save-selector action');
        }
        
        state.dataSelector = dataSelector;
        state.dataSelectors = undefined; // Clear multiple selectors if any
        await saveState(state);
        console.log('[parse-pages] Selector saved in state');
        
        return {
          status: 'selector-saved',
          selector: dataSelector,
          message: `Selector saved: ${dataSelector}`
        };
      }
      
      // Сохранить несколько селекторов (множественные)
      if (action === 'save-selectors') {
        const { dataSelectors } = params;
        
        console.log('[parse-pages] SAVE-SELECTORS:', { dataSelectors });
        
        if (!dataSelectors || typeof dataSelectors !== 'object' || Object.keys(dataSelectors).length === 0) {
          throw new Error('dataSelectors object is required for save-selectors action');
        }
        
        state.dataSelectors = dataSelectors;
        state.dataSelector = undefined; // Clear single selector if any
        await saveState(state);
        console.log('[parse-pages] Multiple selectors saved in state');
        
        return {
          status: 'selectors-saved',
          selectors: dataSelectors,
          message: `Selectors saved: ${JSON.stringify(dataSelectors)}`
        };
      }
      
      // Получить ссылки для навигации
      if (action === 'get-links') {
        const { linkPattern } = params;
        
        console.log('[parse-pages] GET-LINKS:', { linkPattern });
        
        // Получить все ссылки со страницы
        const linksResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'EXECUTE_DOM_FUNCTION',
          data: {
            functionName: 'getLinks',
            params: {}
          }
        });
        
        if (!linksResponse.success) {
          console.error('[parse-pages] Failed to get links:', linksResponse);
          throw new Error('Failed to get links');
        }
        
        let links = linksResponse.result || [];
        console.log('[parse-pages] Total links found:', links.length);
        
        // Получить текущий URL для определения домена
        const currentUrlResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'EXECUTE_DOM_FUNCTION',
          data: { functionName: 'getCurrentUrl' }
        });
        const currentUrl = currentUrlResponse.result;
        const currentDomain = new URL(currentUrl).hostname;
        
        console.log('[parse-pages] Current domain:', currentDomain);
        
        // Фильтровать только HTTP/HTTPS ссылки (исключить mailto:, tel:, javascript: и т.д.)
        links = links.filter((link: any) => {
          const href = link.href || '';
          return href.startsWith('http://') || href.startsWith('https://');
        });
        console.log('[parse-pages] HTTP(S) links after protocol filter:', links.length);
        
        // Фильтровать только ссылки на тот же домен (исключить внешние ссылки)
        links = links.filter((link: any) => {
          try {
            const linkDomain = new URL(link.href).hostname;
            return linkDomain === currentDomain;
          } catch {
            return false; // Пропускаем невалидные URL
          }
        });
        console.log('[parse-pages] Same-domain links after domain filter:', links.length);
        
        // Фильтровать по паттерну, если указан
        if (linkPattern) {
          links = links.filter((link: any) =>
            link.href.includes(linkPattern) || link.text.toLowerCase().includes(linkPattern.toLowerCase())
          );
          console.log('[parse-pages] Links after pattern filter:', links.length);
        }
        
        // Конвертировать относительные URL в абсолютные (уже не нужно, т.к. getLinks возвращает абсолютные)
        links = links.map((link: any) => {
          try {
            const absoluteUrl = new URL(link.href, currentUrl).href;
            return { ...link, href: absoluteUrl };
          } catch {
            return link;
          }
        });
        
        // Фильтровать уже посещенные URL
        const unvisitedLinks = links.filter((link: any) =>
          !state.visitedUrls.includes(link.href)
        );
        
        console.log('[parse-pages] Unvisited links:', unvisitedLinks.length);
        console.log('[parse-pages] Already visited:', state.visitedUrls.length);
        
        // Сохранить ВСЕ непосещенные ссылки для AI-фильтрации
        state.lastFoundLinks = unvisitedLinks;
        
        // Рассчитать сколько страниц осталось
        const remaining = state.maxPages - state.currentPage;
        
        console.log('[parse-pages] Total unvisited links:', unvisitedLinks.length, 'remaining pages:', remaining);
        
        await saveState(state);
        
        // Вернуть ВСЕ ссылки для фильтрации AI (не обрезаем!)
        return {
          status: 'links-found',
          unvisitedLinks: unvisitedLinks, // Возвращаем ВСЕ ссылки
          totalVisited: state.visitedUrls.length,
          remaining,
          totalUnvisited: unvisitedLinks.length,
          message: `Found ${unvisitedLinks.length} links. IMPORTANT: You MUST call filter-links now with linkPattern to select only relevant pages (e.g., "only product pages", "only article pages"). Do NOT proceed to navigate without filtering!`
        };
      }
      
      // Фильтровать ссылки через AI
      if (action === 'filter-links') {
        const { linkPattern } = params;
        
        console.log('[parse-pages] FILTER-LINKS:', { linkPattern });
        
        if (!state.lastFoundLinks || state.lastFoundLinks.length === 0) {
          console.warn('[parse-pages] No links to filter. Call get-links first.');
          return {
            status: 'no-links-to-filter',
            filteredLinks: [],
            message: 'No links available. Call get-links first.'
          };
        }
        
        // Подготовить данные для AI
        const linksText = state.lastFoundLinks
          .slice(0, 50) // Лимит для токенов
          .map((link: any, idx: number) => `${idx + 1}. ${link.href}\n   Text: "${link.text}"`)
          .join('\n');
        
        const prompt = `Task: Filter links to select ONLY relevant pages for: "${linkPattern}"

Context: We are parsing "${state.dataDescription}" from multiple pages.

Links found:
${linksText}

Instructions:
- Return ONLY the numbers of relevant links (comma-separated)
- Exclude: account pages, navigation, footers, unrelated pages
- Include: pages matching the description "${linkPattern}"

Example: If links 2, 5, and 7 are relevant, return: 2,5,7

Relevant link numbers:`;
        
        // Импортируем функции для работы с AI
        const { useChatStore } = await import('@shared/stores/chatStore');
        const { sendMessage } = await import('@shared/services/aiService');
        
        const { selectedOperator } = useChatStore.getState();
        
        if (!selectedOperator || !selectedOperator.selectedModel) {
          console.error('[parse-pages] No AI operator selected');
          throw new Error('No AI operator selected for link filtering');
        }
        
        console.log('[parse-pages] Sending link filtering request to AI');
        
        // Отправить запрос к AI
        const response = await sendMessage(
          [
            { role: 'system' as const, content: 'You are a link filtering expert. Return ONLY numbers, nothing else.' },
            { role: 'user' as const, content: prompt }
          ],
          selectedOperator
        );
        
        console.log('[parse-pages] AI response for filtering:', response.content);
        
        // Парсим ответ AI (ожидаем числа через запятую: "2,5,7")
        const maxIndex = state.lastFoundLinks?.length || 0;
        const selectedIndices = response.content
          .trim()
          .split(/[,\s]+/)
          .map(n => parseInt(n.trim()))
          .filter(n => !isNaN(n) && n > 0 && n <= maxIndex);
        
        console.log('[parse-pages] Parsed selected indices:', selectedIndices);
        
        // Отфильтровать ссылки по выбранным индексам
        let filteredLinks = selectedIndices.map(idx => state.lastFoundLinks![idx - 1]).filter(Boolean);
        
        console.log('[parse-pages] Filtered links:', filteredLinks.length, 'from', state.lastFoundLinks!.length);
        
        // Обрезать по лимиту maxPages (только ПОСЛЕ фильтрации!)
        const remaining = state.maxPages - state.currentPage;
        if (filteredLinks.length > remaining) {
          console.log('[parse-pages] Limiting filtered links to remaining pages:', remaining);
          filteredLinks = filteredLinks.slice(0, remaining);
        }
        
        // Сохранить отфильтрованные ссылки
        state.filteredLinks = filteredLinks;
        await saveState(state);
        
        return {
          status: 'links-filtered',
          filteredLinks,
          totalBefore: state.lastFoundLinks.length,
          totalAfter: filteredLinks.length,
          message: `Filtered ${filteredLinks.length} relevant links from ${state.lastFoundLinks.length} total. Ready to navigate.`
        };
      }
      
      // Извлечь данные с текущей страницы
      if (action === 'extract-data') {
        console.log('[parse-pages] EXTRACT-DATA:', { 
          singleSelector: state.dataSelector,
          multipleSelectors: state.dataSelectors 
        });
        
        // Проверка: есть ли хотя бы один селектор
        if (!state.dataSelector && !state.dataSelectors) {
          console.error('[parse-pages] No selector(s) set!');
          throw new Error('No selectors set. Call save-selector or save-selectors first.');
        }
        
        let extractedData: any;
        let dataPoints = 0;
        
        // Если используются множественные селекторы
        if (state.dataSelectors) {
          console.log('[parse-pages] Extracting multiple data types:', Object.keys(state.dataSelectors));
          
          const multiData: { [key: string]: any[] } = {};
          
          // Извлекаем данные для каждого селектора
          for (const [fieldName, selector] of Object.entries(state.dataSelectors)) {
            const dataResponse = await chrome.tabs.sendMessage(tabId, {
              type: 'EXECUTE_DOM_FUNCTION',
              data: {
                functionName: 'getElements',
                params: { selector, limit: 100 }
              }
            });
            
            if (!dataResponse.success) {
              console.error(`[parse-pages] Failed to extract data for ${fieldName}:`, dataResponse);
              multiData[fieldName] = [];
            } else {
              multiData[fieldName] = dataResponse.result || [];
              dataPoints += multiData[fieldName].length;
              console.log(`[parse-pages] Extracted ${multiData[fieldName].length} elements for ${fieldName}`);
            }
          }
          
          extractedData = multiData;
          
        } else {
          // Единичный селектор (обратная совместимость)
          const dataResponse = await chrome.tabs.sendMessage(tabId, {
            type: 'EXECUTE_DOM_FUNCTION',
            data: {
              functionName: 'getElements',
              params: { selector: state.dataSelector, limit: 100 }
            }
          });
          
          if (!dataResponse.success) {
            console.error('[parse-pages] Failed to extract data:', dataResponse);
            throw new Error('Failed to extract data');
          }
          
          extractedData = dataResponse.result || [];
          dataPoints = extractedData.length;
          console.log('[parse-pages] Elements extracted:', dataPoints);
        }
        
        // Получить текущий URL
        const currentUrlResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'EXECUTE_DOM_FUNCTION',
          data: { functionName: 'getCurrentUrl' }
        });
        const currentUrl = currentUrlResponse.result;
        console.log('[parse-pages] Current URL:', currentUrl);
        
        // Добавить данные к коллекции
        state.collectedData.push({
          url: currentUrl,
          data: extractedData,
          timestamp: Date.now()
        });
        
        state.currentPage++;
        
        // Добавить URL к посещенным
        if (!state.visitedUrls.includes(currentUrl)) {
          state.visitedUrls.push(currentUrl);
        }
        
        await saveState(state);
        console.log('[parse-pages] State updated:', { 
          currentPage: state.currentPage, 
          maxPages: state.maxPages,
          totalCollected: state.collectedData.length 
        });
        
        return {
          status: 'data-extracted',
          currentPage: state.currentPage,
          maxPages: state.maxPages,
          dataPoints,
          message: getTranslation('parsingPageProgress', [
            state.currentPage.toString(),
            state.maxPages.toString()
          ])
        };
      }
      
      // Навигация на следующую страницу
      if (action === 'navigate') {
        const { url } = params;
        
        console.log('[parse-pages] NAVIGATE:', { url });
        
        if (!url) {
          console.error('[parse-pages] No URL provided for navigation');
          throw new Error('url is required for navigate action');
        }
        
        // Добавить URL к посещенным
        if (!state.visitedUrls.includes(url)) {
          state.visitedUrls.push(url);
        }
        
        await saveState(state);
        console.log('[parse-pages] URL added to visited, total visited:', state.visitedUrls.length);
        
        // Отправить команду на навигацию через background
        console.log('[parse-pages] Sending navigation command to background');
        await chrome.runtime.sendMessage({
          type: 'NAVIGATE_TAB',
          data: { tabId, url }
        });
        
        // Подождать загрузки страницы
        console.log('[parse-pages] Waiting for page load...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('[parse-pages] Navigation complete');
        
        return {
          status: 'navigated',
          url,
          currentPage: state.currentPage
        };
      }
      
      // Возобновить парсинг после паузы
      if (action === 'resume') {
        console.log('[parse-pages] RESUME');
        state.status = 'active';
        await saveState(state);
        
        return {
          status: 'resumed',
          currentPage: state.currentPage,
          maxPages: state.maxPages,
          message: 'Parsing resumed'
        };
      }
      
      // Завершить парсинг и вернуть все данные
      if (action === 'finish') {
        console.log('[parse-pages] FINISH');
        state.status = 'completed';
        await saveState(state);
        
        const totalDataPoints = state.collectedData.reduce(
          (sum, page) => sum + (page.data?.length || 0),
          0
        );
        
        console.log('[parse-pages] Parsing completed:', {
          totalPages: state.currentPage,
          totalDataPoints,
          collectedDataLength: state.collectedData.length
        });
        
        const result = {
          status: 'completed',
          sessionId,
          totalPages: state.currentPage,
          totalDataPoints,
          data: state.collectedData,
          message: getTranslation('parsingCompleted', [
            state.currentPage.toString(),
            totalDataPoints.toString()
          ])
        };
        
        // Очистить состояние из storage
        console.log('[parse-pages] Clearing state from storage');
        await chrome.storage.local.remove(`parsing_${sessionId}`);
        
        return result;
      }
      
      console.error('[parse-pages] Unknown action:', action);
      throw new Error(`Unknown action: ${action}`);
      
    } catch (error) {
      console.error('[parse-pages] Error:', error);
      throw error;
    }
  }
};

