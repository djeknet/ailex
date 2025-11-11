import { useState, useEffect, useMemo } from 'react';
import { useChatStore } from '@shared/stores/chatStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Chat, ChatMessage } from '@shared/types/database';
import { historyAPI } from '@shared/utils/messaging';
import { getOperatorIcon } from '@shared/services/aiService';
import { AIOperator } from '@shared/types/ai';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/ui/components/ui/sheet';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown-menu';
import { Badge } from '@/ui/components/ui/badge';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import {
  Search,
  FolderPlus,
  MessageSquarePlus,
  Ellipsis,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Folder,
} from 'lucide-react';

interface ChatHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatWithMessages {
  chat: Chat;
  totalTokens: number;
  operators: AIOperator[];
}

export default function ChatHistoryPanel({ open, onOpenChange }: ChatHistoryPanelProps) {
  const { t } = useTranslation();
  const {
    folders,
    chats,
    loadFolders,
    loadAllChats,
    createFolder,
    updateFolder,
    deleteFolder,
    updateChatTitle,
    moveChatToFolder,
    deleteChat,
    setCurrentChat,
    loadMessages,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [chatsWithData, setChatsWithData] = useState<ChatWithMessages[]>([]);

  // Dialogs state
  const [renameDialog, setRenameDialog] = useState<{ id: string; type: 'chat' | 'folder'; currentName: string } | null>(null);
  const [moveDialog, setMoveDialog] = useState<string | null>(null);
  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; type: 'chat' | 'folder' } | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (open) {
      loadFolders();
      loadAllChats();
    }
  }, [open]);

  // Load chat data (tokens and operators)
  useEffect(() => {
    const loadChatData = async () => {
      const data: ChatWithMessages[] = [];
      for (const chat of chats) {
        try {
          const messages = await historyAPI.getMessages(chat.id) as ChatMessage[];
          const totalTokens = messages.reduce((sum: number, msg: ChatMessage) => sum + (msg.tokens || 0), 0);
          const operatorSet = new Set<AIOperator>();
          messages.forEach((msg: ChatMessage) => {
            if (msg.operator) {
              operatorSet.add(msg.operator);
            }
          });
          data.push({
            chat,
            totalTokens,
            operators: Array.from(operatorSet),
          });
        } catch (error) {
          console.error('Error loading chat data:', error);
          data.push({
            chat,
            totalTokens: 0,
            operators: [],
          });
        }
      }
      setChatsWithData(data);
    };

    if (chats.length > 0) {
      loadChatData();
    }
  }, [chats]);

  // Filter chats by search query
  const filteredChats = useMemo(() => {
    if (!searchQuery) return chatsWithData;
    const query = searchQuery.toLowerCase();
    return chatsWithData.filter(({ chat }) =>
      chat.title.toLowerCase().includes(query) ||
      chat.site.toLowerCase().includes(query)
    );
  }, [chatsWithData, searchQuery]);

  // Group chats by folder
  const chatsByFolder = useMemo(() => {
    const grouped: Record<string, ChatWithMessages[]> = {};
    filteredChats.forEach(chatData => {
      const folderId = chatData.chat.folderId || 'none';
      if (!grouped[folderId]) {
        grouped[folderId] = [];
      }
      grouped[folderId].push(chatData);
    });

    // Sort chats by updatedAt (newest first)
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => b.chat.updatedAt - a.chat.updatedAt);
    });

    return grouped;
  }, [filteredChats]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleChatClick = async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChat(chat);
      await loadMessages(chatId);
      onOpenChange(false);
    }
  };

  const handleRename = () => {
    if (!renameDialog || !newName.trim()) return;

    if (renameDialog.type === 'chat') {
      updateChatTitle(renameDialog.id, newName);
    } else {
      updateFolder(renameDialog.id, newName);
    }

    setRenameDialog(null);
    setNewName('');
  };

  const handleMove = (folderId?: string) => {
    if (!moveDialog) return;
    moveChatToFolder(moveDialog, folderId);
    setMoveDialog(null);
  };

  const handleDelete = () => {
    if (!deleteDialog) return;

    if (deleteDialog.type === 'chat') {
      deleteChat(deleteDialog.id);
    } else {
      deleteFolder(deleteDialog.id);
    }

    setDeleteDialog(null);
  };

  const handleCreateFolder = () => {
    if (!newName.trim()) {
      createFolder(t('unnamedFolder'));
    } else {
      createFolder(newName);
    }
    setCreateFolderDialog(false);
    setNewName('');
  };

  const openSite = (url: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.update(tabs[0].id, { url: `https://${url}` });
      }
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays}д`;
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{t('chatHistory')}</SheetTitle>
          </SheetHeader>

          {/* Search and actions */}
          <div className="p-4 space-y-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchChats')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateFolderDialog(true)}
                className="flex-1"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                {t('newFolder')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  const site = tab.url ? new URL(tab.url).hostname : 'unknown';
                  const { createNewChat } = useChatStore.getState();
                  await createNewChat(site);
                  onOpenChange(false);
                }}
                className="flex-1"
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                {t('newChat')}
              </Button>
            </div>
          </div>

          {/* Chats list */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {/* Folders */}
              {folders.map(folder => (
                <div key={folder.id}>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent group"
                  >
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      {expandedFolders.has(folder.id) ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                      <Folder className="h-4 w-4 flex-shrink-0" />
                      <span className="font-semibold text-base truncate">{folder.name}</span>
                    </button>

                    {/* Count / Menu container - fixed width to prevent layout shift */}
                    <div className="relative w-12 h-6 flex items-center justify-end flex-shrink-0">
                      <span className="absolute right-0 text-xs text-muted-foreground whitespace-nowrap opacity-100 group-hover:opacity-0 transition-opacity">
                        {chatsByFolder[folder.id]?.length || 0}
                      </span>

                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Ellipsis className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameDialog({ id: folder.id, type: 'folder', currentName: folder.name });
                              setNewName(folder.name);
                            }}
                          >
                            {t('rename')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog({ id: folder.id, type: 'folder' });
                            }}
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                          >
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Chats in folder */}
                  {expandedFolders.has(folder.id) && chatsByFolder[folder.id] && (
                    <div className="ml-6 space-y-1">
                      {chatsByFolder[folder.id].map(({ chat, totalTokens, operators }) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          totalTokens={totalTokens}
                          operators={operators}
                          onChatClick={handleChatClick}
                          onRename={(id, title) => {
                            setRenameDialog({ id, type: 'chat', currentName: title });
                            setNewName(title);
                          }}
                          onMove={(id) => setMoveDialog(id)}
                          onDelete={(id) => setDeleteDialog({ id, type: 'chat' })}
                          onSiteClick={openSite}
                          formatDate={formatDate}
                          formatTokens={formatTokens}
                          t={t}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Chats without folder */}
              {chatsByFolder['none'] && chatsByFolder['none'].length > 0 && (
                <div className="space-y-1">
                  {chatsByFolder['none'].map(({ chat, totalTokens, operators }) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      totalTokens={totalTokens}
                      operators={operators}
                      onChatClick={handleChatClick}
                      onRename={(id, title) => {
                        setRenameDialog({ id, type: 'chat', currentName: title });
                        setNewName(title);
                      }}
                      onMove={(id) => setMoveDialog(id)}
                      onDelete={(id) => setDeleteDialog({ id, type: 'chat' })}
                      onSiteClick={openSite}
                      formatDate={formatDate}
                      formatTokens={formatTokens}
                      t={t}
                    />
                  ))}
                </div>
              )}

              {filteredChats.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  {searchQuery ? t('noChats') : t('noChats')}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={() => setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {renameDialog?.type === 'chat' ? t('renameChat') : t('renameFolder')}
            </DialogTitle>
            <DialogDescription>
              {renameDialog?.type === 'chat' ? t('enterNewChatName') : t('enterNewFolderName')}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={renameDialog?.type === 'chat' ? t('chat') : t('folderName')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleRename}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={!!moveDialog} onOpenChange={() => setMoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('moveToFolder')}</DialogTitle>
            <DialogDescription>{t('selectFolder')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleMove(undefined)}
            >
              {t('noFolders')}
            </Button>
            {folders.map(folder => (
              <Button
                key={folder.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleMove(folder.id)}
              >
                <Folder className="h-4 w-4 mr-2" />
                {folder.name}
              </Button>
            ))}
            {folders.length === 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMoveDialog(null);
                  setCreateFolderDialog(true);
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                {t('createFolder')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialog} onOpenChange={setCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createFolder')}</DialogTitle>
            <DialogDescription>{t('enterFolderName')}</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('unnamedFolder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateFolderDialog(false);
              setNewName('');
            }}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateFolder}>{t('create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteDialog?.type === 'chat' ? t('deleteChat') : t('deleteFolder')}
            </DialogTitle>
            <DialogDescription>
              {deleteDialog?.type === 'chat' ? t('deleteChatConfirm') : t('deleteFolderConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Chat Item Component
interface ChatItemProps {
  chat: Chat;
  totalTokens: number;
  operators: AIOperator[];
  onChatClick: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
  onSiteClick: (site: string) => void;
  formatDate: (timestamp: number) => string;
  formatTokens: (tokens: number) => string;
  t: (key: string) => string;
}

function ChatItem({
  chat,
  totalTokens,
  operators,
  onChatClick,
  onRename,
  onMove,
  onDelete,
  onSiteClick,
  formatDate,
  formatTokens,
  t,
}: ChatItemProps) {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-md hover:bg-accent cursor-pointer group"
      onClick={() => onChatClick(chat.id)}
    >
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-medium truncate flex-1">{chat.title}</p>
          
          {/* Time / Menu container - fixed width to prevent layout shift */}
          <div className="relative w-12 h-6 flex items-center justify-end flex-shrink-0">
            <span className="absolute right-0 text-xs text-muted-foreground whitespace-nowrap opacity-100 group-hover:opacity-0 transition-opacity">
              {formatDate(chat.createdAt)}
            </span>
            
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onRename(chat.id, chat.title);
                }}>
                  {t('rename')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onMove(chat.id);
                }}>
                  {t('moveTo')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(chat.id);
                  }}
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  {t('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSiteClick(chat.site);
                  }}
                >
                  {chat.site}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{t('openSite')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {operators.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex -space-x-2 cursor-help">
                    {operators.slice(0, 3).map((op, idx) => (
                      <div
                        key={idx}
                        className="relative w-5 h-5 rounded-full border-2 border-background overflow-hidden"
                      >
                        <img
                          src={getOperatorIcon(op)}
                          alt={op}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {operators.length > 3 && (
                      <div className="relative w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px]">
                        +{operators.length - 3}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{t('usedOperators')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {totalTokens > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
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
      </div>
    </div>
  );
}

