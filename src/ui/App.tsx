import { useState, useEffect } from 'react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { applyColorScheme } from '@shared/utils/colorScheme';
import { applyFontFamily } from '@shared/utils/fontFamily';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import History from './pages/History';
import Help from './pages/Help';
import Tools from './pages/Tools';
import Footer from './components/layout/Footer';
import ApiLogsPanel from './components/developer/ApiLogsPanel';

export default function App() {
  const { activeView, theme, colorScheme, fontFamily, developerMode, initializeSettings } = useSettingsStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeSettings().then(() => setIsReady(true));
  }, [initializeSettings]);

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

    // Применяем цветовую схему при изменении темы
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <main className="flex-1 overflow-hidden">
        {activeView === 'chat' && <Chat />}
        {activeView === 'settings' && <Settings />}
        {activeView === 'history' && <History />}
        {activeView === 'help' && <Help />}
        {activeView === 'tools' && <Tools />}
      </main>
      <div style={{ marginBottom: developerMode ? '40px' : '0' }}>
        <Footer />
      </div>
      {developerMode && <ApiLogsPanel />}
    </div>
  );
}

