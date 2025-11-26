import { useTranslation } from '@shared/i18n/useTranslation';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { Button } from '@/ui/components/ui/button';
import { Bot, SlidersHorizontal, UserCircle, ScrollText, ArrowLeft } from 'lucide-react';
import OperatorsTab from '../components/settings/OperatorsTab';
import GeneralTab from '../components/settings/GeneralTab';
import PersonalInfoTab from '../components/settings/PersonalInfoTab';
import InstructionsTab from '../components/settings/InstructionsTab';

interface SettingsProps {
  onBack?: () => void;
}

export default function Settings({ onBack }: SettingsProps = {}) {
  const { t } = useTranslation();
  const { activeSettingsTab, setActiveSettingsTab } = useSettingsStore();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('settings')}</h1>
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <Tabs value={activeSettingsTab} onValueChange={(value) => setActiveSettingsTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="operators" className="flex items-center gap-2" title={t('operators')}>
              <Bot className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('operators')}</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2" title={t('general')}>
              <SlidersHorizontal className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('general')}</span>
            </TabsTrigger>
            <TabsTrigger value="personalInfo" className="flex items-center gap-2" title={t('personalInfo')}>
              <UserCircle className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('personalInfo')}</span>
            </TabsTrigger>
            <TabsTrigger value="instructions" className="flex items-center gap-2" title={t('instructions')}>
              <ScrollText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('instructions')}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="operators" className="mt-4">
            <OperatorsTab />
          </TabsContent>
          
          <TabsContent value="general" className="mt-4">
            <GeneralTab />
          </TabsContent>
          
          <TabsContent value="personalInfo" className="mt-4">
            <PersonalInfoTab />
          </TabsContent>

          <TabsContent value="instructions" className="mt-4">
            <InstructionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
