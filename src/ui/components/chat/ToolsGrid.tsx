import { useEffect } from 'react';
import { useToolsStore } from '@shared/stores/toolsStore';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Tool } from '@shared/types/tools';
import { Button } from '@/ui/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface ToolsGridProps {
  onToolSelect: (tool: Tool) => void;
  currentUrl?: string;
}

export default function ToolsGrid({ onToolSelect, currentUrl }: ToolsGridProps) {
  const { t } = useTranslation();
  const { getFilteredTools, loadTools, setCurrentUrl, isLoading } = useToolsStore();
  const { personalInfo } = useSettingsStore();
  
  useEffect(() => {
    setCurrentUrl(currentUrl || null);
    loadTools(); // Загружаем все инструменты, фильтрация по URL в getFilteredTools
  }, [currentUrl, loadTools, setCurrentUrl]);
  
  // Получаем инструменты и фильтруем их ЗДЕСЬ, не полагаясь на store
  const allTools = getFilteredTools();
  
  // Дополнительная фильтрация по URL прямо здесь
  const tools = currentUrl 
    ? allTools.filter(tool => {
        if (!tool.urlPattern) return true;
        const matches = currentUrl.startsWith(tool.urlPattern);
        console.log('[ToolsGrid] Filter check:', {
          toolName: tool.name,
          urlPattern: tool.urlPattern,
          currentUrl,
          matches
        });
        return matches;
      })
    : allTools;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (tools.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>{t('tool_noAvailable')}</p>
        <p className="text-sm mt-2">{t('createTool')}</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {tools.map(tool => {
        const isDisabled = tool.requiresPersonalInfo && !personalInfo;
        
        // Используем локализованные значения, если есть ключи
        const toolName = tool.nameKey ? t(tool.nameKey) : tool.name;
        const toolDescription = tool.descriptionKey ? t(tool.descriptionKey) : tool.description;
        
        return (
          <div key={tool.id} className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 px-3 gap-2 hover:bg-accent"
                    onClick={() => !isDisabled && onToolSelect(tool)}
                    disabled={isDisabled}
                  >
                    <span className="text-base">{tool.icon || '🔧'}</span>
                    <span className="text-sm font-medium">{toolName}</span>
                  </Button>
                </TooltipTrigger>
                {!isDisabled && (
                  <TooltipContent>
                    <p className="text-xs">{toolDescription}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tool.command}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            
            {isDisabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t('fillPersonalInfoTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      })}
    </div>
  );
}

