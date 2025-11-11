import { useTranslation } from '@shared/i18n/useTranslation';
import { GrokWebSearchSettings } from '@shared/types/ai';
import { Label } from '@/ui/components/ui/label';
import { Input } from '@/ui/components/ui/input';
import { TagInput } from '@/ui/components/ui/tag-input';
import { Separator } from '@/ui/components/ui/separator';
import { Switch } from '@/ui/components/ui/switch';
import { AlertCircle } from 'lucide-react';

interface GrokSearchSettingsProps {
  settings: GrokWebSearchSettings;
  onChange: (settings: GrokWebSearchSettings) => void;
  webHasError: boolean;
  xHasError: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function GrokSearchSettings({
  settings,
  onChange,
  webHasError,
  xHasError,
  onKeyDown
}: GrokSearchSettingsProps) {
  const { t } = useTranslation();

  // Safety check
  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-3" onKeyDown={onKeyDown}>
      {/* Web Search Section - Always active when web search is enabled */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Web Search</Label>
        
        <div className="space-y-1.5 pl-2">
          <Label className="text-xs">{t('allowedDomains')}</Label>
          <TagInput
            tags={settings.webSearchAllowedDomains || []}
            onChange={(tags) => onChange({
              ...settings,
              webSearchAllowedDomains: tags.slice(0, 5)
            })}
            placeholder="wikipedia.org"
            disabled={(settings.webSearchExcludedDomains?.length || 0) > 0}
            className="min-h-[32px] text-sm"
          />
          <p className="text-xs text-muted-foreground">Max 5 {t('allowedDomains').toLowerCase()}</p>
        </div>

        <div className="space-y-1.5 pl-2">
          <Label className="text-xs">{t('blockedDomains')}</Label>
          <TagInput
            tags={settings.webSearchExcludedDomains || []}
            onChange={(tags) => onChange({
              ...settings,
              webSearchExcludedDomains: tags.slice(0, 5)
            })}
            placeholder="spam.com"
            disabled={(settings.webSearchAllowedDomains?.length || 0) > 0}
            className="min-h-[32px] text-sm"
          />
          <p className="text-xs text-muted-foreground">Max 5 {t('blockedDomains').toLowerCase()}</p>
        </div>

        {webHasError && (
          <div className="flex items-center gap-1 p-1.5 border border-destructive/50 bg-destructive/10 rounded text-xs text-destructive">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {t('cannotUseBothDomainLists')}
          </div>
        )}

        <div className="flex items-center justify-between pl-2">
          <div className="space-y-0.5">
            <Label className="text-xs">{t('imageUnderstanding')}</Label>
            <p className="text-xs text-muted-foreground">{t('webImageUnderstandingDesc')}</p>
          </div>
          <Switch
            checked={settings.webSearchEnableImageUnderstanding}
            onCheckedChange={(checked: boolean) => onChange({
              ...settings,
              webSearchEnableImageUnderstanding: checked
            })}
          />
        </div>
      </div>

      <Separator />

      {/* X Search Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold">X (Twitter) Search</Label>
          </div>
          <Switch
            checked={settings.xSearchEnabled}
            onCheckedChange={(checked: boolean) => onChange({
              ...settings,
              xSearchEnabled: checked
            })}
          />
        </div>

        {settings.xSearchEnabled && (
          <>
            <div className="space-y-1.5 pl-2">
              <Label className="text-xs">{t('allowedHandles')}</Label>
              <TagInput
                tags={settings.xSearchAllowedHandles || []}
                onChange={(tags) => onChange({
                  ...settings,
                  xSearchAllowedHandles: tags.slice(0, 10)
                })}
                placeholder="elonmusk"
                disabled={(settings.xSearchExcludedHandles?.length || 0) > 0}
                className="min-h-[32px] text-sm"
              />
              <p className="text-xs text-muted-foreground">Max 10 handles</p>
            </div>

            <div className="space-y-1.5 pl-2">
              <Label className="text-xs">{t('excludedHandles')}</Label>
              <TagInput
                tags={settings.xSearchExcludedHandles || []}
                onChange={(tags) => onChange({
                  ...settings,
                  xSearchExcludedHandles: tags.slice(0, 10)
                })}
                placeholder="spam_account"
                disabled={(settings.xSearchAllowedHandles?.length || 0) > 0}
                className="min-h-[32px] text-sm"
              />
              <p className="text-xs text-muted-foreground">Max 10 handles</p>
            </div>

            {xHasError && (
              <div className="flex items-center gap-1 p-1.5 border border-destructive/50 bg-destructive/10 rounded text-xs text-destructive">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {t('cannotUseBothHandleLists')}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pl-2">
              <div className="space-y-1">
                <Label className="text-xs">{t('fromDate')}</Label>
                <Input
                  type="date"
                  value={settings.xSearchFromDate || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    xSearchFromDate: e.target.value || undefined
                  })}
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('toDate')}</Label>
                <Input
                  type="date"
                  value={settings.xSearchToDate || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    xSearchToDate: e.target.value || undefined
                  })}
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pl-2">
              <Label className="text-xs">{t('imageUnderstanding')}</Label>
              <Switch
                checked={settings.xSearchEnableImageUnderstanding}
                onCheckedChange={(checked: boolean) => onChange({
                  ...settings,
                  xSearchEnableImageUnderstanding: checked
                })}
              />
            </div>

            <div className="flex items-center justify-between pl-2">
              <Label className="text-xs">{t('videoUnderstanding')}</Label>
              <Switch
                checked={settings.xSearchEnableVideoUnderstanding}
                onCheckedChange={(checked: boolean) => onChange({
                  ...settings,
                  xSearchEnableVideoUnderstanding: checked
                })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

