import { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Button } from '@/ui/components/ui/button';
import { useTranslation } from '@shared/i18n/useTranslation';

interface WebcamDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
}

export default function WebcamDialog({ open, onClose, onCapture }: WebcamDialogProps) {
  const { t } = useTranslation();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Start webcam when dialog opens
  useEffect(() => {
    if (!open) {
      // Stop stream when dialog closes
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setError(null);
      return;
    }
    
    // Request webcam access
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(mediaStream => {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch(err => {
        console.error('Error accessing webcam:', err);
        setError(t('cameraPermissionDenied'));
      });
  }, [open, t]);
  
  // Handle Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };
  
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    // Get base64 data
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        onCapture(base64);
        handleClose();
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('takePhoto')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded text-center">
              {error}
            </div>
          ) : (
            <div className="relative bg-black rounded overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              <X className="h-4 w-4 mr-2" />
              {t('cancel')}
            </Button>
            <Button
              onClick={handleCapture}
              disabled={!stream || !!error}
            >
              <Camera className="h-4 w-4 mr-2" />
              {t('takePhoto')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

