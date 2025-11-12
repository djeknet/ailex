import { handleMessage } from './handlers/messageHandler';
import { handleContextMenuClick } from './handlers/contextMenuHandler';
import { contextCommandCategories } from '@shared/constants/contextCommands';
import { getLanguageByCode } from '@shared/constants';

// Background service worker entry point

console.log('AiLex background service worker initialized');

// Открытие sidepanel при клике на иконку расширения
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

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
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AiLex extension installed');
  
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

  // Загружаем инструкции из sync storage
  const storageData = await chrome.storage.sync.get(['instructions']);
  const instructions = storageData.instructions || [];
  
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
  if (areaName === 'sync' && (changes.language || changes.instructions)) {
    console.log('[Background] Language or instructions changed, recreating context menu');
    
    // Получаем текущий язык
    const result = await chrome.storage.sync.get(['language']);
    const language = changes.language?.newValue || result.language || 'en';
    
    createContextMenu(language);
  }
});

