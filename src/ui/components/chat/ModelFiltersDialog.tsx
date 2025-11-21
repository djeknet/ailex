import { useMemo } from 'react';
import { FileText, Image as ImageIcon, Type, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import { Button } from '@/ui/components/ui/button';
import { Slider } from '@/ui/components/ui/slider';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useModelFilters } from '@shared/hooks/useModelFilters';
import { getContextRange } from '@shared/constants';
import { getOperatorIcon, getOperatorName } from '@shared/services/aiService';
import { cn } from '@shared/utils/cn';
import type { AIOperatorConfig, AIOperator } from '@shared/types/ai';

interface ModelFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operators: AIOperatorConfig[];
  onSelectModel: (operator: AIOperatorConfig, modelId: string) => void;
}

export default function ModelFiltersDialog({
  open,
  onOpenChange,
  operators,
  onSelectModel
}: ModelFiltersDialogProps) {
  const { t } = useTranslation();
  const { filters, updateFilters, resetFilters, matchesFilters } = useModelFilters();
  const { min: minContext, max: maxContext } = getContextRange();

  // Format context length
  const formatContextLength = (length: number) => {
    if (length >= 1000000) {
      return `${(length / 1000000).toFixed(1)}M`;
    } else if (length >= 1000) {
      return `${(length / 1000).toFixed(0)}K`;
    }
    return length.toString();
  };

  // Get all unique operators from configured operators
  const availableOperators: AIOperator[] = useMemo(() => {
    const ops = new Set<AIOperator>();
    operators.forEach(op => ops.add(op.operator));
    return Array.from(ops);
  }, [operators]);

  // Toggle modality
  const toggleInputModality = (modality: string) => {
    const current = filters.inputModalities;
    const updated = current.includes(modality)
      ? current.filter(m => m !== modality)
      : [...current, modality];
    updateFilters({ inputModalities: updated });
  };

  const toggleOutputModality = (modality: string) => {
    const current = filters.outputModalities;
    const updated = current.includes(modality)
      ? current.filter(m => m !== modality)
      : [...current, modality];
    updateFilters({ outputModalities: updated });
  };

  const toggleOperator = (operator: AIOperator) => {
    const current = filters.operators;
    const updated = current.includes(operator)
      ? current.filter(op => op !== operator)
      : [...current, operator];
    updateFilters({ operators: updated });
  };

  // Get filtered models
  const filteredModels = useMemo(() => {
    console.log('[ModelFiltersDialog] Recomputing filtered models with filters:', filters);
    const results: Array<{ operator: AIOperatorConfig; model: any }> = [];
    
    operators.forEach(operatorConfig => {
      operatorConfig.models?.forEach(model => {
        if (matchesFilters(model, operatorConfig.operator)) {
          results.push({ operator: operatorConfig, model });
        }
      });
    });
    
    console.log('[ModelFiltersDialog] Total filtered models:', results.length);
    return results;
  }, [operators, filters, matchesFilters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{t('modelFilters')}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-4">
          {/* Context Length Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t('minContext')}</label>
              <span className="text-sm text-muted-foreground">
                {formatContextLength(filters.minContext || minContext)}
              </span>
            </div>
            <Slider
              value={[filters.minContext || minContext]}
              min={minContext}
              max={maxContext}
              step={1000}
              onValueChange={(value: number[]) => updateFilters({ minContext: value[0] })}
              className="w-full"
            />
          </div>

          {/* Input/Output Modalities - Compact Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Input Modalities */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('inputModalities')}</label>
              <div className="flex gap-1">
                <Button
                  variant={filters.inputModalities.includes('text') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleInputModality('text')}
                  className="flex-1 h-9"
                >
                  <Type className="h-4 w-4" />
                </Button>
                <Button
                  variant={filters.inputModalities.includes('image') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleInputModality('image')}
                  className="flex-1 h-9"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={filters.inputModalities.includes('file') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleInputModality('file')}
                  className="flex-1 h-9"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Output Modalities */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('outputModalities')}</label>
              <div className="flex gap-1">
                <Button
                  variant={filters.outputModalities.includes('text') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleOutputModality('text')}
                  className="flex-1 h-9"
                >
                  <Type className="h-4 w-4" />
                </Button>
                <Button
                  variant={filters.outputModalities.includes('image') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleOutputModality('image')}
                  className="flex-1 h-9"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Operators Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('operators')}</label>
            <div className="flex flex-wrap gap-2">
              {availableOperators.map(operator => (
                <Button
                  key={operator}
                  variant={filters.operators.includes(operator) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleOperator(operator)}
                  className="h-9"
                >
                  <img 
                    src={getOperatorIcon(operator)}
                    alt={operator}
                    className="w-4 h-4 mr-2"
                  />
                  {getOperatorName(operator)}
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('resetFilters')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('filteredModels')}: {filteredModels.length}
            </span>
          </div>
        </div>

        {/* Filtered Models List */}
        <div className="border-t">
          <ScrollArea className="h-[400px] px-6 py-4">
            <div className="space-y-1 pr-4">
            {filteredModels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('modelNotFound')}
              </div>
            ) : (
              filteredModels.map(({ operator, model }) => (
                <button
                  key={`${operator.operator}::${model.id}`}
                  onClick={() => {
                    onSelectModel(operator, model.id);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left",
                    "hover:bg-accent transition-colors"
                  )}
                >
                  <img 
                    src={getOperatorIcon(operator.operator)}
                    alt={operator.operator}
                    className="w-4 h-4 flex-shrink-0"
                  />
                  <span className="flex-1 truncate text-sm">{model.name}</span>
                  {model.context_length && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatContextLength(model.context_length)}
                    </span>
                  )}
                </button>
              ))
            )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

