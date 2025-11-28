import { SitePrompt, SitePromptsConfig } from '@shared/types/sitePrompts';

// Cache for configuration
let cachedConfig: SitePromptsConfig | null = null;
let cachedTranslations: Record<string, string> = {};
let cachedLanguage: string | null = null;

// Load configuration from background
async function loadConfig(): Promise<SitePromptsConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SITE_PROMPTS_CONFIG'
    });

    if (response?.success && response.config) {
      cachedConfig = response.config;
      return response.config;
    }

    return {};
  } catch (error) {
    console.error('[siteWidget] Error loading config:', error);
    return {};
  }
}

// Load translations from extension settings
async function loadTranslations(): Promise<void> {
  try {
    // Get language from settings
    const result = await chrome.storage.sync.get('language');
    const language = result.language || 'en';
    
    // If language hasn't changed and we have translations, skip
    if (cachedLanguage === language && Object.keys(cachedTranslations).length > 0) {
      return;
    }
    
    cachedLanguage = language;
    
    // Load translation file
    const url = chrome.runtime.getURL(`_locales/${language}/messages.json`);
    const response = await fetch(url);
    const messages = await response.json();
    
    // Convert to simple key-value format
    cachedTranslations = {};
    for (const [key, value] of Object.entries(messages)) {
      cachedTranslations[key] = (value as any).message || key;
    }
    
    console.log('[siteWidget] Loaded translations for language:', language);
  } catch (error) {
    console.error('[siteWidget] Error loading translations:', error);
    // Fallback to chrome.i18n
    cachedTranslations = {};
  }
}

// Get translated text
function t(key: string, fallback?: string): string {
  return cachedTranslations[key] || fallback || chrome.i18n.getMessage(key) || key;
}

// Extract domain from URL
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return null;
  }
}

// Find site config by domain
function findSiteConfig(domain: string, config: SitePromptsConfig): [string, any] | null {
  // Exact match
  if (config[domain]) {
    return [domain, config[domain]];
  }
  
  // Partial match (e.g., "www.youtube.com" -> "youtube.com")
  const domainParts = domain.split('.');
  for (let i = 0; i < domainParts.length - 1; i++) {
    const testDomain = domainParts.slice(i).join('.');
    if (config[testDomain]) {
      return [testDomain, config[testDomain]];
    }
  }
  
  return null;
}

// Detect page type by checking selectors
function detectPageType(pageTypes: Record<string, { selectors: string[] }>): string | null {
  for (const [typeName, typeConfig] of Object.entries(pageTypes)) {
    const selectors = typeConfig.selectors || [];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          console.log('[siteWidget] Detected page type:', typeName, 'via selector:', selector);
          return typeName;
        }
      } catch (error) {
        console.warn('[siteWidget] Invalid selector:', selector);
      }
    }
  }
  
  return null;
}

// Get prompts for current page
async function getPromptsForPage(): Promise<{ prompts: SitePrompt[], domain: string, pageType: string } | null> {
  const url = window.location.href;
  const domain = extractDomain(url);
  
  if (!domain) {
    return null;
  }
  
  const config = await loadConfig();
  const siteConfigMatch = findSiteConfig(domain, config);
  
  if (!siteConfigMatch) {
    console.log('[siteWidget] No configuration for domain:', domain);
    return null;
  }
  
  const [matchedDomain, siteConfig] = siteConfigMatch;
  const pageType = detectPageType(siteConfig.pageTypes);
  
  if (!pageType) {
    console.log('[siteWidget] No page type detected for:', matchedDomain);
    return null;
  }
  
  const pageConfig = siteConfig.pageTypes[pageType];
  
  if (!pageConfig || !pageConfig.prompts) {
    return null;
  }
  
  return {
    prompts: pageConfig.prompts,
    domain: matchedDomain,
    pageType
  };
}

// Inject widget styles
function injectStyles() {
  if (document.getElementById('ailex-widget-styles')) {
    return; // Already injected
  }

  const link = document.createElement('link');
  link.id = 'ailex-widget-styles';
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('src/content/siteWidget.css');
  document.head.appendChild(link);
}

// Get site favicon
function getSiteFavicon(): string | null {
  const favicon = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
  if (favicon?.href) {
    return favicon.href;
  }
  
  // Fallback to default favicon location
  const url = new URL(window.location.href);
  return `${url.protocol}//${url.host}/favicon.ico`;
}

// Create widget HTML
function createWidget(prompts: SitePrompt[], favicon: string | null): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ailex-site-widget';
  container.id = 'ailex-site-widget';

  // Widget icon
  const iconUrl = chrome.runtime.getURL('icons/icon-48.png');
  
  container.innerHTML = `
    <div class="ailex-widget-icon" id="ailex-widget-toggle">
      <img src="${iconUrl}" alt="AiLex" />
    </div>
  `;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.id = 'ailex-widget-close-btn';
  closeBtn.className = 'ailex-widget-close-btn';
  closeBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  `;

  // Prompts panel
  const panel = document.createElement('div');
  panel.className = 'ailex-prompts-panel';
  panel.id = 'ailex-prompts-panel';

  // Get localized messages using extension settings language
  const titleText = t('sitePromptsSectionTitle', 'You might be interested in:');
  
  panel.innerHTML = `
    <div class="ailex-prompts-panel-header">
      <div class="ailex-prompts-panel-title">
        ${favicon ? `<img src="${favicon}" class="ailex-prompt-favicon" alt="Site icon" />` : ''}
        <span>${titleText}</span>
      </div>
      <button class="ailex-prompts-panel-close" id="ailex-panel-close">×</button>
    </div>
    <div class="ailex-prompts-list" id="ailex-prompts-list"></div>
  `;

  // Add prompts
  const list = panel.querySelector('#ailex-prompts-list')!;
  prompts.forEach((prompt, index) => {
    const item = document.createElement('div');
    item.className = 'ailex-prompt-item';
    item.dataset.promptIndex = String(index);
    
    // Get localized text using extension settings language
    const promptText = prompt.textKey 
      ? t(prompt.textKey, prompt.text)
      : prompt.text;
    
    item.innerHTML = `
      ${favicon ? `<img src="${favicon}" class="ailex-prompt-favicon" alt="Site icon" onerror="this.style.display='none'" />` : ''}
      <div class="ailex-prompt-text">${promptText}</div>
    `;
    
    list.appendChild(item);
  });

  document.body.appendChild(container);
  document.body.appendChild(closeBtn);
  document.body.appendChild(panel);

  return container;
}

// Initialize widget
export async function initSiteWidget() {
  try {
    console.log('[siteWidget] Initializing widget...');
    
    // Check if widget already exists
    if (document.getElementById('ailex-site-widget')) {
      console.log('[siteWidget] Widget already exists');
      return;
    }

    // Load translations first
    await loadTranslations();

    // Get prompts for current page
    const result = await getPromptsForPage();
    
    if (!result) {
      console.log('[siteWidget] No prompts available for this page');
      return;
    }

    const { prompts, domain, pageType } = result;
    console.log('[siteWidget] Found', prompts.length, 'prompts for', domain, '/', pageType);

    // Inject styles
    injectStyles();

    // Get favicon
    const favicon = getSiteFavicon();

    // Create widget
    createWidget(prompts, favicon);

    // Setup event listeners
    setupEventListeners(prompts);

    console.log('[siteWidget] Widget initialized successfully');
  } catch (error) {
    console.error('[siteWidget] Error initializing widget:', error);
  }
}


// Setup event listeners
function setupEventListeners(prompts: SitePrompt[]) {
  const widget = document.getElementById('ailex-site-widget');
  const toggle = document.getElementById('ailex-widget-toggle');
  const panel = document.getElementById('ailex-prompts-panel');
  const closeBtn = document.getElementById('ailex-panel-close');
  const list = document.getElementById('ailex-prompts-list');
  const widgetCloseBtn = document.getElementById('ailex-widget-close-btn');

  if (!widget || !toggle || !panel || !closeBtn || !list || !widgetCloseBtn) {
    return;
  }

  let hideTimeout: number | null = null;

  // Show widget and close button on hover
  const showWidget = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    widget.classList.add('active');
    widgetCloseBtn.classList.add('visible');
  };

  // Hide widget with delay
  const hideWidget = () => {
    hideTimeout = window.setTimeout(() => {
      widget.classList.remove('active');
      widgetCloseBtn.classList.remove('visible');
      panel.classList.remove('active');
    }, 500); // 500ms задержка
  };

  // Widget hover events
  widget.addEventListener('mouseenter', showWidget);
  widget.addEventListener('mouseleave', hideWidget);

  // Close button hover events
  widgetCloseBtn.addEventListener('mouseenter', showWidget);
  widgetCloseBtn.addEventListener('mouseleave', hideWidget);

  // Panel hover events
  panel.addEventListener('mouseenter', showWidget);
  panel.addEventListener('mouseleave', hideWidget);

  // Toggle panel
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('active');
  });

  // Close panel button
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.remove('active');
  });

  // Close widget permanently
  widgetCloseBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    console.log('[siteWidget] Closing widget permanently...');
    
    try {
      // Disable widget in settings
      await chrome.storage.sync.set({ showSiteWidget: false });
      console.log('[siteWidget] Widget disabled in settings');
      
      // Remove widget from DOM
      removeSiteWidget();
      widgetCloseBtn.remove();
    } catch (error) {
      console.error('[siteWidget] Error disabling widget:', error);
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!panel.contains(target) && !toggle.contains(target)) {
      panel.classList.remove('active');
    }
  });

  // Handle prompt clicks
  list.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const item = target.closest('.ailex-prompt-item') as HTMLElement;
    
    if (!item) return;

    const index = parseInt(item.dataset.promptIndex || '0', 10);
    const prompt = prompts[index];

    if (!prompt) return;

    console.log('[siteWidget] Prompt clicked:', prompt);

    // Close panel
    panel.classList.remove('active');

    // Open fullscreen with prompt data
    try {
      console.log('[siteWidget] Opening fullscreen with prompt...');
      
      // Get current tab ID through background
      const tabIdResponse = await chrome.runtime.sendMessage({
        type: 'GET_CURRENT_TAB_ID'
      });
      
      const sourceTabId = tabIdResponse?.tabId;
      
      if (!sourceTabId) {
        console.error('[siteWidget] Could not get current tab ID');
        return;
      }
      
      console.log('[siteWidget] Current tab ID:', sourceTabId);
      
      // Save prompt data to storage with source tab ID
      await chrome.storage.local.set({
        pendingSitePrompt: {
          prompt,
          currentUrl: window.location.href,
          sourceTabId, // ID вкладки откуда был клик
          timestamp: Date.now()
        }
      });
      
      // Open fullscreen page
      const fullscreenUrl = chrome.runtime.getURL('src/ui/fullscreen/index.html');
      await chrome.runtime.sendMessage({
        type: 'OPEN_FULLSCREEN_WITH_PROMPT',
        data: { url: fullscreenUrl }
      });
      
      console.log('[siteWidget] Fullscreen opened successfully');
    } catch (error) {
      console.error('[siteWidget] Error opening fullscreen:', error);
    }
  });
}

// Remove widget
export function removeSiteWidget() {
  const widget = document.getElementById('ailex-site-widget');
  const panel = document.getElementById('ailex-prompts-panel');
  
  if (widget) widget.remove();
  if (panel) panel.remove();
}

