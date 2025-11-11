/**
 * Сервис для динамической работы с локализациями
 */

import { SupportedLanguage } from '@shared/types/common';

type TranslationMessages = Record<string, { message: string }>;

class I18nService {
  private translations: Partial<Record<SupportedLanguage, TranslationMessages>> = {};
  private currentLang: SupportedLanguage = 'en';
  private loadedLanguages = new Set<SupportedLanguage>();
  private isInitialized = false;

  /**
   * Загрузка переводов для языка
   */
  async loadLanguage(lang: SupportedLanguage): Promise<void> {
    if (this.loadedLanguages.has(lang)) {
      return;
    }

    try {
      const response = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
      const messages = await response.json();
      this.translations[lang] = messages;
      this.loadedLanguages.add(lang);
      console.log(`✅ Loaded language: ${lang}`);
    } catch (error) {
      console.error(`Failed to load language ${lang}:`, error);
      throw error;
    }
  }

  /**
   * Инициализация с загрузкой сохраненного языка и слушателем изменений
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const result = await chrome.storage.sync.get(['language']);
    const savedLang = (result.language as SupportedLanguage) || 'en';
    
    // Загружаем сохраненный язык
    await this.loadLanguage(savedLang);
    this.currentLang = savedLang;
    
    // Слушаем изменения языка в storage
    chrome.storage.onChanged.addListener(async (changes) => {
      if (changes.language) {
        const newLang = changes.language.newValue as SupportedLanguage;
        if (newLang !== this.currentLang) {
          await this.loadLanguage(newLang);
          this.currentLang = newLang;
          console.log(`🌍 I18nService: Language changed to ${newLang}`);
        }
      }
    });

    this.isInitialized = true;
    console.log(`🌍 I18n initialized with language: ${savedLang}`);
  }

  /**
   * Смена языка (без сохранения в storage - это делает settingsStore)
   */
  async changeLanguage(lang: SupportedLanguage): Promise<void> {
    await this.loadLanguage(lang);
    this.currentLang = lang;
    console.log(`🌍 Language changed to: ${lang}`);
  }

  /**
   * Получение перевода
   */
  getMessage(key: string, substitutions?: string | string[]): string {
    const messages = this.translations[this.currentLang];
    if (!messages || !messages[key]) {
      console.warn(`Translation missing for key: ${key} in ${this.currentLang}`);
      return key;
    }

    let message = messages[key].message;
    
    // Подстановка значений
    if (substitutions) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      subs.forEach((sub, index) => {
        message = message.replace(`$${index + 1}`, sub);
      });
    }

    return message;
  }

  /**
   * Получить текущий язык
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLang;
  }

  /**
   * Проверка загрузки языка
   */
  isLanguageLoaded(lang: SupportedLanguage): boolean {
    return this.loadedLanguages.has(lang);
  }
}

export const i18nService = new I18nService();

