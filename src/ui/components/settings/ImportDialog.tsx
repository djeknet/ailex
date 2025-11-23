import { useState } from 'react';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/ui/components/ui/dialog';
import { Button } from '@/ui/components/ui/button';
import { Checkbox } from '@/ui/components/ui/checkbox';
import { Label } from '@/ui/components/ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/ui/components/ui/alert-dialog';
import { useSettingsStore, ExportedSettings, ImportOptions } from '@shared/stores/settingsStore';
import { Upload, AlertCircle, CheckCircle2, Download } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { t } = useTranslation();
  const { validateImportData, importSettings } = useSettingsStore();
  
  const [importData, setImportData] = useState<ExportedSettings | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    operators: true,
    generalSettings: true,
    personalInfo: true,
    instructions: true
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate the imported data
        const validation = validateImportData(data);
        if (!validation.valid) {
          setError(validation.error || 'invalidFileFormat');
          setImportData(null);
          return;
        }

        setImportData(data);
        setError(null);
      } catch (err) {
        setError('invalidJSON');
        setImportData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData) return;

    setIsImporting(true);
    try {
      await importSettings(importData, importOptions);
      setSuccess(true);
      setImportData(null);
    } catch (err) {
      setError('importError');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setImportData(null);
    setError(null);
    setSuccess(false);
    setImportOptions({
      operators: true,
      generalSettings: true,
      personalInfo: true,
      instructions: true
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !error && !success} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t('importSettings')}
            </DialogTitle>
            <DialogDescription>
              {t('importSettingsDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File upload */}
            <div>
              <Label htmlFor="import-file">{t('selectFile')}</Label>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="w-full mt-2 text-sm"
              />
            </div>

            {/* Import options */}
            {importData && (
              <div className="space-y-3 border rounded-lg p-4">
                <Label className="text-base font-semibold">{t('selectImportOptions')}</Label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-operators"
                    checked={importOptions.operators}
                    onCheckedChange={(checked) => 
                      setImportOptions({ ...importOptions, operators: !!checked })
                    }
                  />
                  <Label htmlFor="import-operators" className="font-normal cursor-pointer">
                    {t('importOperators')}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-general"
                    checked={importOptions.generalSettings}
                    onCheckedChange={(checked) => 
                      setImportOptions({ ...importOptions, generalSettings: !!checked })
                    }
                  />
                  <Label htmlFor="import-general" className="font-normal cursor-pointer">
                    {t('importGeneralSettings')}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-personal"
                    checked={importOptions.personalInfo}
                    onCheckedChange={(checked) => 
                      setImportOptions({ ...importOptions, personalInfo: !!checked })
                    }
                  />
                  <Label htmlFor="import-personal" className="font-normal cursor-pointer">
                    {t('importPersonalInfo')}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-instructions"
                    checked={importOptions.instructions}
                    onCheckedChange={(checked) => 
                      setImportOptions({ ...importOptions, instructions: !!checked })
                    }
                  />
                  <Label htmlFor="import-instructions" className="font-normal cursor-pointer">
                    {t('importInstructions')}
                  </Label>
                </div>

                {/* File info */}
                <div className="mt-4 p-3 bg-muted rounded text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('version')}:</span>
                    <span className="font-medium">{importData.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('exportDate')}:</span>
                    <span className="font-medium">
                      {new Date(importData.exportDate).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!importData || isImporting}
            >
              {isImporting ? t('importing') : t('import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <AlertDialog open={!!error} onOpenChange={() => setError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t('importError')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {error && t(error)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setError(null)}>
              {t('close')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={success} onOpenChange={() => { setSuccess(false); handleClose(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {t('importSuccess')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('importSuccessDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setSuccess(false); handleClose(); }}>
              {t('close')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

