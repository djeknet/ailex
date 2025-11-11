import { MessageSquare, Settings, History, HelpCircle, Wrench } from 'lucide-react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';

export default function Footer() {
  const { activeView, setActiveView } = useSettingsStore();
  const { t } = useTranslation();

  const navItems = [
    { id: 'chat' as const, icon: MessageSquare, label: t('chat') },
    { id: 'settings' as const, icon: Settings, label: t('settings') },
    { id: 'history' as const, icon: History, label: t('history') },
    { id: 'help' as const, icon: HelpCircle, label: t('help') },
    { id: 'tools' as const, icon: Wrench, label: t('tools') }
  ];

  return (
    <footer className="border-t bg-card">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
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
        })}
      </div>
    </footer>
  );
}

