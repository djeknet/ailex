import { useTranslation } from '@shared/i18n/useTranslation';
import { OpenRouterWebSearchSettings } from '@shared/types/ai';
import { Label } from '@/ui/components/ui/label';
import { Input } from '@/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

interface OpenRouterSearchSettingsProps {
  settings: OpenRouterWebSearchSettings;
  onChange: (settings: OpenRouterWebSearchSettings) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function OpenRouterSearchSettings({
  settings,
  onChange,
  onKeyDown
}: OpenRouterSearchSettingsProps) {
  const { t } = useTranslation();

  // Safety check
  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-3" onKeyDown={onKeyDown}>
      {/* Search Engine Selection */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">{t('searchEngine')}</Label>
        <Select
          value={settings.engine}
          onValueChange={(value: 'native' | 'exa' | 'auto') =>
            onChange({ ...settings, engine: value })
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t('engineAuto')}</SelectItem>
            <SelectItem value="native">{t('engineNative')}</SelectItem>
            <SelectItem value="exa">{t('engineExa')}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('searchEngineDescription')}</p>
      </div>

      {/* Max Results */}
      <div className="space-y-1.5">
        <Label className="text-sm">{t('maxSearchResults')}</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={settings.maxResults}
          onChange={(e) =>
            onChange({
              ...settings,
              maxResults: Math.max(1, Math.min(10, parseInt(e.target.value) || 5))
            })
          }
          className="h-7 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
        <p className="text-xs text-muted-foreground">{t('maxSearchResultsDescription')}</p>
      </div>

      {/* Search Context Size (only for native engine) */}
      {settings.engine === 'native' && (
        <div className="space-y-1.5">
          <Label className="text-sm">{t('searchContextSize')}</Label>
          <Select
            value={settings.searchContextSize}
            onValueChange={(value: 'low' | 'medium' | 'high') =>
              onChange({ ...settings, searchContextSize: value })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t('contextSizeLow')}</SelectItem>
              <SelectItem value="medium">{t('contextSizeMedium')}</SelectItem>
              <SelectItem value="high">{t('contextSizeHigh')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('searchContextSizeDescription')}</p>
        </div>
      )}

      {/* Search Prompt */}
      <div className="space-y-1.5">
        <Label className="text-sm">{t('searchPrompt')}</Label>
        <Input
          type="text"
          value={settings.searchPrompt}
          onChange={(e) => onChange({ ...settings, searchPrompt: e.target.value })}
          className="h-7 text-sm"
          placeholder={t('searchPromptPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
        <p className="text-xs text-muted-foreground">{t('searchPromptDescription')}</p>
      </div>

      {/* Cost Information */}
      <div className="mt-4 p-3 bg-muted/50 rounded-md space-y-1">
        <p className="text-xs font-semibold">{t('costInformation')}:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5 ml-3">
          <li>• <strong>Exa:</strong> ~$0.012 {t('perRequest')}</li>
          <li>• <strong>Native (low):</strong> ~$0.025 {t('perRequest')}</li>
          <li>• <strong>Native (medium):</strong> ~$0.035 {t('perRequest')}</li>
          <li>• <strong>Native (high):</strong> ~$0.05 {t('perRequest')}</li>
        </ul>
      </div>
    </div>
  );
}

