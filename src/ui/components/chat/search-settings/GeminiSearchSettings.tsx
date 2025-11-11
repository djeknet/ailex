import { useTranslation } from '@shared/i18n/useTranslation';
import { useWebSearchStore } from '@shared/stores/webSearchStore';
import { Label } from '@/ui/components/ui/label';
import { Button } from '@/ui/components/ui/button';

interface GeminiSearchSettingsProps {
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function GeminiSearchSettings({ onKeyDown }: GeminiSearchSettingsProps) {
  const { t } = useTranslation();
  const { citationMode, setCitationMode } = useWebSearchStore();

  return (
    <div className="space-y-3" onKeyDown={onKeyDown}>
      {/* Citation Display Mode - специфично для Gemini */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">{t('citationDisplayMode')}</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {t('geminiCitationModeDescription')}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={citationMode === 'end' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCitationMode('end')}
            className="flex-1"
          >
            {t('citationsAtEnd')}
          </Button>
          <Button
            type="button"
            variant={citationMode === 'inline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCitationMode('inline')}
            className="flex-1"
          >
            {t('citationsInline')}
          </Button>
          <Button
            type="button"
            variant={citationMode === 'both' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCitationMode('both')}
            className="flex-1"
          >
            {t('citationsBoth')}
          </Button>
        </div>
        
        {/* Описание режимов */}
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p><strong>{t('citationsAtEnd')}:</strong> {t('citationsAtEndDescription')}</p>
          <p><strong>{t('citationsInline')}:</strong> {t('citationsInlineDescription')}</p>
          <p><strong>{t('citationsBoth')}:</strong> {t('citationsBothDescription')}</p>
        </div>
      </div>

      {/* Информация о Google Search */}
      <div className="mt-4 p-3 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">
          <strong>{t('note')}:</strong> {t('geminiWebSearchNote')}
        </p>
      </div>
    </div>
  );
}

