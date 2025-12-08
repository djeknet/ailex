import { useState } from 'react';
import { useTranslation } from '@shared/i18n/useTranslation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Input } from '@/ui/components/ui/input';
import { Button } from '@/ui/components/ui/button';
import { Copy, Search, Check } from 'lucide-react';
import { ScrollArea } from '@/ui/components/ui/scroll-area';

interface DOMFunction {
  name: string;
  description: string;
  params: string;
  category: string;
}

interface DOMFunctionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DOMFunctionsModal({ open, onOpenChange }: DOMFunctionsModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedFunction, setCopiedFunction] = useState<string | null>(null);
  
  const domFunctions: DOMFunction[] = [
    // Навигация и DOM
    { name: 'getElements', description: t('domFunc_getElements'), params: 'selector: string, limit?: number, includeHidden?: boolean', category: t('domCategory_navigation') },
    { name: 'clickElement', description: t('domFunc_clickElement'), params: 'selector: string, index?: number', category: t('domCategory_navigation') },
    { name: 'setValue', description: t('domFunc_setValue'), params: 'selector: string, value: string', category: t('domCategory_navigation') },
    { name: 'selectOption', description: t('domFunc_selectOption'), params: 'selector: string, value: string', category: t('domCategory_navigation') },
    { name: 'focusElement', description: t('domFunc_focusElement'), params: 'selector: string', category: t('domCategory_navigation') },
    { name: 'setCheckbox', description: t('domFunc_setCheckbox'), params: 'selector: string, checked: boolean', category: t('domCategory_navigation') },
    { name: 'submitForm', description: t('domFunc_submitForm'), params: 'selector?: string', category: t('domCategory_navigation') },
    { name: 'hoverElement', description: t('domFunc_hoverElement'), params: 'selector: string', category: t('domCategory_navigation') },
    { name: 'scrollToElement', description: t('domFunc_scrollToElement'), params: 'selector: string, smooth?: boolean', category: t('domCategory_navigation') },
    
    // Получение данных
    { name: 'getCurrentUrl', description: t('domFunc_getCurrentUrl'), params: '-', category: t('domCategory_getData') },
    { name: 'getPageMetadata', description: t('domFunc_getPageMetadata'), params: '-', category: t('domCategory_getData') },
    { name: 'waitForPageLoad', description: t('domFunc_waitForPageLoad'), params: 'timeout?: number', category: t('domCategory_getData') },
    { name: 'getSimplifiedHTML', description: t('domFunc_getSimplifiedHTML'), params: '-', category: t('domCategory_getData') },
    { name: 'getLinks', description: t('domFunc_getLinks'), params: 'includeExternal?: boolean, limit?: number', category: t('domCategory_getData') },
    { name: 'getClickableElements', description: t('domFunc_getClickableElements'), params: 'dataDescription: string, limit?: number', category: t('domCategory_getData') },
    { name: 'getText', description: t('domFunc_getText'), params: 'maxLength?: number', category: t('domCategory_getData') },
    { name: 'getHTML', description: t('domFunc_getHTML'), params: '-', category: t('domCategory_getData') },
    { name: 'getDOMTree', description: t('domFunc_getDOMTree'), params: 'depth?: number, attributes?: string[]', category: t('domCategory_getData') },
    { name: 'getMeta', description: t('domFunc_getMeta'), params: '-', category: t('domCategory_getData') },
    { name: 'getSelection', description: t('domFunc_getSelection'), params: '-', category: t('domCategory_getData') },
    { name: 'getTableData', description: t('domFunc_getTableData'), params: 'selector: string', category: t('domCategory_getData') },
    { name: 'getFormData', description: t('domFunc_getFormData'), params: 'selector: string', category: t('domCategory_getData') },
    { name: 'getFormFields', description: t('domFunc_getFormFields'), params: '-', category: t('domCategory_getData') },
    
    // Манипуляция DOM
    { name: 'hideElements', description: t('domFunc_hideElements'), params: 'selector: string', category: t('domCategory_manipulation') },
    { name: 'addStyles', description: t('domFunc_addStyles'), params: 'selector: string, css: string', category: t('domCategory_manipulation') },
    { name: 'replaceStyles', description: t('domFunc_replaceStyles'), params: 'selector: string, css: string', category: t('domCategory_manipulation') },
    { name: 'injectHTML', description: t('domFunc_injectHTML'), params: 'selector: string, html: string', category: t('domCategory_manipulation') },
    { name: 'removeElements', description: t('domFunc_removeElements'), params: 'selector: string', category: t('domCategory_manipulation') },
    { name: 'highlightElements', description: t('domFunc_highlightElements'), params: 'selector: string, color?: string', category: t('domCategory_manipulation') },
    { name: 'replaceText', description: t('domFunc_replaceText'), params: 'oldText: string, newText: string, matchCase?: boolean', category: t('domCategory_manipulation') },
    
    // Скроллинг
    { name: 'scrollDown', description: t('domFunc_scrollDown'), params: 'pixels: number', category: t('domCategory_scrolling') },
    { name: 'scrollUp', description: t('domFunc_scrollUp'), params: 'pixels: number', category: t('domCategory_scrolling') },
    { name: 'scrollToTop', description: t('domFunc_scrollToTop'), params: '-', category: t('domCategory_scrolling') },
    { name: 'scrollToBottom', description: t('domFunc_scrollToBottom'), params: '-', category: t('domCategory_scrolling') },
    
    // Утилиты
    { name: 'isElementVisible', description: t('domFunc_isElementVisible'), params: 'selector: string', category: t('domCategory_utilities') },
    { name: 'fetchResource', description: t('domFunc_fetchResource'), params: 'url: string, headers?: Record<string, string>', category: t('domCategory_utilities') },
    { name: 'downloadFile', description: t('domFunc_downloadFile'), params: 'url: string, filename?: string', category: t('domCategory_utilities') },
    { name: 'copyToClipboard', description: t('domFunc_copyToClipboard'), params: 'text: string', category: t('domCategory_utilities') },
    { name: 'getImages', description: t('domFunc_getImages'), params: 'includeDataUri?: boolean', category: t('domCategory_utilities') },
    { name: 'youtubeTranscribe', description: t('domFunc_youtubeTranscribe'), params: 'language?: string, autoGenerated?: boolean', category: t('domCategory_utilities') },
    { name: 'getElementCode', description: t('domFunc_getElementCode'), params: 'selector: string, includeChildren?: boolean', category: t('domCategory_utilities') },
    { name: 'getElementPosition', description: t('domFunc_getElementPosition'), params: 'selector: string', category: t('domCategory_utilities') },
    { name: 'waitForElement', description: t('domFunc_waitForElement'), params: 'selector: string, timeout?: number', category: t('domCategory_utilities') },
    { name: 'executeJS', description: t('domFunc_executeJS'), params: 'script: string', category: t('domCategory_utilities') },
    { name: 'getViewportInfo', description: t('domFunc_getViewportInfo'), params: '-', category: t('domCategory_utilities') },
  ];
  
  const filteredFunctions = domFunctions.filter(fn => 
    fn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fn.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const groupedFunctions = filteredFunctions.reduce((acc, fn) => {
    if (!acc[fn.category]) {
      acc[fn.category] = [];
    }
    acc[fn.category].push(fn);
    return acc;
  }, {} as Record<string, DOMFunction[]>);
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFunction(text);
    setTimeout(() => setCopiedFunction(null), 2000);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('domFunctionsTitle')}</DialogTitle>
          <DialogDescription>
            {t('domFunctionsDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchDomFunctions')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <ScrollArea className="h-[calc(85vh-180px)] pr-4">
          <div className="space-y-6 pb-2">
            {Object.entries(groupedFunctions).map(([category, functions]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground sticky top-0 bg-background py-1">
                  {category}
                </h3>
                <div className="space-y-2">
                  {functions.map((fn) => (
                    <div
                      key={fn.name}
                      className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono font-semibold text-primary">
                              {fn.name}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => handleCopy(fn.name)}
                            >
                              {copiedFunction === fn.name ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {fn.description}
                          </p>
                          <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {fn.params}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {filteredFunctions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t('noResults')}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

