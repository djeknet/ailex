import { useState } from 'react';
import { Check, Star, Scale } from 'lucide-react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useFavoriteModels } from '@shared/hooks/useFavoriteModels';
import { useTranslation } from '@shared/i18n/useTranslation';
import { cn } from '@shared/utils/cn';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import { Button } from '@/ui/components/ui/button';
import { getOperatorName, getOperatorIcon } from '@shared/services/aiService';
import type { AIOperatorConfig, AIOperator } from '@shared/types/extension';

interface ConsulModelSelectProps {
  onModelSelect: (operator: AIOperatorConfig, modelId: string) => void;
  currentOperator?: AIOperator;
  currentModel?: string;
  onOpenChange?: (open: boolean) => void;
}

export default function ConsulModelSelect({ 
  onModelSelect, 
  currentOperator, 
  currentModel,
  onOpenChange
}: ConsulModelSelectProps) {
  const { t } = useTranslation();
  const { operators } = useSettingsStore();
  const { isFavorite, toggleFavorite } = useFavoriteModels();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const configuredOperators = operators.filter(
    op => op.selectedModel && op.models && op.models.length > 0
  );

  if (configuredOperators.length === 0) {
    return null;
  }

  const currentValue = currentOperator && currentModel 
    ? `${currentOperator}::${currentModel}`
    : '';

  // Custom filter function - search by word start
  const filterModels = (model: any, operator: string) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const modelName = model.name.toLowerCase();
    const modelId = model.id.toLowerCase();
    const operatorName = operator.toLowerCase();
    
    // Split search query and model name into words
    const queryWords = query.split(/[\s-]+/);
    const modelWords = modelName.split(/[\s-]+/);
    const idWords = modelId.split(/[\s-]+/);
    
    // Check if any query word matches the start of any model word
    return queryWords.every((queryWord: string) => 
      modelWords.some((modelWord: string) => modelWord.startsWith(queryWord)) ||
      idWords.some((idWord: string) => idWord.startsWith(queryWord)) ||
      operatorName.includes(queryWord)
    );
  };

  // Build favorites group
  const favoriteModels: Array<{ operator: AIOperator; model: any; config: AIOperatorConfig }> = [];
  configuredOperators.forEach(config => {
    config.models?.forEach(model => {
      if (isFavorite(config.operator, model.id) && filterModels(model, config.operator)) {
        favoriteModels.push({ operator: config.operator, model, config });
      }
    });
  });

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen);
        onOpenChange?.(newOpen);
      }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="h-8 w-8"
              >
                <Scale className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('consulTooltip')}</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={t('searchModel')}
            className="h-9"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>{t('modelNotFound')}</CommandEmpty>
            
            {/* Favorites group */}
            {favoriteModels.length > 0 && (
              <CommandGroup heading={t('favorites')}>
                {favoriteModels.map(({ operator, model, config }) => {
                  const value = `${operator}::${model.id}`;
                  const isSelected = currentValue === value;
                  return (
                    <CommandItem
                      key={value}
                      value={`${model.name} ${operator}`}
                      onSelect={() => {
                        onModelSelect(config, model.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 truncate">
                        <img 
                          src={getOperatorIcon(operator)}
                          alt={operator}
                          className="w-4 h-4 flex-shrink-0"
                        />
                        <span className={cn("truncate", isSelected && "font-semibold")}>
                          {model.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                        <Check
                          className={cn(
                            "h-4 w-4 text-primary",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(operator, model.id);
                          }}
                          className="p-1 hover:bg-accent rounded-sm"
                        >
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        </button>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            
            {/* Regular operator groups */}
            {configuredOperators.map(config => {
              const filteredModels = config.models?.filter(model => filterModels(model, config.operator)) || [];
              
              if (filteredModels.length === 0) return null;
              
              return (
              <CommandGroup 
                key={config.operator} 
                heading={
                  <div className="flex items-center gap-2">
                    <img 
                      src={getOperatorIcon(config.operator)}
                      alt={config.operator}
                      className="w-4 h-4"
                    />
                    {getOperatorName(config.operator)}
                  </div>
                }
              >
                {filteredModels.map(model => {
                  const value = `${config.operator}::${model.id}`;
                  const isSelected = currentValue === value;
                  const isFav = isFavorite(config.operator, model.id);
                  return (
                    <CommandItem
                      key={value}
                      value={`${model.name} ${config.operator}`}
                      onSelect={() => {
                        onModelSelect(config, model.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 truncate">
                        <span className={cn("truncate", isSelected && "font-semibold")}>
                          {model.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                        <Check
                          className={cn(
                            "h-4 w-4 text-primary",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(config.operator, model.id);
                          }}
                          className="p-1 hover:bg-accent rounded-sm"
                        >
                          <Star className={cn(
                            "h-3.5 w-3.5",
                            isFav ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          )} />
                        </button>
                      </div>
                    </CommandItem>
                    );
                  })}
                </CommandGroup>
                );
              })}
          </CommandList>
        </Command>
      </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

