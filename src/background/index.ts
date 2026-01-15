import { handleMessage } from './handlers/messageHandler';
import { handleContextMenuClick } from './handlers/contextMenuHandler';
import { contextCommandCategories } from '@shared/constants/contextCommands';
import { getLanguageByCode, RESPONSE_TONES, EXTERNAL_URLS } from '@shared/constants';
import { PersonalInfo } from '@shared/types/extension';

// Background service worker entry point

console.log('AiLex background service worker initialized');

// ============================================================================
// YouTube Transcript URL Interception
// ============================================================================

// Экспортируем в globalThis для доступа из messageHandler
(globalThis as any).lastWorkingSubtitleUrl = null;

// Перехватываем XHR запросы к timedtext API для получения рабочего URL
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Ищем запросы с актуальными параметрами плеера
    if (
      details.url.includes('timedtext') &&
      details.url.includes('cplayer=') &&
      details.type === 'xmlhttprequest'
    ) {
      (globalThis as any).lastWorkingSubtitleUrl = details.url;
      console.log('[Background] Captured working subtitle URL:', details.url);
    }
  },
  { urls: ['*://*.youtube.com/api/timedtext*'] }
);

console.log('[Background] YouTube transcript URL interceptor initialized');

// Открытие sidepanel при клике на иконку расширения
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Устанавливаем минимальную ширину для side panel (особенно важно для Edge)
// Edge по умолчанию открывает side panel с меньшей шириной чем Chrome
try {
  // Пытаемся установить минимальную ширину через setOptions (если поддерживается)
  if (chrome.sidePanel && 'setOptions' in chrome.sidePanel) {
    (chrome.sidePanel as any).setOptions({
      enabled: true,
      // @ts-ignore - эти опции могут быть недокументированы
      width: 420
    }).catch((error: Error) => {
      console.log('[Background] Could not set side panel width (this is OK):', error.message);
    });
  }
} catch (error) {
  console.log('[Background] Side panel width option not supported');
}

// Обработка сообщений от UI и content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  // Ignore messages not intended for background (from content scripts to UI)
  const uiOnlyMessages = [
    'ELEMENT_SELECTED',
    'ELEMENT_SELECTION_CANCELLED',
    'SCREENSHOT_AREA_SELECTED',
    'SCREENSHOT_SELECTION_CANCELLED'
  ];
  
  if (uiOnlyMessages.includes(message.type)) {
    // Let it pass through to other listeners (UI)
    return false;
  }
  
  handleMessage(message, sender)
    .then((response) => {
      sendResponse(response);
    })
    .catch((error) => {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    });
  
  return true; // Для асинхронных ответов
});

// Инициализация при установке расширения
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] onInstalled triggered:', details);
  console.log('[Background] Reason:', details.reason);
  console.log('[Background] Previous version:', details.previousVersion);
  
  // Установка дефолтных настроек
  const result = await chrome.storage.sync.get(['theme', 'language', 'historyMode']);
  
  if (!result.theme) {
    await chrome.storage.sync.set({ theme: 'system' });
  }
  
  if (!result.language) {
    await chrome.storage.sync.set({ language: 'en' });
  }
  
  if (!result.historyMode) {
    await chrome.storage.sync.set({ historyMode: 'all' });
  }

  // Создание контекстного меню
  createContextMenu(result.language || 'en');
  
  // Открытие страницы благодарности
  const browserLanguage = chrome.i18n.getUILanguage().split('-')[0] || 'en';
  console.log('[Background] Browser language detected:', browserLanguage);
  
  if (details.reason === 'install') {
    // Первая установка расширения
    console.log('[Background] Opening THANK_YOU_INSTALL page');
    const thankYouUrl = EXTERNAL_URLS.THANK_YOU_INSTALL(browserLanguage);
    console.log('[Background] Thank you URL:', thankYouUrl);
    chrome.tabs.create({
      url: thankYouUrl,
      active: true
    });
  } else if (details.reason === 'update') {
    // Обновление расширения
    console.log('[Background] Opening THANK_YOU_UPDATE page');
    const thankYouUrl = EXTERNAL_URLS.THANK_YOU_UPDATE(browserLanguage);
    console.log('[Background] Thank you URL:', thankYouUrl);
    chrome.tabs.create({
      url: thankYouUrl,
      active: true
    });
  }
});

// Создание контекстного меню с командами
async function createContextMenu(language: string) {
  console.log('[Background] Creating context menu for language:', language);

  // Загружаем переводы для выбранного языка
  const translations = await loadTranslations(language);
  
  // Функция получения перевода
  const getTranslation = (key: string): string => {
    return translations[key] || key;
  };

  // Получаем название текущего языка для команды перевода
  const currentLanguageName = getLanguageName(language);

  // Загружаем инструкции и личные данные из sync storage
  const storageData = await chrome.storage.sync.get(['instructions', 'personalInfo']);
  const instructions = storageData.instructions || [];
  const personalInfo: PersonalInfo = storageData.personalInfo || {};
  
  // Загружаем доступные инструменты
  let availableTools: any[] = [];
  try {
    // Import только когда действительно нужно (при создании меню)
    // Избегаем импорта во время инициализации из-за возможных DOM зависимостей
    const toolsModule = await import('@shared/services/toolsService');
    availableTools = await toolsModule.getAllAvailableTools();
    console.log('[Background] Loaded tools for context menu:', availableTools.length);
  } catch (error) {
    console.warn('[Background] Could not load tools for context menu (this is OK):', error);
    // Продолжаем без инструментов в меню - это не критично
  }

  // Удаляем все существующие пункты меню
  chrome.contextMenus.removeAll(() => {
    // Создаем меню для каждой категории
    contextCommandCategories.forEach((category) => {
      const categoryTitle = getTranslation(category.titleKey);
      
      // Создаем родительский пункт для категории
      const categoryId = `category_${category.id}`;
      chrome.contextMenus.create({
        id: categoryId,
        title: categoryTitle,
        contexts: ['selection']
      });

      // Добавляем команды в категорию
      category.commands.forEach((command) => {
        let commandTitle = getTranslation(command.titleKey);
        
        // Для команды перевода добавляем название текущего языка
        if (command.id === 'translate_text') {
          commandTitle = `${commandTitle} ${currentLanguageName}`;
        }
        
        chrome.contextMenus.create({
          id: command.id,
          parentId: categoryId,
          title: commandTitle,
          contexts: ['selection']
        });
      });
    });

    // Создаем категорию для инструкций, если они есть
    if (instructions.length > 0) {
      const instructionsCategoryTitle = getTranslation('contextMenu_category_instructions');
      const instructionsCategoryId = 'category_instructions';
      
      chrome.contextMenus.create({
        id: instructionsCategoryId,
        title: instructionsCategoryTitle,
        contexts: ['selection']
      });

      // Добавляем каждую инструкцию как отдельный пункт
      instructions.forEach((instruction: { id: string; name: string }) => {
        chrome.contextMenus.create({
          id: `instruction_${instruction.id}`,
          parentId: instructionsCategoryId,
          title: instruction.name,
          contexts: ['selection']
        });
      });
    }

    // Создаем категорию для инструментов, если они есть
    if (availableTools.length > 0) {
      const toolsCategoryId = 'category_tools';
      
      chrome.contextMenus.create({
        id: toolsCategoryId,
        title: '🔧 Tools',
        contexts: ['page', 'selection']
      });

      // Добавляем каждый инструмент как отдельный пункт
      availableTools.forEach((tool: any) => {
        chrome.contextMenus.create({
          id: `tool_${tool.id}`,
          parentId: toolsCategoryId,
          title: `${tool.icon} ${tool.name}`,
          contexts: ['page', 'selection']
        });
      });
      
      console.log('[Background] Added', availableTools.length, 'tools to context menu');
    }

    // ========== EDITABLE CONTEXT MENUS ==========

    // 1. Сгенерировать ответ (с тонами)
    const generateResponseCategoryId = 'category_generateResponse';
    chrome.contextMenus.create({
      id: generateResponseCategoryId,
      title: getTranslation('contextMenu_category_generateResponse'),
      contexts: ['editable']
    });

    // Добавляем тоны
    RESPONSE_TONES.forEach((tone) => {
      chrome.contextMenus.create({
        id: `response_tone_${tone}`,
        parentId: generateResponseCategoryId,
        title: getTranslation(`tone_${tone}`),
        contexts: ['editable']
      });
    });

    // 2. Заполнить по инструкции (если есть инструкции)
    const fillByInstructionCategoryId = 'category_fillByInstruction';
    chrome.contextMenus.create({
      id: fillByInstructionCategoryId,
      title: getTranslation('contextMenu_category_fillByInstruction'),
      contexts: ['editable']
    });

    // Добавляем "Указать" всегда первым пунктом
    chrome.contextMenus.create({
      id: 'fill_instruction_custom',
      parentId: fillByInstructionCategoryId,
      title: getTranslation('contextMenu_specifyInstruction'),
      contexts: ['editable']
    });

    // Добавляем сохраненные инструкции, если они есть
    if (instructions.length > 0) {
      instructions.forEach((instruction: { id: string; name: string }) => {
        chrome.contextMenus.create({
          id: `fill_instruction_${instruction.id}`,
          parentId: fillByInstructionCategoryId,
          title: instruction.name,
          contexts: ['editable']
        });
      });
    }

    // 3. Личные данные (только непустые поля)
    const personalInfoFields: Array<{ key: keyof PersonalInfo; labelKey: string }> = [
      // Basic Information
      { key: 'firstName', labelKey: 'personalInfo_firstName' },
      { key: 'lastName', labelKey: 'personalInfo_lastName' },
      { key: 'email', labelKey: 'personalInfo_email' },
      { key: 'phone', labelKey: 'personalInfo_phone' },
      // Location
      { key: 'country', labelKey: 'personalInfo_country' },
      { key: 'state', labelKey: 'personalInfo_state' },
      { key: 'city', labelKey: 'personalInfo_city' },
      { key: 'address', labelKey: 'personalInfo_address' },
      { key: 'addressLine2', labelKey: 'personalInfo_addressLine2' },
      { key: 'zipCode', labelKey: 'personalInfo_zipCode' },
      // Professional
      { key: 'position', labelKey: 'personalInfo_position' },
      { key: 'company', labelKey: 'personalInfo_company' },
      { key: 'workPhone', labelKey: 'personalInfo_workPhone' },
      { key: 'linkedin', labelKey: 'personalInfo_linkedin' },
      { key: 'github', labelKey: 'personalInfo_github' },
      { key: 'portfolio', labelKey: 'personalInfo_portfolio' },
      { key: 'resumeUrl', labelKey: 'personalInfo_resumeUrl' },
      { key: 'orcid', labelKey: 'personalInfo_orcid' },
      // Social
      { key: 'telegram', labelKey: 'personalInfo_telegram' },
      { key: 'twitter', labelKey: 'personalInfo_twitter' },
      { key: 'facebook', labelKey: 'personalInfo_facebook' },
      { key: 'instagram', labelKey: 'personalInfo_instagram' },
      { key: 'youtube', labelKey: 'personalInfo_youtube' },
      { key: 'tiktok', labelKey: 'personalInfo_tiktok' },
      { key: 'website', labelKey: 'personalInfo_website' },
      // Personal
      { key: 'about', labelKey: 'personalInfo_about' },
    ];

    // Фильтруем только непустые поля
    const nonEmptyFields = personalInfoFields.filter(field => 
      personalInfo[field.key] && String(personalInfo[field.key]).trim() !== ''
    );

    if (nonEmptyFields.length > 0) {
      const personalDataCategoryId = 'category_personalData';
      chrome.contextMenus.create({
        id: personalDataCategoryId,
        title: getTranslation('contextMenu_category_personalData'),
        contexts: ['editable']
      });

      // Добавляем поля
      nonEmptyFields.forEach((field) => {
        chrome.contextMenus.create({
          id: `personal_info_${field.key}`,
          parentId: personalDataCategoryId,
          title: getTranslation(field.labelKey),
          contexts: ['editable']
        });
      });
    }

    // Добавляем пункт для открытия полноэкранного режима (доступен всегда)
    chrome.contextMenus.create({
      id: 'open_fullscreen',
      title: getTranslation('openFullscreen'),
      contexts: ['page', 'selection', 'editable']
    });

    // Добавляем пункт для иконки расширения в тулбаре
    chrome.contextMenus.create({
      id: 'open_fullscreen_action',
      title: getTranslation('openFullscreen'),
      contexts: ['action']
    });

    console.log('[Background] Context menu created successfully');
  });
}

// Загрузка переводов из файлов локализации
async function loadTranslations(language: string): Promise<Record<string, string>> {
  try {
    const url = chrome.runtime.getURL(`_locales/${language}/messages.json`);
    const response = await fetch(url);
    const messages = await response.json();
    
    // Преобразуем формат Chrome в простой словарь
    const translations: Record<string, string> = {};
    for (const [key, value] of Object.entries(messages)) {
      translations[key] = (value as any).message;
    }
    
    console.log('[Background] Loaded translations for', language, '- keys:', Object.keys(translations).length);
    return translations;
  } catch (error) {
    console.error('[Background] Error loading translations:', error);
    // Fallback to English
    if (language !== 'en') {
      return loadTranslations('en');
    }
    return {};
  }
}

// Получить название языка для контекстного меню
function getLanguageName(languageCode: string): string {
  const languageConfig = getLanguageByCode(languageCode);
  
  if (!languageConfig) {
    return '';
  }
  
  // Возвращаем нативное название с предлогом в зависимости от языка интерфейса
  if (languageCode === 'ru') {
    return `на ${languageConfig.nativeName}`;
  } else {
    return `to ${languageConfig.nativeName}`;
  }
}

// Обработчик кликов по контекстному меню
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Слушаем изменения языка для обновления меню
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && (changes.language || changes.instructions || changes.personalInfo)) {
    console.log('[Background] Language, instructions or personalInfo changed, recreating context menu');
    
    // Получаем текущий язык
    const result = await chrome.storage.sync.get(['language']);
    const language = changes.language?.newValue || result.language || 'en';
    
    createContextMenu(language);
  }
});

