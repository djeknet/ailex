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
import { FileText, Mail, Edit, ClipboardList, LucideIcon, HelpCircle } from 'lucide-react';

const toolIconMap: Record<string, { icon: LucideIcon; color: string }> = {
  'summarize': { icon: FileText, color: 'text-blue-500' },
  'collect-contacts': { icon: Mail, color: 'text-green-500' },
  'fill-form': { icon: Edit, color: 'text-orange-500' },
  'get-form-fields': { icon: ClipboardList, color: 'text-purple-500' },
  'fill-form-fields': { icon: Edit, color: 'text-amber-500' },
};

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
        <p>{t('tool_noAvailable')}</p>
        <p className="text-sm mt-2">{t('createTool')}</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {tools.map(tool => {
        const isDisabled = tool.requiresPersonalInfo && !personalInfo;
        const iconConfig = toolIconMap[tool.id] || { icon: FileText, color: 'text-gray-500' };
        const IconComponent = iconConfig.icon;
        
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
                    <IconComponent className={`h-4 w-4 ${iconConfig.color}`} />
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

