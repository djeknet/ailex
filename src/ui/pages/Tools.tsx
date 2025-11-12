import { useState, useEffect } from 'react';
import { useToolsStore } from '@shared/stores/toolsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { CustomTool } from '@shared/types/database';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { Textarea } from '@/ui/components/ui/textarea';
import { Switch } from '@/ui/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  DialogTrigger,
} from '@/ui/components/ui/dialog';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';

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
    if (confirm('Вы уверены, что хотите удалить этот инструмент?')) {
      await deleteCustomTool(id);
    }
  };

  const handleToggleEnabled = async (tool: CustomTool) => {
    await updateCustomTool(tool.id, { enabled: !tool.enabled });
  };

  const builtInTools = availableTools.filter(t => t.isBuiltIn);

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Инструменты</h1>
          <p className="text-muted-foreground">Управление встроенными и пользовательскими инструментами</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Создать инструмент
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Built-in Tools */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Встроенные инструменты</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {builtInTools.map(tool => (
            <Card key={tool.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tool.icon}</span>
                    <CardTitle className="text-lg">{tool.name}</CardTitle>
                  </div>
                </div>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <div>Команда: <code className="bg-muted px-1.5 py-0.5 rounded">{tool.command}</code></div>
                  {tool.urlPattern && (
                    <div className="mt-1">URL: {tool.urlPattern}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Custom Tools */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Пользовательские инструменты</h2>
        {customTools.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Нет пользовательских инструментов</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Создать первый инструмент
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTools.map(tool => (
              <Card key={tool.id} className={!tool.enabled ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tool.icon}</span>
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(tool)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(tool.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Команда: <code className="bg-muted px-1.5 py-0.5 rounded">{tool.command}</code></div>
                    {tool.urlPattern && (
                      <div>URL: {tool.urlPattern}</div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tool.enabled}
                      onCheckedChange={() => handleToggleEnabled(tool)}
                    />
                    <Label className="text-sm">{tool.enabled ? 'Включен' : 'Выключен'}</Label>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Dialog for creating/editing tools */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTool ? 'Редактировать инструмент' : 'Создать инструмент'}</DialogTitle>
            <DialogDescription>
              Заполните форму для создания пользовательского инструмента
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Название инструмента"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Описание *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание функционала"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="icon">Иконка</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🔧"
                  maxLength={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="command">Команда *</Label>
                <Input
                  id="command"
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  placeholder="/mycommand"
                />
                <p className="text-xs text-muted-foreground">Начинается с /</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="urlPattern">URL паттерн (опционально)</Label>
              <Input
                id="urlPattern"
                value={formData.urlPattern}
                onChange={(e) => setFormData({ ...formData, urlPattern: e.target.value })}
                placeholder="https://example.com/"
              />
              <p className="text-xs text-muted-foreground">
                Инструмент будет доступен только на страницах, начинающихся с этого URL
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prompt">Промпт для AI *</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="Инструкция для AI о том, что нужно сделать..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Этот промпт будет отправлен AI при вызове инструмента
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
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name || !formData.description || !formData.command || !formData.prompt || isLoading}
            >
              <Save className="mr-2 h-4 w-4" />
              {editingTool ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


