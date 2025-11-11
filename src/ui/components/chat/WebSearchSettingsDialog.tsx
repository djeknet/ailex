import { useState, useEffect } from 'react';
import { useWebSearchStore } from '@shared/stores/webSearchStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { AIOperator, ClaudeWebSearchSettings, OpenAIWebSearchSettings, GrokWebSearchSettings, OpenRouterWebSearchSettings } from '@shared/types/ai';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Button } from '@/ui/components/ui/button';
import ClaudeSearchSettings from './search-settings/ClaudeSearchSettings';
import OpenAISearchSettings from './search-settings/OpenAISearchSettings';
import GrokSearchSettings from './search-settings/GrokSearchSettings';
import GeminiSearchSettings from './search-settings/GeminiSearchSettings';
import OpenRouterSearchSettings from './search-settings/OpenRouterSearchSettings';

interface WebSearchSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: AIOperator;
}

export default function WebSearchSettingsDialog({
  open,
  onOpenChange,
  operator
}: WebSearchSettingsDialogProps) {
  const { t } = useTranslation();
  const { getSettings, updateSettings } = useWebSearchStore();
  
  const [localSettings, setLocalSettings] = useState(getSettings(operator));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Update settings when operator changes
    setLocalSettings(getSettings(operator));
    if (open) {
      setHasError(false);
    }
  }, [operator, getSettings, open]);

  // Auto-save on changes
  useEffect(() => {
    if (open && !hasError && localSettings) {
      updateSettings(operator, localSettings);
    }
  }, [localSettings, operator, updateSettings, open, hasError]);

  // Validate settings based on operator
  useEffect(() => {
    if (!localSettings) return;
    
    if (operator === 'anthropic') {
      const claudeSettings = localSettings as ClaudeWebSearchSettings;
      const bothDomainLists = 
        claudeSettings?.allowedDomains?.length > 0 && 
        claudeSettings?.blockedDomains?.length > 0;
      setHasError(bothDomainLists);
    } else if (operator === 'grok') {
      const grokSettings = localSettings as GrokWebSearchSettings;
      const webError = (grokSettings?.webSearchAllowedDomains?.length || 0) > 0 && (grokSettings?.webSearchExcludedDomains?.length || 0) > 0;
      const xError = (grokSettings?.xSearchAllowedHandles?.length || 0) > 0 && (grokSettings?.xSearchExcludedHandles?.length || 0) > 0;
      setHasError(webError || xError);
    }
  }, [localSettings, operator]);

  const handleClose = () => {
    onOpenChange(false);
  };

  // Prevent form submission on Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const renderSettingsContent = () => {
    // Safety check: if settings not loaded yet, return null
    if (!localSettings) {
      return null;
    }

    switch (operator) {
      case 'anthropic':
        return (
          <ClaudeSearchSettings
            settings={localSettings as ClaudeWebSearchSettings}
            onChange={setLocalSettings}
            hasError={hasError}
            onKeyDown={handleKeyDown}
          />
        );
      
      case 'openai':
        return (
          <OpenAISearchSettings
            settings={localSettings as OpenAIWebSearchSettings}
            onChange={setLocalSettings}
            onKeyDown={handleKeyDown}
          />
        );
      
      case 'grok':
        const grokSettings = localSettings as GrokWebSearchSettings;
        return (
          <GrokSearchSettings
            settings={grokSettings}
            onChange={setLocalSettings}
            webHasError={(grokSettings?.webSearchAllowedDomains?.length || 0) > 0 && (grokSettings?.webSearchExcludedDomains?.length || 0) > 0}
            xHasError={(grokSettings?.xSearchAllowedHandles?.length || 0) > 0 && (grokSettings?.xSearchExcludedHandles?.length || 0) > 0}
            onKeyDown={handleKeyDown}
          />
        );
      
      case 'gemini':
        return (
          <GeminiSearchSettings
            onKeyDown={handleKeyDown}
          />
        );
      
      case 'openrouter':
        return (
          <OpenRouterSearchSettings
            settings={localSettings as OpenRouterWebSearchSettings}
            onChange={setLocalSettings}
            onKeyDown={handleKeyDown}
          />
        );
      
      case 'lmstudio':
        return (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              {t('webSearchNotAvailableForOperator')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              LM Studio is a local server and does not support web search.
            </p>
          </div>
        );
      
      default:
        return (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              {t('webSearchNotAvailableForOperator')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('comingSoon')}
            </p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-lg max-h-[85vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-base">{t('webSearchSettings')}</DialogTitle>
          <DialogDescription className="text-sm">
            {t('webSearchSettingsDescription')} {operator.toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()}>
          {renderSettingsContent()}

          <div className="flex justify-end gap-2 mt-3">
            <Button
              variant="outline"
              onClick={handleClose}
              size="sm"
              type="button"
            >
              {t('close')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
