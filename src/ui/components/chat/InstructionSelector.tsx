import { useSettingsStore } from '@shared/stores/settingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Button } from '@/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/ui/components/ui/dropdown-menu';
import { ScrollText, Settings } from 'lucide-react';

interface InstructionSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
}

export default function InstructionSelector({ value, onValueChange }: InstructionSelectorProps) {
  const { t } = useTranslation();
  const { instructions, setActiveView, setActiveSettingsTab } = useSettingsStore();

  const hasInstruction = value && value !== 'none';

  const handleOpenSettings = () => {
    setActiveSettingsTab('instructions');
    setActiveView('settings');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className={hasInstruction ? 'text-primary' : ''}
        >
          <ScrollText className="h-4 w-4" />
          <span className="sr-only">{t('instructions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup value={value || 'none'} onValueChange={onValueChange}>
          <DropdownMenuRadioItem value="none">
            {t('noInstruction')}
          </DropdownMenuRadioItem>
          {instructions.map((instruction) => (
            <DropdownMenuRadioItem key={instruction.id} value={instruction.id}>
              {instruction.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleOpenSettings} className="cursor-pointer">
          <Settings className="h-4 w-4 mr-2" />
          {t('settings')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

