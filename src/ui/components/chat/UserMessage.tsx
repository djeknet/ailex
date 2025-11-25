import { useState, useEffect } from 'react';
import { ChatMessage, MessageAttachment } from '@shared/types/database';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useToolsStore } from '@shared/stores/toolsStore';
import { Copy, Check, RefreshCcw } from 'lucide-react';
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
import TabMentionBadge from './TabMentionBadge';
import ToolCommandBadge from './ToolCommandBadge';
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
  onRetry?: (messageId: string) => void;
  isLastUserMessage?: boolean;
}

export default function UserMessage({
  message,
  messages = [],
  isCopied = false,
  isHovered = false,
  onCopy,
  onMouseEnter,
  onMouseLeave,
  messageBranches = {},
  onRetry,
  isLastUserMessage = false
}: UserMessageProps) {
  const { t } = useTranslation();
  const [viewerImage, setViewerImage] = useState<{base64: string; name: string; mimeType?: string} | null>(null);
  const { getFilteredTools, loadTools } = useToolsStore();

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const handleCopyClick = () => {
    if (onCopy) {
      onCopy(message.text, message.id, true);
    }
  };
  
  // Parse text and replace commands with tool badges
  const parseTextWithCommands = (text: string) => {
    const tools = getFilteredTools();
    const commandRegex = /\/[\w-]+/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = commandRegex.exec(text)) !== null) {
      const command = match[0];
      const tool = tools.find(t => t.command === command);
      
      // Add text before command
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add tool badge or original command
      if (tool) {
        const toolName = tool.nameKey ? t(tool.nameKey) : tool.name;
        const toolDescription = tool.descriptionKey ? t(tool.descriptionKey) : tool.description;
        parts.push(
          <ToolCommandBadge 
            key={match.index}
            icon={tool.icon}
            name={toolName}
            description={toolDescription}
          />
        );
      } else {
        parts.push(command);
      }
      
      lastIndex = match.index + command.length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };
  
  // Parse attachments from new format
  const getAttachments = (): MessageAttachment[] => {
    if (message.attachments) {
      try {
        return JSON.parse(message.attachments);
      } catch (error) {
        console.error('[UserMessage] Failed to parse attachments:', error);
      }
    }
    // Fallback to old format
    if (message.attach_type && message.attach_name) {
      return [{
        type: message.attach_type,
        name: message.attach_name,
        data: message.file_data || '',
        xpath: message.xpath
      }];
    }
    return [];
  };
  
  const attachments = getAttachments();
  const imageAttachments = attachments.filter(a => a.type === 'image');
  const fileAttachments = attachments.filter(a => a.type === 'file');
  const domAttachments = attachments.filter(a => a.type === 'dom');
  const tabAttachments = attachments.filter(a => a.type === 'tab');

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
        {/* Action buttons - appear on hover to the left */}
        <div className="flex items-center gap-1">
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

          {/* Retry button - only for last user message without response */}
          {isLastUserMessage && onRetry && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => onRetry(message.id)}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('retryRequest')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

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
            <div className="bg-muted rounded-lg p-4 text-base max-w-full overflow-hidden">
              {/* Display image attachments in adaptive grid */}
              {imageAttachments.length > 0 && (
                <div 
                  className={`mb-3 grid gap-2 ${
                    imageAttachments.length === 1 ? 'grid-cols-1' :
                    imageAttachments.length === 2 ? 'grid-cols-2' :
                    imageAttachments.length === 3 ? 'grid-cols-3' :
                    'grid-cols-2'
                  }`}
                >
                  {imageAttachments.map((img, idx) => (
                    <img
                      key={idx}
                      src={`data:${img.mimeType || 'image/png'};base64,${img.data}`}
                      alt={img.name || `Image ${idx + 1}`}
                      className="w-full rounded cursor-pointer hover:opacity-80 transition-opacity border border-border object-cover"
                      style={{ 
                        maxHeight: imageAttachments.length === 1 ? '400px' : '200px',
                        aspectRatio: imageAttachments.length === 1 ? 'auto' : '1'
                      }}
                      onClick={() => setViewerImage({ 
                        base64: img.data, 
                        name: img.name || `image-${idx + 1}.png`,
                        mimeType: img.mimeType
                      })}
                    />
                  ))}
                </div>
              )}
              
              {/* Display text with inline file/dom/tab badges */}
              <div className="inline-block">
                {/* Display file/dom badges inline */}
                {fileAttachments.map((file, idx) => (
                  <AttachmentBadge
                    key={`file-${idx}`}
                    type="file"
                    name={file.name}
                    readonly={true}
                  />
                ))}
                {domAttachments.map((dom, idx) => (
                  <AttachmentBadge
                    key={`dom-${idx}`}
                    type="dom"
                    name={dom.name}
                    readonly={true}
                  />
                ))}
                {/* Display tab badges */}
                {tabAttachments.map((tab, idx) => {
                  console.log('[UserMessage] Tab attachment:', tab);
                  return (
                    <TabMentionBadge
                      key={`tab-${idx}`}
                      tab={{
                        id: idx, // Dummy ID for display
                        title: tab.tabTitle || tab.name,
                        url: tab.tabUrl || '',
                        favicon: tab.tabFavicon
                      }}
                      readonly={true}
                    />
                  );
                })}
                {parseTextWithCommands(message.text).map((part, idx) => 
                  typeof part === 'string' ? (
                    <Response key={idx}>{part}</Response>
                  ) : (
                    part
                  )
                )}
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
          mimeType={viewerImage.mimeType}
        />
      )}
    </div>
  );
}

