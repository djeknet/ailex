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
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { Button } from '@/ui/components/ui/button';
import { Copy, Search, Check } from 'lucide-react';

interface AvailableToolsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ToolExample {
  id: string;
  name: string;
  description: string;
  category: string;
  examples: {
    description: string;
    prompt: string;
  }[];
}

export default function AvailableToolsModal({ open, onOpenChange }: AvailableToolsModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const tools: ToolExample[] = [
    {
      id: 'execute-dom-function',
      name: t('tool_executeDOMFunction'),
      description: t('tool_executeDOMFunction_desc'),
      category: t('toolCategory_domManipulation'),
      examples: [
        {
          description: t('toolExample_setValue_desc'),
          prompt: t('toolExample_setValue_prompt')
        },
        {
          description: t('toolExample_clickElement_desc'),
          prompt: t('toolExample_clickElement_prompt')
        },
        {
          description: t('toolExample_getText_desc'),
          prompt: t('toolExample_getText_prompt')
        },
        {
          description: t('toolExample_selectOption_desc'),
          prompt: t('toolExample_selectOption_prompt')
        }
      ]
    },
    {
      id: 'fill-form-fields',
      name: t('tool_fillFormFields'),
      description: t('tool_fillFormFields_desc'),
      category: t('toolCategory_formAutomation'),
      examples: [
        {
          description: t('toolExample_fillMultipleFields_desc'),
          prompt: t('toolExample_fillMultipleFields_prompt')
        },
        {
          description: t('toolExample_fillSingleField_desc'),
          prompt: t('toolExample_fillSingleField_prompt')
        }
      ]
    },
    {
      id: 'get-form-fields',
      name: t('tool_getFormFields'),
      description: t('tool_getFormFields_desc'),
      category: t('toolCategory_formAutomation'),
      examples: [
        {
          description: t('toolExample_getFormFields_desc'),
          prompt: t('toolExample_getFormFields_prompt')
        }
      ]
    },
    {
      id: 'set-checkbox',
      name: t('tool_setCheckbox'),
      description: t('tool_setCheckbox_desc'),
      category: t('toolCategory_formAutomation'),
      examples: [
        {
          description: t('toolExample_checkCheckbox_desc'),
          prompt: t('toolExample_checkCheckbox_prompt')
        },
        {
          description: t('toolExample_uncheckCheckbox_desc'),
          prompt: t('toolExample_uncheckCheckbox_prompt')
        }
      ]
    },
    {
      id: 'submit-form',
      name: t('tool_submitForm'),
      description: t('tool_submitForm_desc'),
      category: t('toolCategory_formAutomation'),
      examples: [
        {
          description: t('toolExample_submitSpecificForm_desc'),
          prompt: t('toolExample_submitSpecificForm_prompt')
        },
        {
          description: t('toolExample_submitFirstForm_desc'),
          prompt: t('toolExample_submitFirstForm_prompt')
        }
      ]
    },
    {
      id: 'summarize',
      name: t('tool_summarize'),
      description: t('tool_summarize_desc'),
      category: t('toolCategory_contentAnalysis'),
      examples: [
        {
          description: t('toolExample_summarize_desc'),
          prompt: t('toolExample_summarize_prompt')
        }
      ]
    },
    {
      id: 'collect-contacts',
      name: t('tool_collectContacts'),
      description: t('tool_collectContacts_desc'),
      category: t('toolCategory_dataExtraction'),
      examples: [
        {
          description: t('toolExample_collectEmails_desc'),
          prompt: t('toolExample_collectEmails_prompt')
        },
        {
          description: t('toolExample_collectAllContacts_desc'),
          prompt: t('toolExample_collectAllContacts_prompt')
        }
      ]
    },
    {
      id: 'find-elements',
      name: t('tool_findElements'),
      description: t('tool_findElements_desc'),
      category: t('toolCategory_elementDiscovery'),
      examples: [
        {
          description: t('toolExample_findLoginButton_desc'),
          prompt: t('toolExample_findLoginButton_prompt')
        },
        {
          description: t('toolExample_findEmailField_desc'),
          prompt: t('toolExample_findEmailField_prompt')
        }
      ]
    },
    {
      id: 'parse-pages',
      name: t('tool_parsePages'),
      description: t('tool_parsePages_desc'),
      category: t('toolCategory_dataExtraction'),
      examples: [
        {
          description: t('toolExample_parsePages_desc'),
          prompt: t('toolExample_parsePages_prompt')
        }
      ]
    }
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(text);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  // Filter tools by search query
  const filteredTools = searchQuery
    ? tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tools;

  // Group by category
  const groupedTools = filteredTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ToolExample[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('availableToolsTitle')}</DialogTitle>
          <DialogDescription>{t('availableToolsDescription')}</DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[calc(85vh-180px)] pr-4">
          <div className="space-y-6 pb-2">
            {Object.entries(groupedTools).map(([category, categoryTools]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground sticky top-0 bg-background py-1">
                  {category}
                </h3>
                <div className="space-y-4">
                  {categoryTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="mb-3">
                        <h4 className="text-sm font-mono font-semibold text-primary mb-1">
                          {tool.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {tool.description}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t('examples')}:
                        </p>
                        {tool.examples.map((example, idx) => (
                          <div
                            key={idx}
                            className="bg-muted/50 rounded p-2 space-y-1"
                          >
                            <p className="text-xs font-medium">{example.description}</p>
                            <div className="flex items-start gap-2">
                              <code className="flex-1 text-xs bg-background rounded px-2 py-1 break-all">
                                {example.prompt}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleCopy(example.prompt)}
                              >
                                {copiedPrompt === example.prompt ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredTools.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('noResults')}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

