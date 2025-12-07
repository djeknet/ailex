import { MessageSquare, Settings, History, HelpCircle, Wrench } from 'lucide-react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/ui/tooltip';

const HELP_TOOLTIP_SHOWN_KEY = 'ailex-help-tooltip-shown';

export default function Footer() {
  const { activeView, setActiveView, operators } = useSettingsStore();
  const { t } = useTranslation();
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  // Проверяем, есть ли подключенные операторы и не показывали ли мы тултип ранее
  useEffect(() => {
    const hasConnectedOperator = operators.some(
      op => op.models && op.models.length > 0
    );
    
    const tooltipShown = localStorage.getItem(HELP_TOOLTIP_SHOWN_KEY);
    
    // Показываем тултип только если есть подключенный оператор и тултип еще не показывали
    if (hasConnectedOperator && !tooltipShown) {
      setShowHelpTooltip(true);
      
      // Автоматически скрываем через 5 секунд
      const timer = setTimeout(() => {
        setShowHelpTooltip(false);
        localStorage.setItem(HELP_TOOLTIP_SHOWN_KEY, 'true');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [operators]);

  const navItems = [
    { id: 'chat' as const, icon: MessageSquare, label: t('chat') },
    { id: 'settings' as const, icon: Settings, label: t('settings') },
    { id: 'history' as const, icon: History, label: t('history') },
    { id: 'help' as const, icon: HelpCircle, label: t('help') },
    { id: 'tools' as const, icon: Wrench, label: t('tools') }
  ];

  const handleHelpClick = () => {
    setActiveView('help');
    // Отмечаем, что тултип был показан при клике
    if (showHelpTooltip) {
      setShowHelpTooltip(false);
      localStorage.setItem(HELP_TOOLTIP_SHOWN_KEY, 'true');
    }
  };

  return (
    <footer className="border-t bg-card">
      <TooltipProvider>
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const isHelp = item.id === 'help';

            const button = (
              <button
                key={item.id}
                onClick={() => isHelp ? handleHelpClick() : setActiveView(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </button>
            );

            // Оборачиваем кнопку "Помощь" в тултип
            if (isHelp) {
              return (
                <Tooltip key={item.id} open={showHelpTooltip} onOpenChange={setShowHelpTooltip}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-primary text-primary-foreground">
                    <p>{t('helpTooltipFirstTime')}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </div>
      </TooltipProvider>
    </footer>
  );
}

