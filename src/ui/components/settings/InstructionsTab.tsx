import { useState } from 'react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Label } from '@/ui/components/ui/label';
import { Input } from '@/ui/components/ui/input';
import { Textarea } from '@/ui/components/ui/textarea';
import { Button } from '@/ui/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/ui/components/ui/dialog';
import { Instruction } from '@shared/types/extension';
import { Plus, Edit, Trash2, Globe } from 'lucide-react';

export default function InstructionsTab() {
  const { t } = useTranslation();
  const { generalInstruction, instructions, updateGeneralInstruction, addInstruction, updateInstruction, deleteInstruction } = useSettingsStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);
  const [deletingInstructionId, setDeletingInstructionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', domain: '', content: '' });
  const [domainError, setDomainError] = useState<string | null>(null);

  const handleOpenDialog = (instruction?: Instruction) => {
    if (instruction) {
      setEditingInstruction(instruction);
      setFormData({
        name: instruction.name,
        domain: instruction.domain,
        content: instruction.content
      });
    } else {
      setEditingInstruction(null);
      setFormData({ name: '', domain: '', content: '' });
    }
    setDomainError(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingInstruction(null);
    setFormData({ name: '', domain: '', content: '' });
    setDomainError(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.content) return;

    // Check for duplicate domain
    if (formData.domain) {
      const duplicateInstruction = instructions.find(
        i => i.domain === formData.domain && i.id !== editingInstruction?.id
      );
      if (duplicateInstruction) {
        setDomainError(t('domainAlreadyExists'));
        return;
      }
    }

    if (editingInstruction) {
      updateInstruction({
        ...editingInstruction,
        name: formData.name,
        domain: formData.domain,
        content: formData.content,
        updatedAt: Date.now()
      });
    } else {
      addInstruction({
        id: Date.now().toString(),
        name: formData.name,
        domain: formData.domain,
        content: formData.content,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    setDeletingInstructionId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingInstructionId) {
      deleteInstruction(deletingInstructionId);
      setIsDeleteDialogOpen(false);
      setDeletingInstructionId(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeletingInstructionId(null);
  };

  const isFormValid = formData.name && formData.content && !domainError;

  return (
    <div className="space-y-6">
      {/* General Instruction */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="general-instruction">{t('generalInstruction')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('generalInstructionDescription')}
          </p>
          <Textarea
            id="general-instruction"
            value={generalInstruction || ''}
            onChange={(e) => updateGeneralInstruction(e.target.value)}
            placeholder={t('generalInstructionPlaceholder')}
            rows={6}
          />
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">{t('customInstructions')}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('customInstructionsDescription')}
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addInstruction')}
          </Button>
        </div>

        {/* Instructions List */}
        <div className="space-y-2">
          {instructions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noInstructions')}
            </div>
          ) : (
            instructions.map((instruction) => (
              <div
                key={instruction.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1 cursor-pointer" onClick={() => handleOpenDialog(instruction)}>
                    <div className="font-medium">{instruction.name}</div>
                    {instruction.domain && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        {instruction.domain}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {instruction.content}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(instruction)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(instruction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstruction ? t('editInstruction') : t('addInstruction')}
            </DialogTitle>
            <DialogDescription>
              {editingInstruction 
                ? t('editInstructionDescription')
                : t('addInstructionDescription')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instruction-name">{t('instructionName')}</Label>
              <Input
                id="instruction-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('instructionNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instruction-domain">{t('instructionDomain')}</Label>
              <Input
                id="instruction-domain"
                value={formData.domain}
                onChange={(e) => {
                  const newDomain = e.target.value;
                  setFormData({ ...formData, domain: newDomain });
                  
                  // Check for duplicate domain
                  if (newDomain) {
                    const duplicateInstruction = instructions.find(
                      i => i.domain === newDomain && i.id !== editingInstruction?.id
                    );
                    if (duplicateInstruction) {
                      setDomainError(t('domainAlreadyExists'));
                    } else {
                      setDomainError(null);
                    }
                  } else {
                    setDomainError(null);
                  }
                }}
                placeholder={t('instructionDomainPlaceholder')}
                className={domainError ? 'border-destructive' : ''}
              />
              {domainError && (
                <p className="text-sm text-destructive">{domainError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instruction-content">{t('instructionContent')}</Label>
              <Textarea
                id="instruction-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={t('instructionContentPlaceholder')}
                rows={6}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button onClick={handleSave} disabled={!isFormValid}>
              {editingInstruction ? t('save') : t('add')}
            </Button>
            <Button variant="outline" onClick={handleCloseDialog} className="sm:mt-0">
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={handleCancelDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteInstruction')}</DialogTitle>
            <DialogDescription>
              {t('deleteInstructionConfirm')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('delete')}
            </Button>
            <Button variant="outline" onClick={handleCancelDelete} className="sm:mt-0">
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

