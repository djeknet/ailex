import { useSettingsStore } from '@shared/stores/settingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Label } from '@/ui/components/ui/label';
import { Input } from '@/ui/components/ui/input';
import { Textarea } from '@/ui/components/ui/textarea';
import { PersonalInfo } from '@shared/types/extension';
import { encryptApiKey, decryptApiKey } from '@shared/utils/encryption';
import { useState, useEffect } from 'react';
import { Lock, User, MapPin, Briefcase, Share2 } from 'lucide-react';

export default function PersonalInfoTab() {
  const { t } = useTranslation();
  const { personalInfo, updatePersonalInfo } = useSettingsStore();
  const [decryptedData, setDecryptedData] = useState<Record<string, string>>({});

  // Decrypt sensitive fields on mount
  useEffect(() => {
    const decryptFields = async () => {
      if (!personalInfo) return;
      
      const decrypted: Record<string, string> = {};
      const sensitiveFields = ['dateOfBirth', 'idNumber', 'driverLicense', 'healthInsurance'];
      
      for (const field of sensitiveFields) {
        const value = personalInfo[field as keyof PersonalInfo];
        if (value) {
          decrypted[field] = await decryptApiKey(value);
        }
      }
      
      setDecryptedData(decrypted);
    };
    
    decryptFields();
  }, [personalInfo]);

  const handleChange = (field: keyof PersonalInfo, value: string) => {
    updatePersonalInfo({
      ...personalInfo,
      [field]: value
    });
  };

  const handleSensitiveChange = async (field: keyof PersonalInfo, value: string) => {
    // Update decrypted state immediately for UI
    setDecryptedData(prev => ({ ...prev, [field]: value }));
    
    // Encrypt and save
    const encrypted = await encryptApiKey(value);
    updatePersonalInfo({
      ...personalInfo,
      [field]: encrypted
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('personalInfoDescription')}
      </p>

      {/* Basic Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">{t('personalInfo')}</h3>
        </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label>{t('firstName')}</Label>
          <Input
            value={personalInfo?.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder={t('firstNamePlaceholder')}
          />
        </div>

        <div className="space-y-2">
            <Label>{t('lastName')}</Label>
          <Input
            value={personalInfo?.lastName || ''}
            onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder={t('lastNamePlaceholder')}
          />
        </div>
      </div>

      <div className="space-y-2">
          <Label>{t('email')}</Label>
        <Input
          type="email"
          value={personalInfo?.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
            placeholder={t('emailPlaceholder')}
        />
      </div>

      <div className="space-y-2">
          <Label>{t('phone')}</Label>
        <Input
          type="tel"
          value={personalInfo?.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
            placeholder={t('phonePlaceholder')}
        />
      </div>
      </div>

      {/* Location */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">{t('address')}</h3>
        </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label>{t('country')}</Label>
          <Input
            value={personalInfo?.country || ''}
            onChange={(e) => handleChange('country', e.target.value)}
              placeholder={t('countryPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('state')}</Label>
            <Input
              value={personalInfo?.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder={t('statePlaceholder')}
          />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('city')}</Label>
          <Input
            value={personalInfo?.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder={t('cityPlaceholder')}
          />
      </div>

      <div className="space-y-2">
          <Label>{t('address')}</Label>
        <Input
          value={personalInfo?.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
            placeholder={t('addressPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('addressLine2')}</Label>
          <Input
            value={personalInfo?.addressLine2 || ''}
            onChange={(e) => handleChange('addressLine2', e.target.value)}
            placeholder={t('addressLine2Placeholder')}
        />
      </div>

      <div className="space-y-2">
          <Label>{t('zipCode')}</Label>
        <Input
          value={personalInfo?.zipCode || ''}
          onChange={(e) => handleChange('zipCode', e.target.value)}
            placeholder={t('zipCodePlaceholder')}
        />
        </div>
      </div>

      {/* Professional Information */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">{t('professionalInfo')}</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
            <Label>{t('position')}</Label>
        <Input
          value={personalInfo?.position || ''}
          onChange={(e) => handleChange('position', e.target.value)}
              placeholder={t('positionPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('company')}</Label>
            <Input
              value={personalInfo?.company || ''}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder={t('companyPlaceholder')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('workPhone')}</Label>
          <Input
            type="tel"
            value={personalInfo?.workPhone || ''}
            onChange={(e) => handleChange('workPhone', e.target.value)}
            placeholder={t('workPhonePlaceholder')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('linkedin')}</Label>
            <Input
              value={personalInfo?.linkedin || ''}
              onChange={(e) => handleChange('linkedin', e.target.value)}
              placeholder={t('linkedinPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('github')}</Label>
            <Input
              value={personalInfo?.github || ''}
              onChange={(e) => handleChange('github', e.target.value)}
              placeholder={t('githubPlaceholder')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('portfolio')}</Label>
            <Input
              value={personalInfo?.portfolio || ''}
              onChange={(e) => handleChange('portfolio', e.target.value)}
              placeholder={t('portfolioPlaceholder')}
        />
      </div>

      <div className="space-y-2">
            <Label>{t('resumeUrl')}</Label>
            <Input
              value={personalInfo?.resumeUrl || ''}
              onChange={(e) => handleChange('resumeUrl', e.target.value)}
              placeholder={t('resumeUrlPlaceholder')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('orcid')}</Label>
          <Input
            value={personalInfo?.orcid || ''}
            onChange={(e) => handleChange('orcid', e.target.value)}
            placeholder={t('orcidPlaceholder')}
          />
        </div>
      </div>

      {/* Social Networks */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">{t('socialNetworks')}</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('telegram')}</Label>
            <Input
              value={personalInfo?.telegram || ''}
              onChange={(e) => handleChange('telegram', e.target.value)}
              placeholder={t('telegramPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('twitter')}</Label>
            <Input
              value={personalInfo?.twitter || ''}
              onChange={(e) => handleChange('twitter', e.target.value)}
              placeholder={t('twitterPlaceholder')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('facebook')}</Label>
            <Input
              value={personalInfo?.facebook || ''}
              onChange={(e) => handleChange('facebook', e.target.value)}
              placeholder={t('facebookPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('instagram')}</Label>
            <Input
              value={personalInfo?.instagram || ''}
              onChange={(e) => handleChange('instagram', e.target.value)}
              placeholder={t('instagramPlaceholder')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('youtube')}</Label>
            <Input
              value={personalInfo?.youtube || ''}
              onChange={(e) => handleChange('youtube', e.target.value)}
              placeholder={t('youtubePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('tiktok')}</Label>
            <Input
              value={personalInfo?.tiktok || ''}
              onChange={(e) => handleChange('tiktok', e.target.value)}
              placeholder={t('tiktokPlaceholder')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('website')}</Label>
          <Input
            value={personalInfo?.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder={t('websitePlaceholder')}
          />
        </div>
      </div>

      {/* About */}
      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label>{t('about')}</Label>
        <Textarea
          value={personalInfo?.about || ''}
          onChange={(e) => handleChange('about', e.target.value)}
            placeholder={t('aboutPlaceholder')}
          rows={4}
        />
        </div>
      </div>

      {/* Sensitive Data (Encrypted) */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">{t('sensitiveData')}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('sensitiveDataWarning')}
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('dateOfBirth')}</Label>
            <Input
              type="text"
              value={decryptedData.dateOfBirth || ''}
              onChange={(e) => handleSensitiveChange('dateOfBirth', e.target.value)}
              placeholder={t('dateOfBirthPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('idNumber')}</Label>
            <Input
              type="password"
              value={decryptedData.idNumber || ''}
              onChange={(e) => handleSensitiveChange('idNumber', e.target.value)}
              placeholder={t('idNumberPlaceholder')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('driverLicense')}</Label>
            <Input
              type="password"
              value={decryptedData.driverLicense || ''}
              onChange={(e) => handleSensitiveChange('driverLicense', e.target.value)}
              placeholder={t('driverLicensePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('healthInsurance')}</Label>
            <Input
              type="password"
              value={decryptedData.healthInsurance || ''}
              onChange={(e) => handleSensitiveChange('healthInsurance', e.target.value)}
              placeholder={t('healthInsurancePlaceholder')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

