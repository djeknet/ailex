export interface HelpSection {
  id: string;
  titleKey: string;
  descriptionKey: string;
  videoFile?: string | null;
  category: 'chat' | 'media' | 'tools' | 'context-menu' | 'history';
}

export const HELP_SECTIONS: HelpSection[] = [
  // Чат и модели
  {
    id: 'ai-providers',
    titleKey: 'helpTitle_aiProviders',
    descriptionKey: 'helpDescription_aiProviders',
    videoFile: null,
    category: 'chat',
  },
  {
    id: 'model-filters',
    titleKey: 'helpTitle_modelFilters',
    descriptionKey: 'helpDescription_modelFilters',
    videoFile: null,
    category: 'chat',
  },
  {
    id: 'site-prompts',
    titleKey: 'helpTitle_sitePrompts',
    descriptionKey: 'helpDescription_sitePrompts',
    videoFile: null,
    category: 'chat',
  },
  {
    id: 'fullscreen-mode',
    titleKey: 'helpTitle_fullscreenMode',
    descriptionKey: 'helpDescription_fullscreenMode',
    videoFile: null,
    category: 'chat',
  },
  {
    id: 'message-editing',
    titleKey: 'helpTitle_messageEditing',
    descriptionKey: 'helpDescription_messageEditing',
    videoFile: null,
    category: 'chat',
  },

  // Медиа и прикрепления
  {
    id: 'file-attachments',
    titleKey: 'helpTitle_fileAttachments',
    descriptionKey: 'helpDescription_fileAttachments',
    videoFile: null,
    category: 'media',
  },
  {
    id: 'screenshot-capture',
    titleKey: 'helpTitle_screenshotCapture',
    descriptionKey: 'helpDescription_screenshotCapture',
    videoFile: null,
    category: 'media',
  },
  {
    id: 'tab-mentions',
    titleKey: 'helpTitle_tabMentions',
    descriptionKey: 'helpDescription_tabMentions',
    videoFile: null,
    category: 'media',
  },
  {
    id: 'voice-input',
    titleKey: 'helpTitle_voiceInput',
    descriptionKey: 'helpDescription_voiceInput',
    videoFile: null,
    category: 'media',
  },
  {
    id: 'webcam-capture',
    titleKey: 'helpTitle_webcamCapture',
    descriptionKey: 'helpDescription_webcamCapture',
    videoFile: null,
    category: 'media',
  },

  // Инструменты
  {
    id: 'function-calling',
    titleKey: 'helpTitle_functionCalling',
    descriptionKey: 'helpDescription_functionCalling',
    videoFile: null,
    category: 'tools',
  },
  {
    id: 'summarize-contacts',
    titleKey: 'helpTitle_summarizeContacts',
    descriptionKey: 'helpDescription_summarizeContacts',
    videoFile: null,
    category: 'tools',
  },
  {
    id: 'form-filling',
    titleKey: 'helpTitle_formFilling',
    descriptionKey: 'helpDescription_formFilling',
    videoFile: null,
    category: 'tools',
  },
  {
    id: 'page-parsing',
    titleKey: 'helpTitle_pageParsing',
    descriptionKey: 'helpDescription_pageParsing',
    videoFile: null,
    category: 'tools',
  },

  // Контекстные меню
  {
    id: 'text-context-menu',
    titleKey: 'helpTitle_textContextMenu',
    descriptionKey: 'helpDescription_textContextMenu',
    videoFile: null,
    category: 'context-menu',
  },
  {
    id: 'field-context-menu',
    titleKey: 'helpTitle_fieldContextMenu',
    descriptionKey: 'helpDescription_fieldContextMenu',
    videoFile: null,
    category: 'context-menu',
  },

  // История и настройки
  {
    id: 'chat-history',
    titleKey: 'helpTitle_chatHistory',
    descriptionKey: 'helpDescription_chatHistory',
    videoFile: null,
    category: 'history',
  },
  {
    id: 'token-statistics',
    titleKey: 'helpTitle_tokenStatistics',
    descriptionKey: 'helpDescription_tokenStatistics',
    videoFile: null,
    category: 'history',
  },
  {
    id: 'export-import',
    titleKey: 'helpTitle_exportImport',
    descriptionKey: 'helpDescription_exportImport',
    videoFile: null,
    category: 'history',
  },
  {
    id: 'developer-mode',
    titleKey: 'helpTitle_developerMode',
    descriptionKey: 'helpDescription_developerMode',
    videoFile: null,
    category: 'history',
  },
];

