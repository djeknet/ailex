import { useEffect, useMemo, useState } from 'react';
import { useChatStore } from '@shared/stores/chatStore';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Chat } from '@shared/types/database';
import { getOperatorIcon } from '@shared/services/aiService';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface ChatWithTokens {
  chat: Chat;
  operators: Set<string>;
  totalTokens: number;
}

export default function ChatsTab() {
  const { chats, loadAllChats, setCurrentChat, loadMessages } = useChatStore();
  const { setActiveView } = useSettingsStore();
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const CHATS_PER_PAGE = 30;
  
  useEffect(() => {
    loadAllChats();
  }, []);
  
  // Группировка всех чатов по дням
  const allGroupedChats = useMemo(() => {
    return groupChatsByDays(chats || [], t);
  }, [chats, t]);
  
  // Получаем все чаты в плоский список для пагинации
  const allChatsFlat = useMemo(() => {
    const flat: ChatWithTokens[] = [];
    Object.entries(allGroupedChats).forEach(([, dayChats]) => {
      flat.push(...dayChats);
    });
    return flat;
  }, [allGroupedChats]);
  
  // Пагинация
  const totalPages = Math.ceil(allChatsFlat.length / CHATS_PER_PAGE);
  const startIndex = (currentPage - 1) * CHATS_PER_PAGE;
  const endIndex = startIndex + CHATS_PER_PAGE;
  const paginatedChats = allChatsFlat.slice(startIndex, endIndex);
  
  // Группируем отпагинированные чаты
  const groupedChats = useMemo(() => {
    const grouped: Record<string, ChatWithTokens[]> = {};
    paginatedChats.forEach(chatData => {
      const dayLabel = getDayLabel(chatData.chat.updatedAt, t);
      if (!grouped[dayLabel]) {
        grouped[dayLabel] = [];
      }
      grouped[dayLabel].push(chatData);
    });
    return grouped;
  }, [paginatedChats, t]);
  
  const handleChatClick = async (chat: Chat) => {
    setCurrentChat(chat);
    await loadMessages(chat.id);
    
    // Открываем сайт чата в текущей вкладке
    if (chat.site && chat.site !== 'unknown') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.update(tab.id, { url: `https://${chat.site}` });
      }
    }
    
    setActiveView('chat');
  };
  
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {Object.entries(groupedChats).map(([dayLabel, dayChats]) => (
          <div key={dayLabel}>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">{dayLabel}</h3>
            <div className="space-y-2">
              {dayChats.map(chatData => (
                <ChatItem 
                  key={chatData.chat.id} 
                  chatData={chatData} 
                  onClick={() => handleChatClick(chatData.chat)}
                />
              ))}
            </div>
          </div>
        ))}
        
        {(!chats || chats.length === 0) && (
          <div className="text-center text-muted-foreground py-8">
            {t('noChatsYet')}
          </div>
        )}
        
        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('previous')}
            </Button>
            
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              {t('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

interface ChatItemProps {
  chatData: ChatWithTokens;
  onClick: () => void;
}

function ChatItem({ chatData, onClick }: ChatItemProps) {
  const { chat, operators, totalTokens } = chatData;
  
  return (
    <div 
      className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 mb-2">
        {/* Левая колонка: заголовок */}
        <div className="overflow-hidden">
          <h4 
            className="text-sm font-medium break-words"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            {chat.title}
          </h4>
        </div>
        
        {/* Правая колонка: сайт и время */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {chat.site && chat.site !== 'unknown' && (
            <Badge 
              variant="outline" 
              className="text-xs flex items-center gap-1 cursor-pointer hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                chrome.tabs.update({ url: `https://${chat.site}` });
              }}
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[100px]">{chat.site}</span>
            </Badge>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(chat.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        {/* Операторы */}
        <div className="flex items-center gap-1 shrink-0">
          {Array.from(operators).map(op => {
            const iconSrc = getOperatorIcon(op as any);
            return <img key={op} src={iconSrc} alt={op} width="16" height="16" />;
          })}
        </div>
        
        {/* Токены */}
        {totalTokens > 0 && (
          <Badge variant="secondary" className="text-xs shrink-0">
            {totalTokens.toLocaleString()} tokens
          </Badge>
        )}
      </div>
    </div>
  );
}

function groupChatsByDays(chats: Chat[], t: (key: string) => string): Record<string, ChatWithTokens[]> {
  const grouped: Record<string, ChatWithTokens[]> = {};
  
  // Сортируем чаты по updatedAt (новые первые)
  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
  
  sortedChats.forEach(chat => {
    const dayLabel = getDayLabel(chat.updatedAt, t);
    if (!grouped[dayLabel]) {
      grouped[dayLabel] = [];
    }
    
    // Для каждого чата получим операторы и токены (упрощенно, без загрузки сообщений)
    grouped[dayLabel].push({
      chat,
      operators: new Set<string>(),
      totalTokens: 0
    });
  });
  
  return grouped;
}

function getDayLabel(timestamp: number, t: (key: string) => string): string {
  const now = new Date();
  const date = new Date(timestamp);
  
  // Сбрасываем время до начала дня для корректного сравнения
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = nowDate.getTime() - chatDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return t('today');
  if (diffDays === 1) return t('yesterday');
  if (diffDays <= 30) {
    const translated = t('daysAgo');
    return translated.replace('{{count}}', diffDays.toString());
  }
  
  // Для старых чатов показываем дату
  return date.toLocaleDateString();
}

