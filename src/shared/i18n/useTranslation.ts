import { useState, useEffect, useCallback } from 'react';
import { i18nService } from './i18nService';
import { SupportedLanguage } from '@shared/types/common';

// Non-hook version for use outside React components
export function getTranslation(key: string, substitutions?: string | string[]): string {
  try {
    return i18nService.getMessage(key, substitutions);
  } catch (error) {
    console.error(`Translation error for key: ${key}`, error);
    return key;
  }
}

export function useTranslation() {
  const [locale, setLocale] = useState<SupportedLanguage>('en');
  const [isInitialized, setIsInitialized] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    // Инициализация i18n
    const init = async () => {
      try {
        await i18nService.initialize();
        setLocale(i18nService.getCurrentLanguage());
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        setIsInitialized(true); // Устанавливаем true даже при ошибке
      }
    };

    init();
  }, []);

  useEffect(() => {
    // Слушаем изменения языка
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.language) {
        const newLang = changes.language.newValue as SupportedLanguage;
        setLocale(newLang);
        setUpdateTrigger(prev => prev + 1);
        console.log(`🌍 Language changed: ${newLang}`);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const t = useCallback((key: string, substitutions?: string | string[]): string => {
    return getTranslation(key, substitutions);
  }, [locale, updateTrigger]);

  return { t, locale, isInitialized };
}

