import { useTranslation } from '@shared/i18n/useTranslation';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { Bot, SlidersHorizontal, UserCircle, ScrollText } from 'lucide-react';
import OperatorsTab from '../components/settings/OperatorsTab';
import GeneralTab from '../components/settings/GeneralTab';
import PersonalInfoTab from '../components/settings/PersonalInfoTab';
import InstructionsTab from '../components/settings/InstructionsTab';

export default function Settings() {
  const { t } = useTranslation();
  const { activeSettingsTab, setActiveSettingsTab } = useSettingsStore();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">{t('settings')}</h1>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <Tabs value={activeSettingsTab} onValueChange={(value) => setActiveSettingsTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="operators" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              {t('operators')}
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              {t('general')}
            </TabsTrigger>
            <TabsTrigger value="personalInfo" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              {t('personalInfo')}
            </TabsTrigger>
            <TabsTrigger value="instructions" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              {t('instructions')}
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
