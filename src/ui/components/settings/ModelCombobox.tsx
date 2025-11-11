import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@shared/utils/cn';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Button } from '@/ui/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/components/ui/popover';
import { AIModel, AIOperator } from '@shared/types/ai';

interface ModelComboboxProps {
  models: AIModel[];
  value?: string;
  onValueChange: (value: string) => void;
  operator: AIOperator;
  placeholder?: string;
}

export function ModelCombobox({
  models,
  value,
  onValueChange,
  operator,
  placeholder
}: ModelComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedModel = models.find(model => model.id === value);
  const defaultPlaceholder = placeholder || t('selectModel');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedModel && (
              <img 
                src={`/icons/ai/${operator}.png`} 
                alt={operator}
                className="w-4 h-4 flex-shrink-0"
              />
            )}
            <span className="truncate">
              {selectedModel ? selectedModel.name : defaultPlaceholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={t('searchModel')}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>{t('modelNotFound')}</CommandEmpty>
            <CommandGroup>
              {models.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.name}
                  onSelect={() => {
                    onValueChange(model.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 truncate">
                    <img 
                      src={`/icons/ai/${operator}.png`} 
                      alt={operator}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="truncate">{model.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 flex-shrink-0",
                      value === model.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

