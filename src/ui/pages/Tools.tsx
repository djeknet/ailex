import { useState, useEffect, useRef } from 'react';
import { useToolsStore } from '@shared/stores/toolsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { CustomTool } from '@shared/types/database';
import * as toolsService from '@shared/services/toolsService';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { Textarea } from '@/ui/components/ui/textarea';
import { Switch } from '@/ui/components/ui/switch';
import { Import } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { Plus, Edit, Trash2, Save, X, BookOpen, MousePointer2, Lightbulb, Download, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import DOMFunctionsModal from '@/ui/components/tools/DOMFunctionsModal';
import AvailableToolsModal from '@/ui/components/tools/AvailableToolsModal';

export default function Tools({ onBack }: { onBack?: () => void } = {}) {
  const { t } = useTranslation();
  const {
    customTools,
    loadCustomTools,
    createCustomTool,
    updateCustomTool,
    deleteCustomTool,
    isLoading,
    error,
    clearError
  } = useToolsStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [isDOMFunctionsModalOpen, setIsDOMFunctionsModalOpen] = useState(false);
  const [isAvailableToolsModalOpen, setIsAvailableToolsModalOpen] = useState(false);
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const [promptTextareaRef, setPromptTextareaRef] = useState<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; description: string }>({
    isOpen: false,
    title: '',
    description: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🔧',
    command: '',
    urlPattern: '',
    prompt: '',
    enabled: true,
    apiUrl: '',
    apiMethod: 'POST' as 'POST' | 'GET',
    apiHeaders: ''
  });

  useEffect(() => {
    loadCustomTools();
  }, [loadCustomTools]);

  // Listen for element selection
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'ELEMENT_SELECTED') {
        setIsSelectingElement(false);
        const { cssSelector } = message.data;
        
        // Insert selector at cursor position in prompt textarea
        if (promptTextareaRef && cssSelector) {
          const start = promptTextareaRef.selectionStart;
          const end = promptTextareaRef.selectionEnd;
          const currentValue = formData.prompt;
          
          // Wrap selector in backticks
          const selectorText = `\`${cssSelector}\``;
          const newValue = currentValue.substring(0, start) + selectorText + currentValue.substring(end);
          
          setFormData({ ...formData, prompt: newValue });
          
          // Restore focus and cursor position after state update
          setTimeout(() => {
            if (promptTextareaRef) {
              promptTextareaRef.focus();
              const newPosition = start + selectorText.length;
              promptTextareaRef.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        }
      } else if (message.type === 'ELEMENT_SELECTION_CANCELLED') {
        setIsSelectingElement(false);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [formData, promptTextareaRef]);

  const handleSelectElement = async () => {
    setIsSelectingElement(true);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_SELECTOR' });
    }
  };

  const handleCancelElementSelection = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'STOP_ELEMENT_SELECTOR' });
    }
    setIsSelectingElement(false);
  };

  const handleOpenDialog = (tool?: CustomTool) => {
    if (tool) {
      setEditingTool(tool);
      setFormData({
        name: tool.name,
        description: tool.description,
        icon: tool.icon,
        command: tool.command,
        urlPattern: tool.urlPattern || '',
        prompt: tool.prompt,
        enabled: tool.enabled,
        apiUrl: tool.apiUrl || '',
        apiMethod: tool.apiMethod || 'POST',
        apiHeaders: tool.apiHeaders ? JSON.stringify(tool.apiHeaders, null, 2) : ''
      });
    } else {
      setEditingTool(null);
      setFormData({
        name: '',
        description: '',
        icon: '🔧',
        command: '',
        urlPattern: '',
        prompt: '',
        enabled: true,
        apiUrl: '',
        apiMethod: 'POST',
        apiHeaders: ''
      });
    }
    setIsDialogOpen(true);
    clearError();
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTool(null);
    setFormData({
      name: '',
      description: '',
      icon: '🔧',
      command: '',
      urlPattern: '',
      prompt: '',
      enabled: true,
      apiUrl: '',
      apiMethod: 'POST',
      apiHeaders: ''
    });
    clearError();
  };

  const showAlert = (title: string, description: string) => {
    setAlertDialog({ isOpen: true, title, description });
  };

  const handleSave = async () => {
    try {
      // Парсим API headers если они заполнены
      let apiHeaders: Record<string, string> | undefined;
      if (formData.apiHeaders.trim()) {
        try {
          apiHeaders = JSON.parse(formData.apiHeaders);
        } catch (e) {
          showAlert(t('error'), t('invalidJsonApiHeaders'));
          return;
        }
      }
      
      const toolData = {
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        command: formData.command,
        urlPattern: formData.urlPattern,
        prompt: formData.prompt,
        enabled: formData.enabled,
        apiUrl: formData.apiUrl || undefined,
        apiMethod: formData.apiUrl ? formData.apiMethod : undefined,
        apiHeaders: formData.apiUrl && apiHeaders ? apiHeaders : undefined
      };
      
      if (editingTool) {
        await updateCustomTool(editingTool.id, toolData);
      } else {
        await createCustomTool(toolData);
      }
      handleCloseDialog();
    } catch (error) {
      // Error is handled in the store
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('deleteToolConfirm'))) {
      await deleteCustomTool(id);
    }
  };

  const handleExportTool = (tool: CustomTool) => {
    // Извлекаем только необходимые поля для экспорта
    const exportData = {
      name: tool.name,
      description: tool.description,
      icon: tool.icon,
      command: tool.command,
      urlPattern: tool.urlPattern || '',
      prompt: tool.prompt,
      apiUrl: tool.apiUrl || '',
      apiMethod: tool.apiMethod || 'POST',
      apiHeaders: tool.apiHeaders || {}
    };

    // Создаем Blob с JSON данными
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Создаем ссылку для скачивания
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.command.replace('/', '')}_tool.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTool = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Читаем файл
      const text = await file.text();
      
      // Парсим JSON
      let toolData: any;
      try {
        toolData = JSON.parse(text);
      } catch (e) {
        showAlert(t('error'), t('importErrorInvalidJson'));
        return;
      }

      // Валидация обязательных полей
      const requiredFields = ['name', 'description', 'command', 'prompt'];
      const missingFields = requiredFields.filter(field => !toolData[field] || toolData[field].trim() === '');
      
      if (missingFields.length > 0) {
        showAlert(t('error'), t('importErrorMissingFields').replace('{fields}', missingFields.join(', ')));
        return;
      }

      // Проверка уникальности команды
      const isUnique = await toolsService.isCommandUnique(toolData.command);
      if (!isUnique) {
        showAlert(t('error'), t('importErrorCommandExists').replace('{command}', toolData.command));
        return;
      }

      // Валидация формата команды
      if (!toolsService.validateCommand(toolData.command)) {
        showAlert(t('error'), t('importErrorInvalidCommand'));
        return;
      }

      // Парсим API headers если они есть
      let apiHeaders: Record<string, string> | undefined;
      if (toolData.apiHeaders && typeof toolData.apiHeaders === 'object') {
        apiHeaders = toolData.apiHeaders;
      }

      // Создаем инструмент с enabled: true
      const newToolData = {
        name: toolData.name,
        description: toolData.description,
        icon: toolData.icon || '🔧',
        command: toolData.command,
        urlPattern: toolData.urlPattern || '',
        prompt: toolData.prompt,
        enabled: true,
        apiUrl: toolData.apiUrl || undefined,
        apiMethod: toolData.apiUrl ? (toolData.apiMethod || 'POST') : undefined,
        apiHeaders: toolData.apiUrl && apiHeaders ? apiHeaders : undefined
      };

      await createCustomTool(newToolData);
      showAlert(t('success'), t('importSuccess'));
      
    } catch (error) {
      console.error('Error importing tool:', error);
      showAlert(t('error'), t('importErrorGeneric').replace('{message}', error instanceof Error ? error.message : t('unknownError')));
    } finally {
      // Очищаем input для возможности повторного импорта того же файла
      event.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('toolsPageTitle')}</h1>
          <p className="text-muted-foreground">{t('toolsPageDescription')}</p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title={t('importTool')}>
            <Import className="h-4 w-4" />
          </Button>
          <Button onClick={() => handleOpenDialog()} title={t('createTool')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createTool')}
          </Button>
        </div>
      </div>

      {/* Скрытый input для выбора файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportTool}
        style={{ display: 'none' }}
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Custom Tools */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t('customTools')}</h2>
        {customTools.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">{t('noCustomTools')}</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {t('createFirstTool')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customTools.map(tool => (
              <Card key={tool.id} className={`w-auto inline-flex ${!tool.enabled ? 'opacity-60' : ''}`}>
                <CardHeader className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {tool.icon || '🔧'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{tool.name}</CardTitle>
                        {!tool.enabled && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                            Off
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-1">
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{tool.command}</code>
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleExportTool(tool)}
                        title={t('exportTool')}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenDialog(tool)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(tool.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Dialog for creating/editing tools */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTool ? t('editTool') : t('createTool')}</DialogTitle>
            <DialogDescription>
              {t('createToolDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('toolNameRequired')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('toolNamePlaceholder')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t('toolDescriptionRequired')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('toolDescriptionPlaceholder')}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="icon">{t('toolIcon')}</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🔧"
                  maxLength={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="command">{t('toolCommandRequired')}</Label>
                <Input
                  id="command"
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  placeholder={t('toolCommandPlaceholder')}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="urlPattern">{t('toolUrlPattern')}</Label>
              <Input
                id="urlPattern"
                value={formData.urlPattern}
                onChange={(e) => setFormData({ ...formData, urlPattern: e.target.value })}
                placeholder={t('toolUrlPatternPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('toolUrlPatternNote')}
              </p>
            </div>

            {/* API Integration Fields */}
            <div className="grid gap-2">
              <Label htmlFor="apiUrl">{t('toolApiUrl')}</Label>
              <Input
                id="apiUrl"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder={t('toolApiUrlPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('toolApiNote')}
              </p>
            </div>

            {formData.apiUrl && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="apiMethod">{t('toolApiMethod')}</Label>
                  <Select
                    value={formData.apiMethod}
                    onValueChange={(value: 'POST' | 'GET') => setFormData({ ...formData, apiMethod: value })}
                  >
                    <SelectTrigger id="apiMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="apiHeaders">{t('toolApiHeaders')}</Label>
                  <Textarea
                    id="apiHeaders"
                    value={formData.apiHeaders}
                    onChange={(e) => setFormData({ ...formData, apiHeaders: e.target.value })}
                    placeholder={t('toolApiHeadersPlaceholder')}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    JSON формат, например: {`{"Authorization": "Bearer YOUR_TOKEN"}`}
                  </p>
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="prompt">{t('toolPromptRequired')}</Label>
              <Textarea
                id="prompt"
                ref={(el) => setPromptTextareaRef(el)}
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder={t('toolPromptPlaceholder')}
                rows={6}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setIsAvailableToolsModalOpen(true)}
                  >
                    <Lightbulb className="mr-1 h-3 w-3" />
                    {t('viewAvailableTools')}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={isSelectingElement ? handleCancelElementSelection : handleSelectElement}
                  >
                    <MousePointer2 className={`mr-1 h-3 w-3 ${isSelectingElement ? 'text-primary' : ''}`} />
                    {isSelectingElement ? t('cancel') : t('selectElementForPrompt')}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setIsDOMFunctionsModalOpen(true)}
                  >
                    <BookOpen className="mr-1 h-3 w-3" />
                    {t('viewDomFunctions')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="enabled" className="text-base">
                  {t('toolEnabled')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('toolEnabledNote')}
                </p>
              </div>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="mr-2 h-4 w-4" />
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name || !formData.description || !formData.command || !formData.prompt || isLoading}
            >
              <Save className="mr-2 h-4 w-4" />
              {editingTool ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DOM Functions Modal */}
      <DOMFunctionsModal 
        open={isDOMFunctionsModalOpen}
        onOpenChange={setIsDOMFunctionsModalOpen}
      />
      
      <AvailableToolsModal
        open={isAvailableToolsModalOpen}
        onOpenChange={setIsAvailableToolsModalOpen}
      />
      
      {/* Alert Dialog */}
      <AlertDialog open={alertDialog.isOpen} onOpenChange={(open) => setAlertDialog({ ...alertDialog, isOpen: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog({ ...alertDialog, isOpen: false })}>
              {t('ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


