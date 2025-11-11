import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { TooltipProvider } from '@/ui/components/ui/tooltip';
import { useTranslation } from '@shared/i18n/useTranslation';
import ChatsTab from '@/ui/components/history/ChatsTab';
import StatisticsTab from '@/ui/components/history/StatisticsTab';

export default function History() {
  const { t } = useTranslation();
  
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        <Tabs defaultValue="chats" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="chats">{t('chatsTab')}</TabsTrigger>
            <TabsTrigger value="statistics">{t('statisticsTab')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chats" className="flex-1 overflow-hidden mt-0">
            <ChatsTab />
          </TabsContent>
          
          <TabsContent value="statistics" className="flex-1 overflow-hidden mt-0">
            <StatisticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

