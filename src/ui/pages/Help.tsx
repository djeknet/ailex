import { useTranslation } from '@shared/i18n/useTranslation';
import { HELP_SECTIONS } from '@shared/constants/helpSections';
import { EXTERNAL_URLS } from '@shared/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/ui/accordion';
import { ScrollArea } from '@ui/components/ui/scroll-area';
import { Button } from '@/ui/components/ui/button';
import VideoPlayer from '@ui/components/help/VideoPlayer';
import { useState } from 'react';
import { 
  MessageSquare, 
  Paperclip, 
  Wrench, 
  MousePointerClick, 
  History,
  ArrowLeft,
  Mail,
  Globe,
  MessagesSquare
} from 'lucide-react';

const categoryIcons = {
  chat: MessageSquare,
  media: Paperclip,
  tools: Wrench,
  'context-menu': MousePointerClick,
  history: History,
};

const categoryKeys: Record<string, string> = {
  'chat': 'chat',
  'media': 'media',
  'tools': 'tools',
  'context-menu': 'contextMenu',
  'history': 'history',
};

interface HelpProps {
  onBack?: () => void;
}

export default function Help({ onBack }: HelpProps = {}) {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState<string[]>([]);

  // Group sections by category
  const groupedSections = HELP_SECTIONS.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, typeof HELP_SECTIONS>);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">{t('helpPageTitle')}</h1>
          <div className="flex items-center gap-3">
            <a 
              href={`mailto:${EXTERNAL_URLS.CONTACT_EMAIL}`}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Email"
            >
              <Mail className="h-5 w-5" />
            </a>
            <a 
              href={EXTERNAL_URLS.CONTACT_WEBSITE}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Website"
            >
              <Globe className="h-5 w-5" />
            </a>
            <a 
              href={EXTERNAL_URLS.CONTACT_TELEGRAM}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Telegram"
            >
              <MessagesSquare className="h-5 w-5" />
            </a>
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back')}
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t('helpPageSubtitle')}</p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Accordion 
            type="multiple" 
            className="w-full space-y-4"
            value={openItems}
            onValueChange={setOpenItems}
          >
            {Object.entries(groupedSections).map(([category, sections]) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons];
              
              return (
                <div key={category} className="space-y-2">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-2">
                    {Icon && <Icon className="h-5 w-5 text-primary" />}
                    <h2 className="text-lg font-semibold">
                      {t(`helpCategory_${categoryKeys[category] || category}` as any)}
                    </h2>
                  </div>

                  {/* Category Items */}
                  {sections.map((section) => {
                    const isOpen = openItems.includes(section.id);
                    
                    return (
                      <AccordionItem 
                        key={section.id} 
                        value={section.id}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <span className="text-left font-medium">
                            {t(section.titleKey as any)}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          {/* Description */}
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {t(section.descriptionKey as any)}
                          </p>

                          {/* Video Player */}
                          {section.videoFile && (
                            <VideoPlayer 
                              videoFile={section.videoFile}
                              className="mt-4"
                              autoPlay={isOpen}
                            />
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </div>
              );
            })}
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}

