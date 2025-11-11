import { useState } from 'react';
import { ChatMessage } from '@shared/types/database';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import { Response } from '@/components/ai-elements/response';
import PageContextBadge from './PageContextBadge';
import InstructionBadge from './InstructionBadge';
import QuotedMessage from './QuotedMessage';
import ImageViewerDialog from './ImageViewerDialog';
import AttachmentBadge from './AttachmentBadge';
import type { MessageBranch } from './MessageItem';

interface UserMessageProps {
  message: ChatMessage;
  messages?: ChatMessage[];
  isCopied?: boolean;
  isHovered?: boolean;
  onCopy?: (text: string, messageId: string, withFormatting?: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  messageBranches?: Record<string, MessageBranch[]>;
}

export default function UserMessage({
  message,
  messages = [],
  isCopied = false,
  isHovered = false,
  onCopy,
  onMouseEnter,
  onMouseLeave,
  messageBranches = {}
}: UserMessageProps) {
  const { t } = useTranslation();
  const [viewerImage, setViewerImage] = useState<{base64: string; name: string} | null>(null);

  const handleCopyClick = () => {
    if (onCopy) {
      onCopy(message.text, message.id, true);
    }
  };

  // Helper to find quoted message
  const getQuotedMessage = () => {
    // First check if message has quotedText (for context menu actions)
    if (message.quotedText) {
      return message.quotedText;
    }

    // Then check if there's a replyTo
    if (!message.replyTo) return null;

    // Search in regular messages
    const quotedMessage = messages.find(m => m.id === message.replyTo);
    if (quotedMessage) {
      return quotedMessage.text;
    }

    // Then search in branches
    for (const branches of Object.values(messageBranches)) {
      const branchMsg = branches.find(b => b.id === message.replyTo);
      if (branchMsg) {
        return branchMsg.text;
      }
    }
    
    return null;
  };

  return (
    <div className="flex flex-col items-end">
      {/* Instruction badge - shown above the message */}
      {message.instructionId && (
        <InstructionBadge instructionId={message.instructionId} />
      )}

      {/* Page context badge - shown above the message */}
      {message.pageContextEnabled && message.pageTitle && (
        <PageContextBadge 
          pageTitle={message.pageTitle}
          pageIcon={message.pageIcon}
          pageUrl={message.pageUrl}
        />
      )}

      {/* User message with hover copy button */}
      <div 
        className="relative flex items-start gap-2 group"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Copy button - appears on hover to the left */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleCopyClick}
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('copy')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User message */}
        <div className="flex flex-col gap-2">
          {/* Action label and quoted message */}
          {message.actionLabel && (message.replyTo || message.quotedText) && (
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-primary">
                {message.actionLabel}
              </div>
              {(() => {
                const quotedText = getQuotedMessage();
                if (quotedText) {
                  return <QuotedMessage text={quotedText} />;
                }
                return null;
              })()}
            </div>
          )}
          
          {/* Show only action label for rewrite actions, or full text for regular messages */}
          {!message.replyTo && !message.quotedText && (
            <div className="bg-muted rounded-lg p-4 text-base">
              {/* Display image attachments above text */}
              {message.attach_type === 'image' && message.file_data && (
                <div className="mb-3">
                  <img
                    src={`data:image/png;base64,${message.file_data}`}
                    alt={message.attach_name || 'Attached image'}
                    className="max-w-full rounded cursor-pointer hover:opacity-80 transition-opacity border border-border"
                    style={{ maxHeight: '400px' }}
                    onClick={() => setViewerImage({ 
                      base64: message.file_data!, 
                      name: message.attach_name || 'image.png' 
                    })}
                  />
                </div>
              )}
              
              {/* Display text with inline file/dom badges */}
              <div className="flex flex-wrap items-center gap-1">
                {/* Display file/dom badges inline */}
                {(message.attach_type === 'file' || message.attach_type === 'dom') && message.attach_name && (
                  <AttachmentBadge
                    type={message.attach_type}
                    name={message.attach_name}
                    readonly={true}
                  />
                )}
                <Response>{message.text}</Response>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image viewer dialog */}
      {viewerImage && (
        <ImageViewerDialog
          open={!!viewerImage}
          onClose={() => setViewerImage(null)}
          imageBase64={viewerImage.base64}
          imageName={viewerImage.name}
        />
      )}
    </div>
  );
}

