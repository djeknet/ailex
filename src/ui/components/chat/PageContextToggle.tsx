import { useState, useEffect } from 'react';
import { useChatStore } from '@shared/stores/chatStore';
import { Button } from '@/ui/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/components/ui/tooltip';
import { Globe, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';
import { PageContextType } from '@shared/types/extension';
import { useTranslation } from '@shared/i18n/useTranslation';

export default function PageContextToggle() {
  const { t } = useTranslation();
  const { pageContextEnabled, setPageContextEnabled, pageContextType, setPageContextType } = useChatStore();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('connected');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const contextTypes: { value: PageContextType; label: string }[] = [
    { value: 'text', label: 'Только текст' },
    { value: 'dom', label: 'DOM страницы' },
    { value: 'html', label: 'HTML страницы' }
  ];

  // Проверка соединения с content script
  const checkConnection = async (): Promise<boolean> => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return false;

      // Проверяем, что это не системная страница
      const url = tab.url || '';
      if (url.startsWith('chrome://') || 
          url.startsWith('chrome-extension://') || 
          url.startsWith('edge://') || 
          url.startsWith('about:') ||
          url.startsWith('file://') ||
          url === '') {
        return false;
      }

      // Пробуем отправить тестовое сообщение
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_PAGE_CONTEXT',
        data: { type: 'text', maxTokens: 10 }
      });

      return response?.success === true;
    } catch (error) {
      console.warn('[PageContextToggle] Connection check failed:', error);
      return false;
    }
  };

  // Обновление страницы
  const handleRefreshPage = async () => {
    setIsRefreshing(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.reload(tab.id);
        
        // Ждем пока страница загрузится
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Проверяем соединение
        const isConnected = await checkConnection();
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      }
    } catch (error) {
      console.error('[PageContextToggle] Error refreshing page:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Проверяем соединение при включении page context
  const handleToggle = async () => {
    const newState = !pageContextEnabled;
    
    if (newState) {
      setConnectionStatus('checking');
      const isConnected = await checkConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      
      if (!isConnected) {
        // Не включаем page context, если нет соединения
        return;
      }
    }
    
    setPageContextEnabled(newState);
  };

  // Проверяем соединение при монтировании и изменении вкладки
  useEffect(() => {
    // Всегда проверяем соединение при монтировании, если page context включен
    if (pageContextEnabled) {
      checkConnection().then(isConnected => {
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      });
    }

    // Слушаем изменения вкладок
    const handleTabChange = () => {
      if (pageContextEnabled) {
        checkConnection().then(isConnected => {
          setConnectionStatus(isConnected ? 'connected' : 'disconnected');
        });
      }
    };

    chrome.tabs.onActivated.addListener(handleTabChange);
    chrome.tabs.onUpdated.addListener(handleTabChange);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabChange);
      chrome.tabs.onUpdated.removeListener(handleTabChange);
    };
  }, [pageContextEnabled]);

  // Периодическая проверка соединения каждые 3 секунды, если page context включен
  useEffect(() => {
    if (!pageContextEnabled) return;

    const intervalId = setInterval(() => {
      checkConnection().then(isConnected => {
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      });
    }, 3000);

    return () => clearInterval(intervalId);
  }, [pageContextEnabled]);

  const showWarning = connectionStatus === 'disconnected';

  return (
    <div className="flex flex-col gap-1">
      {showWarning && (
        <div className="flex items-center gap-2 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="flex-1">{t('pageContextDisconnected')}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshPage}
            disabled={isRefreshing}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refreshPage')}
          </Button>
        </div>
      )}
      
      <div className="flex gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={pageContextEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggle}
                className="flex-1"
                disabled={connectionStatus === 'checking'}
              >
                <Globe className={`h-4 w-4 mr-2 ${connectionStatus === 'checking' ? 'animate-pulse' : ''}`} />
                Текущая страница
              </Button>
            </TooltipTrigger>
            {connectionStatus === 'checking' && (
              <TooltipContent>
                {t('checkingConnection')}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        <Select value={pageContextType} onValueChange={(value) => setPageContextType(value as PageContextType)}>
          <SelectTrigger className="w-[40px] px-2">
            <ChevronDown className="h-4 w-4" />
          </SelectTrigger>
          <SelectContent>
            {contextTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
