import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useChatStore } from '@shared/stores/chatStore';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { Button } from '@/ui/components/ui/button';
import { Badge } from '@/ui/components/ui/badge';
import { Input } from '@/ui/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/components/ui/tooltip';
import { MessageSquarePlus, History, CircleDollarSign, Expand } from 'lucide-react';
import ChatHistoryPanel from './ChatHistoryPanel';

export default function ChatHeader() {
  const { t } = useTranslation();
  const { createNewChat, currentChat, messages, updateChatTitle } = useChatStore();
  const { setActiveView, setHistoryInitialTab } = useSettingsStore();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNewChat = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const site = tab.url ? new URL(tab.url).hostname : 'unknown';
    await createNewChat(site);
  };

  const handleExpandToFullscreen = async () => {
    if (currentChat) {
      const url = chrome.runtime.getURL(`src/ui/fullscreen/index.html?chatId=${currentChat.id}`);
      await chrome.tabs.create({ url });
      // Закрыть сайдпанель
      window.close();
    }
  };

  // Handle title editing
  const handleTitleClick = () => {
    if (currentChat) {
      setEditedTitle(currentChat.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = async () => {
    if (currentChat && editedTitle.trim() && editedTitle !== currentChat.title) {
      await updateChatTitle(currentChat.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleBlur = () => {
    handleSaveTitle();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  // Auto focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  // Handle statistics navigation
  const handleOpenStatistics = () => {
    setHistoryInitialTab('statistics');
    setActiveView('history');
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
          {isEditingTitle ? (
            <Input
              ref={inputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="h-7 text-lg font-semibold"
            />
          ) : (
            <h1 
              className="text-lg font-semibold truncate cursor-pointer hover:text-primary transition-colors" 
              onClick={handleTitleClick}
              title={t('clickToEdit')}
            >
              {currentChat?.title || t('chat')}
            </h1>
          )}
          {totalTokens > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-pointer flex-shrink-0" onClick={handleOpenStatistics}>
                    <Badge variant="secondary" className="gap-1">
                      <CircleDollarSign className="h-3 w-3" />
                      {formatTokens(totalTokens)}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{t('usedTokens')}. {t('clickToViewStats')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExpandToFullscreen}
                >
                  <Expand className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('expandChat')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('chatHistory')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewChat}
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('newChat')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <ChatHistoryPanel open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}

