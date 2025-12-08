import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import FullscreenChat from '../pages/FullscreenChat';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useChatStore } from '@shared/stores/chatStore';
import { applyColorScheme } from '@shared/utils/colorScheme';
import { applyFontFamily } from '@shared/utils/fontFamily';
import '../styles/globals.css';

function FullscreenApp() {
  const { theme, colorScheme, fontFamily, initializeSettings } = useSettingsStore();
  const currentChat = useChatStore(state => state.currentChat);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeSettings().then(() => setIsReady(true));
  }, [initializeSettings]);

  // Обновляем document.title при изменении текущего чата
  useEffect(() => {
    if (currentChat?.title) {
      document.title = currentChat.title + ' - AiLex';
    } else {
      document.title = 'Fullscreen Chat - AiLex';
    }
  }, [currentChat?.title]);

  useEffect(() => {
    // Применяем тему
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Применяем цветовую схему
    applyColorScheme(colorScheme || 'green', theme);
  }, [theme, colorScheme]);

  // Применяем шрифт при изменении
  useEffect(() => {
    applyFontFamily(fontFamily || 'system');
  }, [fontFamily]);

  // Слушаем изменения системной темы
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const root = document.documentElement;
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        // Применяем цветовую схему при изменении системной темы
        applyColorScheme(colorScheme || 'green', theme);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme, colorScheme]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <FullscreenChat />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FullscreenApp />
  </React.StrictMode>
);


