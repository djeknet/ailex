import { useState, useMemo, useCallback } from 'react';
import { Check, Star, Settings, Settings2 } from 'lucide-react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useChatStore } from '@shared/stores/chatStore';
import { useModelFiltersStore } from '@shared/stores/modelFiltersStore';
import { useFavoriteModels } from '@shared/hooks/useFavoriteModels';
import { useTranslation } from '@shared/i18n/useTranslation';
import { cn } from '@shared/utils/cn';
import { getModelInfo } from '@shared/constants';
import { Button } from '@/ui/components/ui/button';
import ImageGenerationSettingsDialog from './ImageGenerationSettingsDialog';
import ModelFiltersDialog from './ModelFiltersDialog';
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
import { getOperatorName, getOperatorIcon } from '@shared/services/aiService';
import type { AIOperatorConfig, AIOperator } from '@shared/types/extension';

export default function ModelSelect() {
  const { t } = useTranslation();
  const { operators } = useSettingsStore();
  const { selectedOperator, setSelectedOperator } = useChatStore();
  const { isFavorite, toggleFavorite } = useFavoriteModels();
  const { matchesFilters, hasActiveFilters } = useModelFiltersStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);

  const configuredOperators = operators.filter(op => op.selectedModel && op.models && op.models.length > 0);

  if (configuredOperators.length === 0) {
    return null;
  }

  const currentValue = selectedOperator 
    ? `${selectedOperator.operator}::${selectedOperator.selectedModel}`
    : '';

  const currentModel = selectedOperator?.models?.find(m => m.id === selectedOperator.selectedModel);
  
  // Мемоизируем getModelInfo для избежания множественных вызовов
  const modelInfo = useMemo(() => {
    if (!currentModel || !selectedOperator) return null;
    return getModelInfo(currentModel.id, selectedOperator.operator);
  }, [currentModel?.id, selectedOperator?.operator]);

  // Format context length
  const formatContextLength = (length: number) => {
    if (length >= 1000000) {
      return `${(length / 1000000).toFixed(1)}M`;
    } else if (length >= 1000) {
      return `${(length / 1000).toFixed(0)}K`;
    }
    return length.toString();
  };

  // Format price per 1M tokens
  const formatPrice = (priceStr: string) => {
    const price = parseFloat(priceStr);
    if (isNaN(price)) return null;
    return `$${(price * 1000000).toFixed(2)}`;
  };

  // Custom filter function - search by word start + advanced filters
  const filterModels = useCallback((model: any, operator: string) => {
    console.log(`[ModelSelect] 🔍 filterModels called for ${model.name} (${operator})`);
    console.log('[ModelSelect] 📋 matchesFilters function:', matchesFilters);
    
    // Apply advanced filters first
    const matchesAdvanced = matchesFilters(model, operator as AIOperator);
    console.log(`[ModelSelect] ${matchesAdvanced ? '✅' : '❌'} Advanced filter result for ${model.name}:`, matchesAdvanced);
    
    if (!matchesAdvanced) {
      return false;
    }
    
    // Then apply search query
    if (!searchQuery) {
      console.log(`[ModelSelect] ✅ ${model.name}: No search query, passes`);
      return true;
    }
    
    const query = searchQuery.toLowerCase();
    const modelName = model.name.toLowerCase();
    const modelId = model.id.toLowerCase();
    const operatorName = operator.toLowerCase();
    
    // Split search query and model name into words
    const queryWords = query.split(/[\s-]+/);
    const modelWords = modelName.split(/[\s-]+/);
    const idWords = modelId.split(/[\s-]+/);
    
    // Check if any query word matches the start of any model word
    const matchesSearch = queryWords.every((queryWord: string) => 
      modelWords.some((modelWord: string) => modelWord.startsWith(queryWord)) ||
      idWords.some((idWord: string) => idWord.startsWith(queryWord)) ||
      operatorName.includes(queryWord)
    );
    
    console.log(`[ModelSelect] ${matchesSearch ? '✅' : '❌'} Search filter result for ${model.name}:`, matchesSearch);
    return matchesSearch;
  }, [matchesFilters, searchQuery]);

  // Build favorites group - memoized to prevent recalculation on every render
  const favoriteModels = useMemo(() => {
    console.log('[ModelSelect] 🔄 Recalculating favoriteModels with filterModels:', filterModels);
    const favorites: Array<{ operator: AIOperator; model: any; config: AIOperatorConfig }> = [];
    configuredOperators.forEach(config => {
      config.models?.forEach(model => {
        if (isFavorite(config.operator, model.id) && filterModels(model, config.operator)) {
          favorites.push({ operator: config.operator, model, config });
        }
      });
    });
    console.log('[ModelSelect] ✨ favoriteModels result:', favorites.length, 'models');
    return favorites;
  }, [configuredOperators, isFavorite, filterModels]);

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                role="combobox"
                aria-expanded={open}
              >
                {selectedOperator && (
                  <img 
                    src={getOperatorIcon(selectedOperator.operator)}
                    alt={selectedOperator.operator}
                    className="w-5 h-5"
                  />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="top">
            {currentModel && modelInfo ? (
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold">{currentModel.name}</div>
                
                {modelInfo.context_length && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-muted-foreground">▪</span>
                    <span>
                      <span className="text-muted-foreground">{t('modelContext')}:</span>{' '}
                      {formatContextLength(modelInfo.context_length)}
                    </span>
                  </div>
                )}
                
                {modelInfo.architecture?.input_modalities && modelInfo.architecture.input_modalities.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-muted-foreground">▪</span>
                    <span>
                      <span className="text-muted-foreground">{t('modelInputModalities')}:</span>{' '}
                      {modelInfo.architecture.input_modalities.join(', ')}
                    </span>
                  </div>
                )}
                
                {modelInfo.architecture?.output_modalities && modelInfo.architecture.output_modalities.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-muted-foreground">▪</span>
                    <span>
                      <span className="text-muted-foreground">{t('modelOutputModalities')}:</span>{' '}
                      {modelInfo.architecture.output_modalities.join(', ')}
                    </span>
                  </div>
                )}
                
                {modelInfo.pricing?.prompt && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-muted-foreground">▪</span>
                    <span>
                      <span className="text-muted-foreground">{t('modelPrice')}:</span>{' '}
                      {formatPrice(modelInfo.pricing.prompt)} / 1M
                    </span>
                  </div>
                )}
                
                {/* Show image generation settings button if model supports image output */}
                {modelInfo.architecture?.output_modalities?.includes('image') && selectedOperator && (
                  <div className="pt-2 mt-2 border-t border-border">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsDialogOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      <Settings className="w-3 h-3" />
                      <span>{t('imageGenerationSettingsButton')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>{currentModel ? currentModel.name : 'Select model'}</div>
            )}
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-[300px] p-0" align="end">
          <Command shouldFilter={false}>
            <div className="relative">
              <CommandInput 
                placeholder={t('searchModel')}
                className="h-9 pr-10"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  setFiltersDialogOpen(true);
                }}
              >
                <Settings2 className="h-4 w-4" />
                {hasActiveFilters() && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </div>
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
                          setSelectedOperator({
                            ...config,
                            selectedModel: model.id
                          });
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
                          setSelectedOperator({
                            ...config,
                            selectedModel: model.id
                          });
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
      
      {/* Image Generation Settings Dialog */}
      {selectedOperator && (
        <ImageGenerationSettingsDialog
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
          operator={selectedOperator.operator}
        />
      )}
      
      {/* Model Filters Dialog */}
      <ModelFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        operators={configuredOperators}
        onSelectModel={(operator, modelId) => {
          setSelectedOperator({
            ...operator,
            selectedModel: modelId
          });
        }}
      />
    </TooltipProvider>
  );
}
