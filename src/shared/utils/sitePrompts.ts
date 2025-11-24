import { SitePromptsConfig, SiteConfig, DetectedPage } from '@shared/types/sitePrompts';

// Кеш для загруженной конфигурации
let cachedConfig: SitePromptsConfig | null = null;

/**
 * Загружает конфигурацию site prompts из JSON файла
 */
export async function loadSitePromptsConfig(): Promise<SitePromptsConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const url = chrome.runtime.getURL('site-prompts.json');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load site-prompts.json: ${response.statusText}`);
    }
    
    cachedConfig = await response.json();
    console.log('[sitePrompts] Loaded configuration:', Object.keys(cachedConfig || {}).length, 'sites');
    
    return cachedConfig;
  } catch (error) {
    console.error('[sitePrompts] Error loading configuration:', error);
    return {};
  }
}

/**
 * Извлекает домен из URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error('[sitePrompts] Invalid URL:', url);
    return null;
  }
}

/**
 * Находит конфигурацию сайта по домену
 * Поддерживает точное совпадение и совпадение по части домена
 */
export function findSiteConfig(domain: string, config: SitePromptsConfig): [string, SiteConfig] | null {
  // Точное совпадение
  if (config[domain]) {
    return [domain, config[domain]];
  }
  
  // Поиск по части домена (например, "www.youtube.com" -> "youtube.com")
  const domainParts = domain.split('.');
  
  // Проверяем различные варианты
  for (let i = 0; i < domainParts.length - 1; i++) {
    const testDomain = domainParts.slice(i).join('.');
    if (config[testDomain]) {
      return [testDomain, config[testDomain]];
    }
  }
  
  return null;
}

/**
 * Определяет тип страницы по селекторам
 * Отправляет запрос в content script для проверки наличия элементов
 */
export async function detectPageType(
  tabId: number,
  pageTypes: Record<string, { selectors: string[] }>
): Promise<string | null> {
  try {
    // Отправляем запрос в content script для проверки селекторов
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'DETECT_PAGE_TYPE',
      data: { pageTypes }
    });
    
    if (response?.success && response.pageType) {
      console.log('[sitePrompts] Detected page type:', response.pageType);
      return response.pageType;
    }
    
    // Если селекторы не найдены, возвращаем null (не показываем промпты)
    console.log('[sitePrompts] No matching selectors found on page');
    return null;
  } catch (error) {
    console.warn('[sitePrompts] Error detecting page type:', error);
    // Не используем fallback - если не можем проверить, не показываем промпты
    return null;
  }
}

/**
 * Получает промпты для текущей страницы
 */
export async function getPromptsForUrl(url: string, tabId?: number): Promise<DetectedPage | null> {
  const domain = extractDomain(url);
  if (!domain) {
    return null;
  }
  
  const config = await loadSitePromptsConfig();
  const siteConfigMatch = findSiteConfig(domain, config);
  
  if (!siteConfigMatch) {
    console.log('[sitePrompts] No configuration found for domain:', domain);
    
    // Проверяем default конфигурацию
    if (config.default) {
      const defaultConfig = config.default;
      const defaultPageType = 'any';
      
      if (defaultConfig.pageTypes && defaultConfig.pageTypes[defaultPageType]) {
        return {
          domain: 'default',
          pageType: defaultPageType,
          prompts: defaultConfig.pageTypes[defaultPageType].prompts,
          category: defaultConfig.category
        };
      }
    }
    
    return null;
  }
  
  const [matchedDomain, siteConfig] = siteConfigMatch;
  
  // Определяем тип страницы
  let pageType: string | null = null;
  
  if (tabId) {
    pageType = await detectPageType(tabId, siteConfig.pageTypes);
  }
  
  // Если не удалось определить тип (селекторы не найдены), не показываем промпты
  if (!pageType) {
    console.log('[sitePrompts] Could not determine page type for domain:', matchedDomain);
    return null;
  }
  
  if (!siteConfig.pageTypes[pageType]) {
    console.log('[sitePrompts] Page type configuration not found:', pageType);
    return null;
  }
  
  const pageConfig = siteConfig.pageTypes[pageType];
  
  return {
    domain: matchedDomain,
    pageType,
    prompts: pageConfig.prompts,
    category: siteConfig.category
  };
}

/**
 * Сбрасывает кеш конфигурации (полезно для тестирования)
 */
export function clearCache(): void {
  cachedConfig = null;
}

