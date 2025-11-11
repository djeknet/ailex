import { File, FileCode, X } from 'lucide-react';
import { Badge } from '@/ui/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import { useTranslation } from '@shared/i18n/useTranslation';

interface AttachmentBadgeProps {
  type: 'file' | 'dom';
  name: string;
  onRemove?: () => void;
  readonly?: boolean;
}

export default function AttachmentBadge({ type, name, onRemove, readonly = false }: AttachmentBadgeProps) {
  const { t } = useTranslation();
  const isFile = type === 'file';
  const isDom = type === 'dom';
  const isInteractive = !readonly && onRemove;
  
  // Tooltip text
  const tooltipText = isFile 
    ? t('attachedFile').replace('{name}', name)
    : t('attachedDomElement').replace('{name}', name);
  
  const badgeContent = (
    <Badge
      variant="secondary"
      className={`inline-flex items-center gap-1 ${
        isInteractive ? 'cursor-pointer' : ''
      } ${
        isFile ? 'bg-blue-500 text-white dark:bg-blue-600 hover:bg-blue-600' : ''
      } ${
        isDom ? 'bg-red-500 text-white dark:bg-red-600 hover:bg-red-600' : ''
      }`}
      onClick={isInteractive ? onRemove : undefined}
    >
      {isFile && <File className="h-3 w-3" />}
      {isDom && <FileCode className="h-3 w-3" />}
      <span className="text-xs max-w-[150px] truncate">{name}</span>
      {isInteractive && <X className="h-3 w-3 ml-1" />}
    </Badge>
  );
  
  // Show tooltip only in readonly mode (chat history)
  if (readonly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return badgeContent;
}

