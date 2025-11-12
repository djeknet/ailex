import { useEffect } from 'react';
import { useToolsStore } from '@shared/stores/toolsStore';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { Tool } from '@shared/types/tools';
import { Button } from '@/ui/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';

interface ToolsGridProps {
  onToolSelect: (tool: Tool) => void;
  currentUrl?: string;
}

export default function ToolsGrid({ onToolSelect, currentUrl }: ToolsGridProps) {
  const { getFilteredTools, loadTools, setCurrentUrl, isLoading } = useToolsStore();
  const { personalInfo } = useSettingsStore();
  
  useEffect(() => {
    setCurrentUrl(currentUrl || null);
    loadTools(currentUrl);
  }, [currentUrl, loadTools, setCurrentUrl]);
  
  const tools = getFilteredTools();
  
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
        <p>Нет доступных инструментов</p>
        <p className="text-sm mt-2">Создайте свои инструменты на странице Tools</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
      {tools.map(tool => {
        const isDisabled = tool.requiresPersonalInfo && !personalInfo;
        
        return (
          <TooltipProvider key={tool.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 gap-2"
                  onClick={() => !isDisabled && onToolSelect(tool)}
                  disabled={isDisabled}
                >
                  <div className="text-2xl">{tool.icon}</div>
                  <div className="text-sm font-medium text-left">{tool.name}</div>
                  <div className="text-xs text-muted-foreground text-left line-clamp-2">
                    {tool.description}
                  </div>
                </Button>
              </TooltipTrigger>
              {isDisabled && (
                <TooltipContent>
                  <p>Заполните личную информацию в настройках</p>
                </TooltipContent>
              )}
              {!isDisabled && (
                <TooltipContent>
                  <p>{tool.command}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

