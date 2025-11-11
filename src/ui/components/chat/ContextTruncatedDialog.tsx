import { AlertCircle } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { getModelsWithSufficientContext, getModelContextLimit } from '@shared/constants';
import { useTranslation } from '@shared/i18n/useTranslation';

interface ContextTruncatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalTokenCount: number;
  currentModel: string;
  currentModelLimit: number;
}

export default function ContextTruncatedDialog({
  open,
  onOpenChange,
  originalTokenCount,
  currentModel,
  currentModelLimit,
}: ContextTruncatedDialogProps) {
  const { t } = useTranslation();
  
  // Get models that can handle the full context
  const suggestedModels = getModelsWithSufficientContext(originalTokenCount);
  
  // Filter to show only top models (first 5)
  const topModels = suggestedModels.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            {t('contextTruncatedTitle')}
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>
              {t('contextTruncatedMessage')} 
            </p>
            <p className="text-xs text-muted-foreground">
              Original: ~{originalTokenCount.toLocaleString()} tokens • 
              Model: {currentModel} ({currentModelLimit.toLocaleString()} tokens limit)
            </p>
            
            {topModels.length > 0 && (
              <div className="mt-4">
                <p className="font-medium text-sm text-foreground mb-2">
                  {t('suggestedModelsTitle')}:
                </p>
                <div className="space-y-2">
                  {topModels.map((model) => {
                    const limit = getModelContextLimit(model);
                    if (!limit) return null;
                    
                    return (
                      <div
                        key={model}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                      >
                        <span className="font-mono text-xs">{model}</span>
                        <span className="text-xs text-muted-foreground">
                          {limit.toLocaleString()} {t('tokens')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {t('contextTruncatedHint')}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {t('understood')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

