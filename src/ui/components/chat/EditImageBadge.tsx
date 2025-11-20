import { Edit, X } from 'lucide-react';
import { Badge } from '@/ui/components/ui/badge';
import { useTranslation } from '@shared/i18n/useTranslation';

interface EditImageBadgeProps {
  responseId: string;
  onRemove: () => void;
}

export default function EditImageBadge({ responseId, onRemove }: EditImageBadgeProps) {
  const { t } = useTranslation();
  const shortId = responseId.substring(0, 8);
  
  return (
    <Badge
      variant="secondary"
      className="inline-flex items-center gap-1 bg-purple-500 text-white dark:bg-purple-600 hover:bg-purple-600"
    >
      <Edit className="h-3 w-3" />
      <span className="text-xs">{t('editImageBadge')} {shortId}</span>
      <X 
        className="h-3 w-3 ml-1 cursor-pointer hover:opacity-70" 
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      />
    </Badge>
  );
}

