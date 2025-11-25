import { useState, useEffect } from 'react';
import { BadgeHelp, Plus, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { Skeleton } from '@/ui/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useSitePromptsStore } from '@shared/stores/sitePromptsStore';
import { SitePrompt } from '@shared/types/sitePrompts';
import { isSystemPage } from '@shared/utils/pageUtils';

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  isLoading: boolean; // Blocks buttons when sending any request
  isGenerating: boolean; // Shows skeleton loading for this message
  currentUrl?: string;
  favicon?: string | null;
}

export default function SuggestedQuestions({ 
  questions, 
  onQuestionClick, 
  isLoading,
  isGenerating,
  currentUrl,
  favicon
}: SuggestedQuestionsProps) {
  const { t } = useTranslation();
  const { currentSitePrompts, loadPromptsForUrl } = useSitePromptsStore();
  const [showSitePrompts, setShowSitePrompts] = useState(false);
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
        console.error('[SuggestedQuestions] Error getting tab ID:', error);
      }
    };
    
    getTabId();
  }, []);

  // Загружаем промпты для текущего URL
  useEffect(() => {
    if (currentUrl && currentTabId && !isSystemPage(currentUrl)) {
      loadPromptsForUrl(currentUrl, currentTabId);
    }
  }, [currentUrl, currentTabId, loadPromptsForUrl]);

  // Helper to strip HTML tags (for safety with old saved questions)
  const stripHtml = (text: string): string => {
    return text.replace(/<[^>]*>/g, '').trim();
  };

  // Обработчик клика по site prompt
  const handleSitePromptClick = (prompt: SitePrompt) => {
    const promptText = prompt.textKey ? t(prompt.textKey) : prompt.text;
    onQuestionClick(promptText);
  };

  // Don't render if no questions and not generating
  if (questions.length === 0 && !isGenerating) return null;

  // Проверяем, есть ли site prompts
  const hasSitePrompts = currentUrl && 
                         !isSystemPage(currentUrl) && 
                         currentSitePrompts && 
                         currentSitePrompts.length > 0;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <BadgeHelp className="w-3.5 h-3.5" />
        <span>{t('relatedQuestions')}</span>
      </div>
      
      {isGenerating ? (
        // Show skeleton loaders while generating
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10" style={{ width: `${Math.random() * 40 + 40}%` }} />
          <Skeleton className="h-10" style={{ width: `${Math.random() * 40 + 40}%` }} />
          <Skeleton className="h-10" style={{ width: `${Math.random() * 40 + 40}%` }} />
        </div>
      ) : (
        // Show actual questions
        <div className="flex flex-wrap gap-2">
          {questions.map((question, index) => {
            // Clean question from any HTML tags
            const cleanQuestion = stripHtml(question);
            const truncatedQuestion = cleanQuestion.length > 70 
              ? cleanQuestion.substring(0, 70) + '...' 
              : cleanQuestion;

            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-left whitespace-normal justify-start hover:bg-accent/50 transition-colors"
                      onClick={() => onQuestionClick(cleanQuestion)}
                      disabled={isLoading}
                    >
                      <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs">{truncatedQuestion}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-xs">{cleanQuestion}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      )}

      {/* Кнопка для показа site prompts */}
      {hasSitePrompts && !showSitePrompts && (
        <div className="flex justify-center mt-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSitePrompts(true)}
                  disabled={isLoading}
                  className="h-8 w-8 p-0 hover:bg-accent/50 transition-colors"
                >
                  <ChevronsUpDown className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('sitePromptsSectionTitle') || 'Site prompts'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Site prompts grid */}
      {showSitePrompts && hasSitePrompts && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            {t('sitePromptsSectionTitle') || 'Site prompts'}
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {currentSitePrompts.map((prompt, index) => {
              const promptText = prompt.textKey ? t(prompt.textKey) : prompt.text;
              
              return (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 px-3 flex items-start gap-2 hover:bg-accent/50 text-left transition-colors justify-start"
                        onClick={() => handleSitePromptClick(prompt)}
                        disabled={isLoading}
                      >
                        {favicon && (
                          <img 
                            src={favicon} 
                            alt="Site icon" 
                            className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 rounded-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className="text-xs font-normal line-clamp-2 flex-1">
                          {promptText}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-xs">{promptText}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

