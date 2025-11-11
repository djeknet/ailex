import { X } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';

interface ImagePreviewProps {
  images: Array<{
    data: string;
    name: string;
  }>;
  onRemove: (index: number) => void;
}

export default function ImagePreview({ images, onRemove }: ImagePreviewProps) {
  if (images.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mb-2" style={{ width: '100%', padding: '5px', paddingBottom: '0px' }}>
      {images.map((image, index) => (
        <div
          key={index}
          className="relative group"
        >
          <img
            src={`data:image/png;base64,${image.data}`}
            alt={image.name}
            className="w-20 h-20 object-cover rounded border border-border"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRemove(index)}
          >
            <X className="h-3 w-3" />
          </Button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-1 py-0.5 truncate rounded-b">
            {image.name}
          </div>
        </div>
      ))}
    </div>
  );
}

