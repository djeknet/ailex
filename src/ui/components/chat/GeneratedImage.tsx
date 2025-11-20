import { useState } from 'react';
import { Download, Edit } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { useTranslation } from '@shared/i18n/useTranslation';

interface GeneratedImageProps {
  src: string;
  alt?: string;
  responseId?: string;
  imageGenerationCallId?: string;
  onEdit?: (responseId: string) => void;
}

export default function GeneratedImage({ 
  src, 
  alt = 'Generated image',
  responseId,
  imageGenerationCallId,
  onEdit
}: GeneratedImageProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `ailex-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = () => {
    if (responseId && onEdit) {
      onEdit(responseId);
    }
  };

  const handleLoad = () => {
    // Минимальная задержка для показа shimmer эффекта
    setTimeout(() => setLoading(false), 300);
  };

  return (
    <div 
      className="relative inline-block rounded-lg overflow-hidden max-w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Прелоадер с shimmer эффектом */}
      {loading && (
        <div className="absolute inset-0 bg-muted animate-pulse">
          <div className="h-full w-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" />
        </div>
      )}
      
      {/* Изображение */}
      <img
        src={src}
        alt={alt}
        className={`max-w-full h-auto transition-opacity duration-300 rounded-lg border border-border ${loading ? 'opacity-0' : 'opacity-100'}`}
        style={{ maxHeight: '600px' }}
        onLoad={handleLoad}
        onError={() => setLoading(false)}
      />
      
      {/* Кнопка "Изменить" при hover (если есть responseId) */}
      {hovered && !loading && responseId && onEdit && (
        <Button
          onClick={handleEdit}
          size="sm"
          className="absolute top-2 left-2 bg-background/90 hover:bg-background shadow-lg"
          variant="secondary"
        >
          <Edit className="w-4 h-4 mr-1" />
          <span className="text-xs">{t('editImage')}</span>
        </Button>
      )}
      
      {/* Кнопка скачивания при hover */}
      {hovered && !loading && (
        <Button
          onClick={handleDownload}
          size="sm"
          className="absolute top-2 right-2 bg-background/90 hover:bg-background shadow-lg"
          variant="secondary"
        >
          <Download className="w-4 h-4 mr-1" />
          <span className="text-xs">{t('downloadImage')}</span>
        </Button>
      )}
    </div>
  );
}

