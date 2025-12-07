import { Tool } from '@shared/types/tools';
import { getTranslation } from '@shared/i18n/useTranslation';
import { SPA_URL_PATTERNS } from '@shared/constants';

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
  parsingMode?: 'multi-page' | 'single-page'; // Режим парсинга
  clickableElements?: Array<{ 
    selector: string; 
    index: number; 
    text: string;
    xpath: string;
  }>;
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
           - System will auto-detect page type (SPA or multi-page) and return parsingMode
   Step B: parse-pages(action=get-links, sessionId=session_xxx)
           - For SPA: Returns clickable elements (status=clickable-elements-found)
           - For multi-page: Returns navigation links (status=links-found)
   Step C: parse-pages(action=filter-links, sessionId=session_xxx, linkPattern=only product/article pages)
           - AI filters relevant elements/links based on parsingMode
   Step D: Navigate to first item:
           - For SPA: parse-pages(action=click-and-extract, sessionId=xxx, selector=..., index=...)
           - For multi-page: parse-pages(action=navigate, sessionId=xxx, url=first_filtered_link)
   Step E: For EACH data type, call find-elements ON THE CURRENT PAGE:
           - If single type: find-elements(description=article titles) returns h1
           - If multiple types: find-elements for EACH (titles, prices, descriptions, etc.)
           - IMPORTANT: You MUST find selectors for ALL requested data types before proceeding
           - If find-elements returns 0 matches after 3 attempts, STOP and call action=finish with error message
           - This means you navigated to wrong page type or page structure is different
   Step F: Save selector(s):
           - Single: parse-pages(action=save-selector, sessionId=s1, dataSelector=h1)
           - Multiple: parse-pages(action=save-selectors, sessionId=s1, dataSelectors={name:h2.name, price:.price})
   Step G: Extract data from current page:
           - For SPA: Already extracted in Step D (click-and-extract does both click and extract)
           - For multi-page: parse-pages(action=extract-data, sessionId=session_xxx)
   Step H: For remaining filtered items (until maxPages reached):
           - For SPA: parse-pages(action=click-and-extract, sessionId=xxx, selector=..., index=...)
           - For multi-page: parse-pages(action=navigate, sessionId=xxx, url=next_link) + parse-pages(action=extract-data)
   Step I: parse-pages(action=finish, sessionId=session_xxx) - return ALL collected data in requested format

IMPORTANT RULES:
- You MUST use the SAME sessionId in ALL calls (generate once, e.g. session_ + timestamp)
- Check parsingMode from init response to determine workflow (SPA vs multi-page)
- For SPA: Use click-and-extract instead of navigate+extract-data
- For multi-page: Use navigate + extract-data separately
- CRITICAL: ALWAYS call filter-links IMMEDIATELY after get-links - this is NOT optional!
- You MUST continue loop until maxPages reached or no more items
- After 20 iterations, system will pause - user must confirm to continue
- Return final data ONLY after action=finish
- For multiple data types, use save-selectors (plural) with object containing field mappings`,
  
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform',
        enum: ['init', 'save-selector', 'save-selectors', 'get-links', 'filter-links', 'extract-data', 'navigate', 'click-and-extract', 'finish', 'resume']
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
      },
      selector: {
        type: 'string',
        description: 'CSS selector for clickable element (for click-and-extract action)'
      },
      index: {
        type: 'number',
        description: 'Index of element in selector results (for click-and-extract action)'
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
    selector?: string;
    index?: number;
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
        
        // ШАГ 1: Автоопределение типа страницы
        const pageType = await detectPageType(tabId, currentUrl);
        console.log('[parse-pages] Detected page type:', pageType);
        
        const state: ParsingState = {
          sessionId,
          visitedUrls: [currentUrl],
          collectedData: [],
          maxPages,
          currentPage: 0,
          dataDescription,
          startedAt: Date.now(),
          status: 'active',
          parsingMode: pageType
        };
        
        await saveState(state);
        console.log('[parse-pages] State saved:', state);
        
        return {
          status: 'initialized',
          sessionId,
          maxPages,
          dataDescription,
          parsingMode: pageType,
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
        
        console.log('[parse-pages] GET-LINKS:', { linkPattern, parsingMode: state.parsingMode });
        
        // ШАГ 2: Если SPA - ищем кликабельные элементы
        if (state.parsingMode === 'single-page') {
          const clickableResponse = await chrome.tabs.sendMessage(tabId, {
            type: 'EXECUTE_DOM_FUNCTION',
            data: {
              functionName: 'getClickableElements',
              params: { 
                dataDescription: state.dataDescription,
                limit: state.maxPages * 3 // Больше для фильтрации
              }
            }
          });
          
          if (clickableResponse.success && clickableResponse.result?.length > 0) {
            // Преобразуем в формат "ссылок" для единообразия
            const clickableAsLinks = clickableResponse.result.map((el: any) => ({
              href: `clickable://${el.selector}/${el.index}`, // Псевдо-URL для кликабельных
              text: el.text,
              selector: el.selector,
              index: el.index,
              xpath: el.xpath,
              isClickable: true
            }));
            
            state.lastFoundLinks = clickableAsLinks;
            state.clickableElements = clickableResponse.result;
            
            await saveState(state);
            
            return {
              status: 'clickable-elements-found',
              unvisitedLinks: clickableAsLinks,
              parsingMode: 'single-page',
              totalUnvisited: clickableAsLinks.length,
              message: `Found ${clickableAsLinks.length} clickable elements. Use filter-links to select relevant ones, then use click-and-extract instead of navigate.`
            };
          }
        }
        
        // Получить все ссылки со страницы (для multi-page режима)
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
        
        // Универсальный анализ повторяющихся паттернов
        const selectorFrequency = new Map<string, number>();
        state.lastFoundLinks.forEach((link: any) => {
          const sel = link.selector || 'unknown';
          selectorFrequency.set(sel, (selectorFrequency.get(sel) || 0) + 1);
        });

        // Найти селекторы, которые повторяются много раз (вероятно списки элементов)
        const repeatedSelectors = Array.from(selectorFrequency.entries())
          .filter(([_, count]) => count >= 3) // Минимум 3 повторения
          .sort((a, b) => b[1] - a[1]) // Сортировка по частоте
          .slice(0, 5) // Топ-5 самых частых
          .map(([selector]) => selector);

        // Приоритизировать элементы с повторяющимися селекторами и текстом
        const prioritizedLinks = state.lastFoundLinks.sort((a: any, b: any) => {
          const aRepeated = repeatedSelectors.includes(a.selector);
          const bRepeated = repeatedSelectors.includes(b.selector);
          if (aRepeated && !bRepeated) return -1;
          if (!aRepeated && bRepeated) return 1;
          
          // Также приоритизировать элементы с текстом
          const aHasText = a.text && a.text.trim().length > 10;
          const bHasText = b.text && b.text.trim().length > 10;
          if (aHasText && !bHasText) return -1;
          if (!aHasText && bHasText) return 1;
          
          return 0;
        });

        // Подготовить данные для AI с приоритетом
        const linksText = prioritizedLinks
          .slice(0, 100) // Увеличить лимит для лучшего анализа
          .map((link: any) => {
            const originalIdx = (state.lastFoundLinks?.indexOf(link) ?? -1) + 1;
            const frequency = selectorFrequency.get(link.selector || '') || 0;
            const isRepeated = repeatedSelectors.includes(link.selector);
            return `${originalIdx}. ${link.href}\n   Text: "${link.text}"\n   Selector: ${link.selector}${isRepeated ? ` (repeats ${frequency}x - likely list items)` : ''}`;
          })
          .join('\n');

        // Статистика по повторяющимся селекторам
        const statsText = repeatedSelectors.length > 0 
          ? `\n\nSTATISTICS - Most common selectors (likely list items):\n${repeatedSelectors.map((sel, i) => `${i + 1}. ${sel} (${selectorFrequency.get(sel)} occurrences)`).join('\n')}\n\nKEY INSIGHT: Elements with repeating selectors are usually list items (emails, posts, articles) that should be selected.`
          : '';
        
        // Получить текущий URL для контекста
        const currentUrlResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'EXECUTE_DOM_FUNCTION',
          data: { functionName: 'getCurrentUrl' }
        });
        const currentUrl = currentUrlResponse.result;
        
        const isSPA = state.parsingMode === 'single-page';
        
        const prompt = `Task: Filter ${isSPA ? 'clickable elements' : 'links'} for parsing: "${linkPattern}"

Context: 
- Current page: ${currentUrl}
- Parsing mode: ${isSPA ? 'Single-Page Application (SPA)' : 'Multi-page navigation'}
- Data to extract: "${state.dataDescription}"
- Task description: "${state.dataDescription}"

${isSPA 
  ? `IMPORTANT: This is a SPA (like Gmail, Facebook feed, Twitter, LinkedIn). 
     Elements are clickable (onclick handlers, role="button"), NOT navigation links.
     Select elements that open individual items (emails, posts, messages, articles) when clicked.
     
     KEY INSIGHT: Look for REPEATING PATTERNS - if multiple elements share the same selector/class
     and contain similar content structure, they are likely list items (emails, posts, etc.).
     Elements that repeat many times with the same selector are usually the target items.
     
     Format: clickable://selector/index`
  : `These are navigation links. Select only links to pages containing the target data.`
}

${isSPA ? 'Clickable elements' : 'Links'} found:
${linksText}${statsText}

Instructions:
- Return ONLY numbers of relevant ${isSPA ? 'elements' : 'links'} (comma-separated)
- ${isSPA 
    ? `For SPA: Select clickable elements that open individual content items matching "${state.dataDescription}".
       PRIORITIZE elements with REPEATING SELECTORS (same selector appears multiple times) - these are usually list items.
       Look for elements that:
       1. Share the same CSS selector/class (repeating pattern) - see STATISTICS above
       2. Contain text content related to "${state.dataDescription}"
       3. Are likely to open individual items when clicked (not navigation buttons)
       4. Appear multiple times in the list (check STATISTICS section)`
    : 'For multi-page: Select links to pages with target data'}
- Exclude: navigation menus, footers, headers, account pages, single-use buttons (like "Написать", "Search", "Compose"), unrelated items
- Include: Elements that repeat with same selector AND contain content matching the task

Example: If ${isSPA ? 'elements' : 'links'} 2, 5, and 7 are relevant, return: 2,5,7

Relevant ${isSPA ? 'element' : 'link'} numbers:`;
        
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
      
      // Клик по элементу и извлечение данных (для SPA)
      if (action === 'click-and-extract') {
        const { selector, index } = params;
        
        console.log('[parse-pages] CLICK-AND-EXTRACT:', { selector, index });
        
        if (!selector || index === undefined) {
          throw new Error('selector and index required for click-and-extract action');
        }
        
        // Кликаем по элементу
        const clickResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'EXECUTE_DOM_FUNCTION',
          data: {
            functionName: 'clickElement',
            params: { selector, index }
          }
        });
        
        if (!clickResponse.success) {
          throw new Error('Failed to click element');
        }
        
        // Ждем загрузки контента (для Gmail это открытие письма)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Используем существующую логику extract-data
        console.log('[parse-pages] EXTRACT-DATA after click:', { 
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
          for (const [fieldName, sel] of Object.entries(state.dataSelectors)) {
            const dataResponse = await chrome.tabs.sendMessage(tabId, {
              type: 'EXECUTE_DOM_FUNCTION',
              data: {
                functionName: 'getElements',
                params: { selector: sel, limit: 100 }
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
          timestamp: Date.now(),
          clickedElement: { selector, index }
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
          status: 'clicked-and-extracted',
          currentPage: state.currentPage,
          maxPages: state.maxPages,
          dataPoints,
          message: getTranslation('parsingPageProgress', [
            state.currentPage.toString(),
            state.maxPages.toString()
          ])
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

// Вспомогательная функция автоопределения типа страницы (Решение 5)
async function detectPageType(tabId: number, url: string): Promise<'single-page' | 'multi-page'> {
  // Известные SPA
  if (SPA_URL_PATTERNS.some(pattern => pattern.test(url))) {
    return 'single-page';
  }
  
  // Проверяем соотношение кликабельных элементов к ссылкам
  try {
    const linksResponse = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_DOM_FUNCTION',
      data: { functionName: 'getLinks', params: {} }
    });
    
    const clickableResponse = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_DOM_FUNCTION',
      data: { 
        functionName: 'getClickableElements', 
        params: { dataDescription: '', limit: 20 } 
      }
    });
    
    const linksCount = linksResponse.result?.length || 0;
    const clickableCount = clickableResponse.result?.length || 0;
    
    // Если кликабельных элементов в 3+ раза больше - вероятно SPA
    if (clickableCount > 0 && clickableCount >= linksCount * 3) {
      return 'single-page';
    }
  } catch (e) {
    console.warn('[detectPageType] Error:', e);
  }
  
  return 'multi-page';
}

