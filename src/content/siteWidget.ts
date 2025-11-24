import { SitePrompt, SitePromptsConfig } from '@shared/types/sitePrompts';

// Cache for configuration
let cachedConfig: SitePromptsConfig | null = null;

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

  // Prompts panel
  const panel = document.createElement('div');
  panel.className = 'ailex-prompts-panel';
  panel.id = 'ailex-prompts-panel';

  // Get localized messages
  const titleText = chrome.i18n.getMessage('sitePromptsSectionTitle') || 'You might be interested in:';
  
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
    
    // Get localized text
    const promptText = prompt.textKey 
      ? chrome.i18n.getMessage(prompt.textKey) || prompt.text
      : prompt.text;
    
    item.innerHTML = `
      ${favicon ? `<img src="${favicon}" class="ailex-prompt-favicon" alt="Site icon" onerror="this.style.display='none'" />` : ''}
      <div class="ailex-prompt-text">${promptText}</div>
    `;
    
    list.appendChild(item);
  });

  document.body.appendChild(container);
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
  const toggle = document.getElementById('ailex-widget-toggle');
  const panel = document.getElementById('ailex-prompts-panel');
  const closeBtn = document.getElementById('ailex-panel-close');
  const list = document.getElementById('ailex-prompts-list');

  if (!toggle || !panel || !closeBtn || !list) {
    return;
  }

  // Toggle panel
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('active');
  });

  // Close panel
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.remove('active');
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

    // TODO: Temporary disabled - will be enabled when extension supports standalone page
    // Currently Chrome doesn't allow opening sidepanel programmatically without user gesture
    // Future implementation: open extension in new tab instead of sidepanel
    console.log('[siteWidget] Prompt click handled. Feature temporarily disabled - will redirect to extension page in future.');
    
    /* 
    // DISABLED CODE - for future implementation when extension has standalone page:
    
    // Send prompt to extension
    try {
      console.log('[siteWidget] Sending message to background...');
      const response = await chrome.runtime.sendMessage({
        type: 'OPEN_SIDEPANEL_WITH_PROMPT',
        data: { 
          prompt,
          url: window.location.href
        }
      });
      console.log('[siteWidget] Response from background:', response);
      
      if (!response?.success) {
        console.error('[siteWidget] Failed to open sidepanel:', response?.error);
      } else {
        console.log('[siteWidget] Sidepanel opened successfully');
      }
    } catch (error) {
      console.error('[siteWidget] Error sending prompt:', error);
    }
    */
  });
}

// Remove widget
export function removeSiteWidget() {
  const widget = document.getElementById('ailex-site-widget');
  const panel = document.getElementById('ailex-prompts-panel');
  
  if (widget) widget.remove();
  if (panel) panel.remove();
}

