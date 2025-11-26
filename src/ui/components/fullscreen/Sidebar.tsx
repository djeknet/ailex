import { useState, useEffect } from 'react';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useChatStore } from '@shared/stores/chatStore';
import { Chat } from '@shared/types/database';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/ui/components/ui/collapsible';
import {
  PanelRightOpen,
  PanelLeftOpen,
  MessageSquarePlus,
  Search,
  Settings,
  MoreHorizontal,
  ChevronRight,
  Folder,
  Edit2,
  FolderInput,
  Trash2,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse, onOpenSettings }: SidebarProps) {
  const { t } = useTranslation();
  const {
    chats,
    folders,
    currentChat,
    loadAllChats,
    loadFolders,
    createNewChat,
    setCurrentChat,
    loadMessages,
    updateChatTitle,
    moveChatToFolder,
    deleteChat,
    createFolder,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [displayedChatsCount, setDisplayedChatsCount] = useState(10);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // Dialogs state
  const [renameDialog, setRenameDialog] = useState<{ id: string; type: 'chat' | 'folder'; currentName: string } | null>(null);
  const [moveDialog, setMoveDialog] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; type: 'chat' | 'folder' } | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadFolders();
    loadAllChats();
  }, []);

  // Обновить список чатов когда текущий чат обновляется
  useEffect(() => {
    if (currentChat) {
      // Проверить, есть ли чат в списке
      const existingChat = chats.find(c => c.id === currentChat.id);
      if (!existingChat || existingChat.title !== currentChat.title) {
        // Если чата нет в списке или название изменилось, обновить список
        loadAllChats();
      }
    }
  }, [currentChat?.id, currentChat?.title, currentChat?.updatedAt]);

  // Обработка скролла для подгрузки чатов
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    
    if (bottom && displayedChatsCount < filteredChats.length) {
      setDisplayedChatsCount(prev => Math.min(prev + 10, filteredChats.length));
    }
  };

  const handleNewChat = async () => {
    const newChat = await createNewChat('fullscreen');
    // Обновить URL с новым chatId
    window.history.pushState({}, '', `?chatId=${newChat.id}`);
  };

  const handleChatClick = async (chat: Chat) => {
    setCurrentChat(chat);
    await loadMessages(chat.id);
    // Обновить URL
    window.history.pushState({}, '', `?chatId=${chat.id}`);
  };

  const handleRename = async () => {
    if (!renameDialog || !newName.trim()) return;

    if (renameDialog.type === 'chat') {
      await updateChatTitle(renameDialog.id, newName.trim());
    } else {
      const { updateFolder } = useChatStore.getState();
      await updateFolder(renameDialog.id, newName.trim());
    }

    setRenameDialog(null);
    setNewName('');
  };

  const handleMove = async (folderId?: string) => {
    if (!moveDialog) return;
    await moveChatToFolder(moveDialog, folderId);
    setMoveDialog(null);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    if (deleteDialog.type === 'chat') {
      await deleteChat(deleteDialog.id);
      // Если удаляем текущий чат, сбросить состояние
      if (currentChat?.id === deleteDialog.id) {
        setCurrentChat(null);
        // Очистить URL
        window.history.pushState({}, '', window.location.pathname);
      }
    } else {
      const { deleteFolder } = useChatStore.getState();
      await deleteFolder(deleteDialog.id);
    }

    setDeleteDialog(null);
  };

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

  // Фильтрация чатов
  const filteredChats = chats
    .filter(chat => 
      !searchQuery || 
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);

  // Группировка чатов по папкам
  const chatsWithoutFolder = filteredChats.filter(chat => !chat.folderId);
  const chatsByFolder = folders.reduce((acc, folder) => {
    acc[folder.id] = filteredChats.filter(chat => chat.folderId === folder.id);
    return acc;
  }, {} as Record<string, Chat[]>);

  if (collapsed) {
    return (
      <div className="w-16 border-r bg-card flex flex-col items-center py-4 gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleNewChat}>
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="w-80 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icons/icon-48.png" alt="AiLex" className="h-8 w-8" />
            <span className="font-semibold text-lg">AiLex</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <PanelRightOpen className="h-5 w-5" />
          </Button>
        </div>

        {/* Fixed actions */}
        <div className="p-3 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleNewChat}
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            {t('newChat')}
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchChats')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Scrollable chats area */}
        <div className="flex-1 overflow-auto" onScroll={handleScroll}>
          <div className="p-3 space-y-1">
            {/* Folders */}
            {folders.map(folder => (
              <Collapsible
                key={folder.id}
                open={expandedFolders.has(folder.id)}
                onOpenChange={() => toggleFolder(folder.id)}
              >
                <div 
                  className="group relative flex items-center overflow-hidden"
                  onMouseEnter={() => setHoveredChatId(folder.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                >
                  <CollapsibleTrigger className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm min-w-0">
                    <ChevronRight
                      className={`h-4 w-4 flex-shrink-0 transition-transform ${
                        expandedFolders.has(folder.id) ? 'rotate-90' : ''
                      }`}
                    />
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate min-w-0 mr-1">{folder.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {chatsByFolder[folder.id]?.length || 0}
                    </span>
                  </CollapsibleTrigger>
                  
                  {/* Folder menu */}
                  <div className="flex-shrink-0 ml-auto pr-3">
                    {(hoveredChatId === folder.id || openDropdownId === folder.id) && (
                      <DropdownMenu
                        open={openDropdownId === folder.id}
                        onOpenChange={(open) => setOpenDropdownId(open ? folder.id : null)}
                      >
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <MoreHorizontal className="h-4 w-4" />
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
                            <Edit2 className="h-4 w-4 mr-2" />
                            {t('rename')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog({ id: folder.id, type: 'folder' });
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <CollapsibleContent className="ml-4 mt-1 space-y-1">
                  {chatsByFolder[folder.id]?.slice(0, displayedChatsCount).map(chat => (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm overflow-hidden ${
                        currentChat?.id === chat.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => handleChatClick(chat)}
                      onMouseEnter={() => setHoveredChatId(chat.id)}
                      onMouseLeave={() => setHoveredChatId(null)}
                    >
                      <span className="flex-1 truncate min-w-0 mr-1">{chat.title}</span>
                      <div className="flex-shrink-0 ml-auto">
                        {(hoveredChatId === chat.id || openDropdownId === chat.id) && (
                          <DropdownMenu
                            open={openDropdownId === chat.id}
                            onOpenChange={(open) => setOpenDropdownId(open ? chat.id : null)}
                          >
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameDialog({ id: chat.id, type: 'chat', currentName: chat.title });
                                setNewName(chat.title);
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              {t('rename')}
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <FolderInput className="h-4 w-4 mr-2" />
                                {t('moveToFolder')}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleMove(undefined)}>
                                  {t('noFolder')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {folders.map(f => (
                                  <DropdownMenuItem
                                    key={f.id}
                                    onClick={() => handleMove(f.id)}
                                  >
                                    {f.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialog({ id: chat.id, type: 'chat' });
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Chats without folder */}
            {chatsWithoutFolder.slice(0, displayedChatsCount).map(chat => (
              <div
                key={chat.id}
                className={`group relative flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm overflow-hidden ${
                  currentChat?.id === chat.id ? 'bg-accent' : ''
                }`}
                onClick={() => handleChatClick(chat)}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
              >
                <span className="flex-1 truncate min-w-0 mr-1">{chat.title}</span>
                <div className="flex-shrink-0 ml-auto">
                  {(hoveredChatId === chat.id || openDropdownId === chat.id) && (
                    <DropdownMenu
                      open={openDropdownId === chat.id}
                      onOpenChange={(open) => setOpenDropdownId(open ? chat.id : null)}
                    >
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameDialog({ id: chat.id, type: 'chat', currentName: chat.title });
                            setNewName(chat.title);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          {t('rename')}
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <FolderInput className="h-4 w-4 mr-2" />
                            {t('moveToFolder')}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {folders.map(f => (
                              <DropdownMenuItem
                                key={f.id}
                                onClick={() => handleMove(f.id)}
                              >
                                {f.name}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                const folderName = prompt(t('enterFolderName'));
                                if (folderName) {
                                  const folderId = `folder_${Date.now()}`;
                                  createFolder(folderName).then(() => handleMove(folderId));
                                }
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t('createNewFolder')}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog({ id: chat.id, type: 'chat' });
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onOpenSettings}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('settings')}
          </Button>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={() => setRenameDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('rename')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={renameDialog?.type === 'chat' ? t('chatTitle') : t('folderName')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deleteDialog?.type === 'chat' ? t('confirmDeleteChat') : t('confirmDeleteFolder')}
            </DialogTitle>
            <DialogDescription>
              {deleteDialog?.type === 'chat' ? t('confirmDeleteChatDescription') : t('confirmDeleteFolderDescription')}
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

