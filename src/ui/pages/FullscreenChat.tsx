import { useState, useEffect, createContext } from 'react';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useChatStore } from '@shared/stores/chatStore';
import { Button } from '@/ui/components/ui/button';
import { Switch } from '@/ui/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/ui/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Moon, Sun, MoreHorizontal, Trash2, FolderInput, Plus } from 'lucide-react';
import Sidebar from '@/ui/components/fullscreen/Sidebar';
import MessageList from '@/ui/components/chat/MessageList';
import MessageInput from '@/ui/components/chat/MessageInput';
import Settings from './Settings';
import History from './History';
import Help from './Help';
import Tools from './Tools';

// Context для передачи флага fullscreen в дочерние компоненты
export const FullscreenContext = createContext({ isFullscreen: true });

export default function FullscreenChat() {
  const { t } = useTranslation();
  const { theme, setTheme } = useSettingsStore();
  const { 
    currentChat,
    setCurrentChat,
    deleteChat, 
    moveChatToFolder,
    folders,
    loadFolders,
    loadAllChats
  } = useChatStore();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Инициализация: загрузить чат из URL параметра или создать новый
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get('chatId');
        
        console.log('[FullscreenChat] Initializing with chatId:', chatId);
        
        // Инициализировать оператора если не выбран
        const { selectedOperator, setSelectedOperator } = useChatStore.getState();
        const { operators } = useSettingsStore.getState();
        
        if (!selectedOperator && operators.length > 0) {
          const defaultOperator = operators.find(op => op.selectedModel);
          if (defaultOperator) {
            console.log('[FullscreenChat] Initializing default operator:', defaultOperator.operator);
            setSelectedOperator(defaultOperator);
          }
        }
        
        // Загрузить папки и чаты
        await loadFolders();
        await loadAllChats();
        
        if (chatId) {
          // Небольшая задержка, чтобы чаты успели загрузиться в store
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Загрузить существующий чат
          const { loadMessages, setCurrentChat, chats } = useChatStore.getState();
          console.log('[FullscreenChat] Available chats:', chats.length);
          
          const chat = chats.find(c => c.id === chatId);
          if (chat) {
            console.log('[FullscreenChat] Found chat:', chat.title);
            setCurrentChat(chat);
            await loadMessages(chatId);
          } else {
            console.log('[FullscreenChat] Chat not found, showing empty state');
            // Чат не найден, показать пустое состояние
            setCurrentChat(null);
          }
        } else {
          console.log('[FullscreenChat] No chatId, showing empty state');
          // Показать пустое состояние
          setCurrentChat(null);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('[FullscreenChat] Error initializing:', error);
        setInitialized(true);
      }
    };

    initializeChat();
  }, []);

  // Проверка и обработка pending site prompt из виджета
  useEffect(() => {
    const checkPendingSitePrompt = async () => {
      console.log('[FullscreenChat] checkPendingSitePrompt called, initialized:', initialized);
      
      try {
        const result = await chrome.storage.local.get('pendingSitePrompt');
        console.log('[FullscreenChat] Storage check result:', result);
        
        if (result.pendingSitePrompt) {
          console.log('[FullscreenChat] Found pending site prompt:', result.pendingSitePrompt);
          
          const { prompt, sourceTabId, timestamp } = result.pendingSitePrompt;
          
          console.log('[FullscreenChat] Prompt details:', { 
            hasPrompt: !!prompt, 
            sourceTabId, 
            timestamp,
            age: timestamp ? Date.now() - timestamp : 'N/A'
          });
          
          // Проверяем что промпт не старше 10 секунд
          if (timestamp && Date.now() - timestamp < 10000 && prompt && sourceTabId) {
            const { sendSitePromptWithTabId, selectedOperator, currentChat } = useChatStore.getState();
            
            console.log('[FullscreenChat] Selected operator:', selectedOperator?.operator);
            console.log('[FullscreenChat] Current chat:', currentChat?.id);
            
            // Проверяем что оператор выбран
            if (!selectedOperator) {
              console.error('[FullscreenChat] No operator selected, cannot process site prompt');
              await chrome.storage.local.remove('pendingSitePrompt');
              return;
            }
            
            // Создаем чат если его нет
            if (!currentChat) {
              console.log('[FullscreenChat] No current chat, creating new one...');
              
              // Получаем URL исходной страницы
              let site = 'default';
              try {
                const tab = await chrome.tabs.get(sourceTabId);
                if (tab.url) {
                  site = new URL(tab.url).hostname;
                }
              } catch (error) {
                console.warn('[FullscreenChat] Could not get tab URL:', error);
              }
              
              // Всегда создаем новый чат для site prompt из виджета
              const { createNewChat, setCurrentChat } = useChatStore.getState();
              const newChat = await createNewChat(site);
              setCurrentChat(newChat);
              console.log('[FullscreenChat] New chat created:', newChat.id);
            }
            
            console.log('[FullscreenChat] Processing site prompt with tab:', sourceTabId);
            
            // Отправляем промпт с ID исходной вкладки
            await sendSitePromptWithTabId(prompt, sourceTabId);
            
            console.log('[FullscreenChat] Site prompt processed successfully');
          } else {
            console.log('[FullscreenChat] Prompt validation failed:', {
              timestampValid: timestamp && Date.now() - timestamp < 10000,
              hasPrompt: !!prompt,
              hasTabId: !!sourceTabId
            });
          }
          
          // Очищаем pending prompt
          await chrome.storage.local.remove('pendingSitePrompt');
          console.log('[FullscreenChat] Pending prompt cleared');
        } else {
          console.log('[FullscreenChat] No pending site prompt found');
        }
      } catch (error) {
        console.error('[FullscreenChat] Error processing pending site prompt:', error);
      }
    };

    if (initialized) {
      console.log('[FullscreenChat] Initialized, checking pending prompt...');
      checkPendingSitePrompt();
    } else {
      console.log('[FullscreenChat] Not initialized yet, skipping pending prompt check');
    }
  }, [initialized]);

  // Применение темы
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  // Обработчик для открытия всех ссылок в новой вкладке
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href) {
        // Проверяем, что это внешняя ссылка (не якорь)
        if (!link.href.startsWith('#') && !link.href.startsWith('javascript:')) {
          e.preventDefault();
          chrome.tabs.create({ url: link.href });
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleDeleteChat = async () => {
    if (!currentChat) return;
    
    await deleteChat(currentChat.id);
    setDeleteDialogOpen(false);
    
    // Сбросить состояние чата
    setCurrentChat(null);
    // Очистить URL
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleMoveToFolder = async (folderId?: string) => {
    if (!currentChat) return;
    await moveChatToFolder(currentChat.id, folderId);
    setMoveDialogOpen(false);
  };

  const handleCreateFolderAndMove = async () => {
    if (!currentChat || !newFolderName.trim()) return;
    
    const { createFolder } = useChatStore.getState();
    const folderId = `folder_${Date.now()}`;
    await createFolder(newFolderName.trim());
    await moveChatToFolder(currentChat.id, folderId);
    
    setNewFolderName('');
    setMoveDialogOpen(false);
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <Settings onBack={() => setShowSettings(false)} />
      </div>
    );
  }

  if (showHistory) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <History onBack={() => setShowHistory(false)} />
      </div>
    );
  }

  if (showHelp) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <Help onBack={() => setShowHelp(false)} />
      </div>
    );
  }

  if (showTools) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <Tools onBack={() => setShowTools(false)} />
      </div>
    );
  }

  return (
    <FullscreenContext.Provider value={{ isFullscreen: true }}>
      <div className="flex h-screen bg-background text-foreground">
        {/* Sidebar */}
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenHistory={() => setShowHistory(true)}
          onOpenHelp={() => setShowHelp(true)}
          onOpenTools={() => setShowTools(true)}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b p-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold truncate">
              {currentChat?.title || t('newChat')}
            </h1>
            
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={handleThemeToggle}
                />
                <Moon className="h-4 w-4" />
              </div>

              {/* Chat menu - только если есть текущий чат */}
              {currentChat && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FolderInput className="h-4 w-4 mr-2" />
                        {t('moveToFolder')}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => handleMoveToFolder(undefined)}>
                          {t('noFolder')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {folders.map(folder => (
                          <DropdownMenuItem
                            key={folder.id}
                            onClick={() => handleMoveToFolder(folder.id)}
                          >
                            {folder.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setMoveDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t('createNewFolder')}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('deleteChat')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>

          {/* Messages */}
          <MessageList isFullscreen={true} />

          {/* Input */}
          <MessageInput isFullscreen={true} />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirmDeleteChat')}</DialogTitle>
            <DialogDescription>
              {t('confirmDeleteChatDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteChat}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create folder dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createNewFolder')}</DialogTitle>
            <DialogDescription>
              {t('enterFolderName')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder={t('folderName')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateFolderAndMove} disabled={!newFolderName.trim()}>
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FullscreenContext.Provider>
  );
}

