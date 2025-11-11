import { useTranslation } from '@shared/i18n/useTranslation';
import { ClaudeWebSearchSettings } from '@shared/types/ai';
import { Label } from '@/ui/components/ui/label';
import { Input } from '@/ui/components/ui/input';
import { TagInput } from '@/ui/components/ui/tag-input';
import { Separator } from '@/ui/components/ui/separator';
import { AlertCircle } from 'lucide-react';

interface ClaudeSearchSettingsProps {
  settings: ClaudeWebSearchSettings;
  onChange: (settings: ClaudeWebSearchSettings) => void;
  hasError: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function ClaudeSearchSettings({
  settings,
  onChange,
  hasError,
  onKeyDown
}: ClaudeSearchSettingsProps) {
  const { t } = useTranslation();

  // Safety check
  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-3" onKeyDown={onKeyDown}>
      <div className="space-y-1.5">
        <Label htmlFor="maxUses" className="text-sm">
          {t('maxSearchQueries')}
        </Label>
        <Input
          id="maxUses"
          type="number"
          min={1}
          max={10}
          value={settings.maxUses}
          onChange={(e) => onChange({
            ...settings,
            maxUses: parseInt(e.target.value) || 5
          })}
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          {t('maxSearchQueriesDescription')}
        </p>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="allowedDomains" className="text-sm">
          {t('allowedDomains')}
        </Label>
        <TagInput
          tags={settings.allowedDomains}
          onChange={(tags) => onChange({
            ...settings,
            allowedDomains: tags
          })}
          placeholder="wikipedia.org, example.com"
          disabled={settings.blockedDomains.length > 0}
          className="min-h-[36px]"
        />
        <p className="text-xs text-muted-foreground">
          {t('allowedDomainsDescription')}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="blockedDomains" className="text-sm">
          {t('blockedDomains')}
        </Label>
        <TagInput
          tags={settings.blockedDomains}
          onChange={(tags) => onChange({
            ...settings,
            blockedDomains: tags
          })}
          placeholder="unreliable.com"
          disabled={settings.allowedDomains.length > 0}
          className="min-h-[36px]"
        />
        <p className="text-xs text-muted-foreground">
          {t('blockedDomainsDescription')}
        </p>
      </div>

      {hasError && (
        <div className="flex items-center gap-2 p-2 border border-destructive/50 bg-destructive/10 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-xs text-destructive">
            {t('cannotUseBothDomainLists')}
          </p>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm">{t('location')}</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="city" className="text-xs text-muted-foreground">
              {t('city')}
            </Label>
            <Input
              id="city"
              placeholder="New York"
              value={settings.location?.city || ''}
              onChange={(e) => onChange({
                ...settings,
                location: {
                  city: e.target.value,
                  region: settings.location?.region || '',
                  country: settings.location?.country || '',
                  timezone: settings.location?.timezone || ''
                }
              })}
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="region" className="text-xs text-muted-foreground">
              {t('region')}
            </Label>
            <Input
              id="region"
              placeholder="New York"
              value={settings.location?.region || ''}
              onChange={(e) => onChange({
                ...settings,
                location: {
                  city: settings.location?.city || '',
                  region: e.target.value,
                  country: settings.location?.country || '',
                  timezone: settings.location?.timezone || ''
                }
              })}
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="country" className="text-xs text-muted-foreground">
              {t('country')}
            </Label>
            <Input
              id="country"
              placeholder="US"
              value={settings.location?.country || ''}
              onChange={(e) => onChange({
                ...settings,
                location: {
                  city: settings.location?.city || '',
                  region: settings.location?.region || '',
                  country: e.target.value,
                  timezone: settings.location?.timezone || ''
                }
              })}
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="timezone" className="text-xs text-muted-foreground">
              {t('timezone')}
            </Label>
            <Input
              id="timezone"
              placeholder="America/New_York"
              value={settings.location?.timezone || ''}
              onChange={(e) => onChange({
                ...settings,
                location: {
                  city: settings.location?.city || '',
                  region: settings.location?.region || '',
                  country: settings.location?.country || '',
                  timezone: e.target.value
                }
              })}
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('locationDescription')}
        </p>
      </div>
    </div>
  );
}

