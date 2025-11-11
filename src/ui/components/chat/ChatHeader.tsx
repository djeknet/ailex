import { useState, useMemo } from 'react';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useChatStore } from '@shared/stores/chatStore';
import { Button } from '@/ui/components/ui/button';
import { Badge } from '@/ui/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/components/ui/tooltip';
import { MessageSquarePlus, History, CircleDollarSign } from 'lucide-react';
import ChatHistoryPanel from './ChatHistoryPanel';

export default function ChatHeader() {
  const { t } = useTranslation();
  const { createNewChat, currentChat, messages } = useChatStore();
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleNewChat = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const site = tab.url ? new URL(tab.url).hostname : 'unknown';
    await createNewChat(site);
  };

  // Calculate total tokens for current chat
  const totalTokens = useMemo(() => {
    return messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
  }, [messages]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <>
      <header className="border-b p-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h1 className="text-lg font-semibold truncate">
            {currentChat?.title || t('chat')}
          </h1>
          {totalTokens > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help flex-shrink-0">
                    <Badge variant="secondary" className="gap-1">
                      <CircleDollarSign className="h-3 w-3" />
                      {formatTokens(totalTokens)}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{t('usedTokens')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(true)}
            title={t('chatHistory')}
          >
            <History className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            title={t('newChat')}
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <ChatHistoryPanel open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}

