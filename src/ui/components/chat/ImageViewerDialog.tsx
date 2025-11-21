import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/ui/components/ui/dialog';
import { Button } from '@/ui/components/ui/button';
import { useTranslation } from '@shared/i18n/useTranslation';
import { createFileDownload } from '@shared/utils/fileUtils';
import { useEffect } from 'react';

interface ImageViewerDialogProps {
  open: boolean;
  onClose: () => void;
  imageBase64: string;
  imageName: string;
}

export default function ImageViewerDialog({ 
  open, 
  onClose, 
  imageBase64, 
  imageName 
}: ImageViewerDialogProps) {
  const { t } = useTranslation();
  
  // Handle Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  
  const handleDownload = () => {
    // Convert base64 to blob and download
    const byteCharacters = atob(imageBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = imageName || 'image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
        <div className="relative">
          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-14 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {/* Image */}
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt={imageName}
            className="w-full h-auto max-h-[90vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

