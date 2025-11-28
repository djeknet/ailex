import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { TooltipProvider } from '@/ui/components/ui/tooltip';
import { Button } from '@/ui/components/ui/button';
import { useTranslation } from '@shared/i18n/useTranslation';
import { ArrowLeft } from 'lucide-react';
import ChatsTab from '@/ui/components/history/ChatsTab';
import StatisticsTab from '@/ui/components/history/StatisticsTab';

interface HistoryProps {
  onBack?: () => void;
  initialTab?: 'chats' | 'statistics';
}

export default function History({ onBack, initialTab }: HistoryProps = {}) {
  const { t } = useTranslation();
  
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {onBack && (
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t('history')}</h1>
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
          </div>
        )}
        <Tabs defaultValue={initialTab || "chats"} className="flex-1 flex flex-col overflow-hidden">
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

