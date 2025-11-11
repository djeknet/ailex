import { useTranslation } from '@shared/i18n/useTranslation';
import { OpenAIWebSearchSettings } from '@shared/types/ai';
import { Label } from '@/ui/components/ui/label';
import { Input } from '@/ui/components/ui/input';
import { TagInput } from '@/ui/components/ui/tag-input';
import { Separator } from '@/ui/components/ui/separator';
import { Switch } from '@/ui/components/ui/switch';

interface OpenAISearchSettingsProps {
  settings: OpenAIWebSearchSettings;
  onChange: (settings: OpenAIWebSearchSettings) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function OpenAISearchSettings({
  settings,
  onChange,
  onKeyDown
}: OpenAISearchSettingsProps) {
  const { t } = useTranslation();

  // Safety check
  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-3" onKeyDown={onKeyDown}>
      <div className="space-y-1.5">
        <Label htmlFor="allowedDomains" className="text-sm">
          {t('allowedDomains')}
        </Label>
        <TagInput
          tags={settings.allowedDomains || []}
          onChange={(tags) => onChange({
            ...settings,
            allowedDomains: tags.slice(0, 20)
          })}
          placeholder="pubmed.ncbi.nlm.nih.gov, who.int"
          className="min-h-[36px]"
        />
        <p className="text-xs text-muted-foreground">
          {t('allowedDomainsDescriptionOpenAI')} (max 20)
        </p>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="externalWebAccess" className="text-sm">
              {t('liveInternetAccess')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('liveInternetAccessDescription')}
            </p>
          </div>
          <Switch
            id="externalWebAccess"
            checked={settings.externalWebAccess !== false}
            onCheckedChange={(checked: boolean) => onChange({
              ...settings,
              externalWebAccess: checked
            })}
          />
        </div>
      </div>

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
              placeholder="London"
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
              placeholder="London"
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
              {t('country')} (ISO)
            </Label>
            <Input
              id="country"
              placeholder="GB"
              maxLength={2}
              value={settings.location?.country || ''}
              onChange={(e) => onChange({
                ...settings,
                location: {
                  city: settings.location?.city || '',
                  region: settings.location?.region || '',
                  country: e.target.value.toUpperCase(),
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
              {t('timezone')} (IANA)
            </Label>
            <Input
              id="timezone"
              placeholder="Europe/London"
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

