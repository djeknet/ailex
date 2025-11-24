import { useEffect, useState } from 'react';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useSitePromptsStore } from '@shared/stores/sitePromptsStore';
import { SitePrompt } from '@shared/types/sitePrompts';
import { Button } from '@/ui/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';

interface SitePromptsGridProps {
  onPromptSelect: (prompt: SitePrompt) => void;
  currentUrl?: string;
  favicon?: string | null;
}

export default function SitePromptsGrid({ onPromptSelect, currentUrl, favicon }: SitePromptsGridProps) {
  const { t } = useTranslation();
  const { currentSitePrompts, loadPromptsForUrl, isLoading } = useSitePromptsStore();
  const [currentTabId, setCurrentTabId] = useState<number | undefined>();

  // Получаем tab ID для определения типа страницы
  useEffect(() => {
    const getTabId = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          setCurrentTabId(tab.id);
        }
      } catch (error) {
        console.error('[SitePromptsGrid] Error getting tab ID:', error);
      }
    };
    
    getTabId();
  }, []);

  // Загружаем промпты для текущего URL
  useEffect(() => {
    if (currentUrl && currentTabId) {
      console.log('[SitePromptsGrid] Loading prompts for URL:', currentUrl);
      loadPromptsForUrl(currentUrl, currentTabId);
    }
  }, [currentUrl, currentTabId, loadPromptsForUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentSitePrompts || currentSitePrompts.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Заголовок */}
      <h3 className="text-sm font-medium text-foreground/70 mb-3 px-1">
        {t('sitePromptsSectionTitle') || 'You might be interested in:'}
      </h3>

      {/* Grid с промптами */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4">
        {currentSitePrompts.map((prompt, index) => {
          // Получаем локализованный текст
          const promptText = prompt.textKey ? t(prompt.textKey) : prompt.text;
          
          return (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-auto p-3 flex items-start gap-2 hover:bg-accent/50 text-left transition-colors justify-start"
                    onClick={() => onPromptSelect(prompt)}
                  >
                    {/* Favicon сайта */}
                    {favicon && (
                      <img 
                        src={favicon} 
                        alt="Site icon" 
                        className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-sm"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    
                    {/* Текст промпта с обрезкой */}
                    <span className="text-sm font-normal line-clamp-2 flex-1">
                      {promptText}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <p className="text-sm">{promptText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

