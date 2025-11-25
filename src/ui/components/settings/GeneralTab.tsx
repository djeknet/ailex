import { useState, useEffect } from 'react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Label } from '@/ui/components/ui/label';
import { Input } from '@/ui/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/ui/select';
import { Switch } from '@/ui/components/ui/switch';
import { Button } from '@/ui/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/ui/components/ui/dialog';
import { Theme, SupportedLanguage } from '@shared/types/common';
import { HistoryMode } from '@shared/types/extension';
import { historyAPI, chatAPI } from '@shared/utils/messaging';
import { Trash2, CheckCircle2, Download, Upload } from 'lucide-react';
import { UI_LANGUAGES, SUPPORTED_LANGUAGES } from '@shared/constants';
import ImportDialog from './ImportDialog';

export default function GeneralTab() {
  const { t } = useTranslation();
  const { theme, language, historyMode, showAISuggestions, developerMode, autoDeletionDays, setTheme, setLanguage, setHistoryMode, setShowAISuggestions, setDeveloperMode, setAutoDeletionDays, exportSettings } = useSettingsStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [stats, setStats] = useState({ chats: 0, messages: 0, sizeKb: 0 });
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    if (isDialogOpen && !isDeleted) {
      loadStats();
    }
  }, [isDialogOpen, isDeleted]);

  const loadStats = async () => {
    try {
      const chats = await chatAPI.getAllChats();
      let totalMessages = 0;
      
      for (const chat of chats) {
        const messages = await historyAPI.getMessages(chat.id);
        totalMessages += messages.length;
      }
      
      // Примерный расчет размера в Kb
      const dataSize = JSON.stringify({ chats, totalMessages }).length;
      const sizeKb = Math.round(dataSize / 1024);
      
      setStats({
        chats: chats.length,
        messages: totalMessages,
        sizeKb
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleDeleteHistory = async () => {
    setIsDeleting(true);
    try {
      await historyAPI.deleteAllHistory();
      setIsDeleted(true);
    } catch (error) {
      console.error('Error deleting history:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => {
      setIsDeleted(false);
    }, 300);
  };

  const handleExportSettings = async () => {
    try {
      const data = await exportSettings();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `ailex-settings-${timestamp}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting settings:', error);
    }
  };

  const handleImportSettings = () => {
    setIsImportDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('theme')}</Label>
        <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">{t('light')}</SelectItem>
            <SelectItem value="dark">{t('dark')}</SelectItem>
            <SelectItem value="system">{t('system')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('language')}</Label>
        <Select value={language} onValueChange={(value) => setLanguage(value as SupportedLanguage)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UI_LANGUAGES.map((langCode) => {
              const lang = SUPPORTED_LANGUAGES[langCode];
              return (
                <SelectItem key={langCode} value={langCode}>
                  {lang.nativeName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('historyMode')}</Label>
        <Select value={historyMode} onValueChange={(value) => setHistoryMode(value as HistoryMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('historyModeAll')}</SelectItem>
            <SelectItem value="per-site">{t('historyModePerSite')}</SelectItem>
            <SelectItem value="session">{t('historyModeSession')}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {historyMode === 'all' && t('historyModeAllDesc')}
          {historyMode === 'per-site' && t('historyModePerSiteDesc')}
          {historyMode === 'session' && t('historyModeSessionDesc')}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="auto-deletion-days">{t('autoDeletionDays')}</Label>
        <Input
          id="auto-deletion-days"
          type="number"
          min="1"
          max="999"
          value={autoDeletionDays || 30}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseInt(e.target.value, 10);
            if (value >= 1 && value <= 999) {
              setAutoDeletionDays(value);
            }
          }}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          {t('autoDeletionDaysDescription')}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="ai-suggestions">{t('aiSuggestions')}</Label>
          <Switch 
            id="ai-suggestions"
            checked={showAISuggestions}
            onCheckedChange={setShowAISuggestions}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {t('aiSuggestionsDescription')}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="developer-mode">{t('developerMode')}</Label>
          <Switch 
            id="developer-mode"
            checked={developerMode || false}
            onCheckedChange={setDeveloperMode}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {t('developerModeDescription')}
        </p>
      </div>

      <div className="pt-4 border-t">
        <Button 
          variant="destructive" 
          onClick={() => setIsDialogOpen(true)}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('deleteHistory')}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          {t('deleteHistoryWarning')}
        </p>
      </div>

      {/* Export/Import Settings Section */}
      <div className="pt-4 border-t space-y-4">
        <div>
          <h3 className="text-lg font-medium">{t('settingsManagement')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settingsManagementDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportSettings}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('exportSettings')}
          </Button>

          <Button 
            variant="outline" 
            onClick={handleImportSettings}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('importSettings')}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('exportSettingsDescription')}
        </p>
      </div>

      {/* Delete History Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isDeleted ? t('historyDeleted') : t('confirmDeletion')}
            </DialogTitle>
            <DialogDescription>
              {isDeleted ? null : t('deleteDataDescription')}
            </DialogDescription>
          </DialogHeader>

          {!isDeleted ? (
            <>
              <div className="space-y-2 py-4">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">▪</span>
                  <span>{t('chatsToDelete')} <strong>{stats.chats}</strong></span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">▪</span>
                  <span>{t('messagesToDelete')} <strong>{stats.messages}</strong></span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">▪</span>
                  <span>{t('dataSize')} <strong>{stats.sizeKb} Kb</strong></span>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCloseDialog}
                  disabled={isDeleting}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteHistory}
                  disabled={isDeleting}
                >
                  {isDeleting ? t('deleting') : t('delete')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 py-6">
                <CheckCircle2 className="h-16 w-16 text-primary" />
                <p className="text-center text-sm">
                  {t('historyDeletedSuccess')}
                </p>
              </div>

              <DialogFooter>
                <Button 
                  variant="default" 
                  onClick={handleCloseDialog}
                  className="w-full"
                >
                  {t('close')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <ImportDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />
    </div>
  );
}

