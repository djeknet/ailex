import { useState, useEffect } from 'react';
import { useToolsStore } from '@shared/stores/toolsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { CustomTool } from '@shared/types/database';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { Textarea } from '@/ui/components/ui/textarea';
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
import { Plus, Edit, Trash2, Save, X, FileText, Mail, Edit3, ClipboardList, LucideIcon, Wrench } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';

const toolIconMap: Record<string, { icon: LucideIcon; color: string }> = {
  'summarize': { icon: FileText, color: 'text-blue-500' },
  'collect-contacts': { icon: Mail, color: 'text-green-500' },
  'fill-form': { icon: Edit3, color: 'text-orange-500' },
  'get-form-fields': { icon: ClipboardList, color: 'text-purple-500' },
  'fill-form-fields': { icon: Edit3, color: 'text-amber-500' },
};

export default function Tools() {
  const { t } = useTranslation();
  const {
    customTools,
    availableTools,
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🔧',
    command: '',
    urlPattern: '',
    prompt: '',
    enabled: true
  });

  useEffect(() => {
    loadCustomTools();
  }, [loadCustomTools]);

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
        enabled: tool.enabled
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
        enabled: true
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
      enabled: true
    });
    clearError();
  };

  const handleSave = async () => {
    try {
      if (editingTool) {
        await updateCustomTool(editingTool.id, formData);
      } else {
        await createCustomTool(formData);
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

  const builtInTools = availableTools.filter(t => t.isBuiltIn && !t.hiddenFromUI);

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('toolsPageTitle')}</h1>
          <p className="text-muted-foreground">{t('toolsPageDescription')}</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createTool')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Built-in Tools */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">{t('builtInTools')}</h2>
        <div className="flex flex-wrap gap-2">
          {builtInTools.map(tool => {
            const iconConfig = toolIconMap[tool.id] || { icon: Wrench, color: 'text-gray-500' };
            const IconComponent = iconConfig.icon;
            const toolName = tool.nameKey ? t(tool.nameKey) : tool.name;
            
            return (
              <Card key={tool.id} className="w-auto inline-flex">
                <CardHeader className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`${iconConfig.color}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{toolName}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{tool.command}</code>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

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
                    <div className="text-gray-600">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{tool.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{tool.command}</code>
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 ml-2">
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
                <p className="text-xs text-muted-foreground">{t('toolCommandNote')}</p>
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

            <div className="grid gap-2">
              <Label htmlFor="prompt">{t('toolPromptRequired')}</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder={t('toolPromptPlaceholder')}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {t('toolPromptNote')}
              </p>
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
    </div>
  );
}


