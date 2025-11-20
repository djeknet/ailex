import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { Label } from '@/ui/components/ui/label';
import { useOperatorSettingsStore } from '@shared/stores/operatorSettingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import type { AIOperator } from '@shared/types/ai';

interface ImageGenerationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: AIOperator;
}

type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
type Size = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
type Quality = 'low' | 'medium' | 'high' | 'auto';
type Format = 'png' | 'jpeg' | 'webp';
type Background = 'opaque' | 'transparent';
type InputFidelity = 'low' | 'high';
type Moderation = 'auto' | 'low';

// Token costs for OpenAI image generation
const TOKEN_COSTS = {
  low: { square: 272, portrait: 408, landscape: 400 },
  medium: { square: 1056, portrait: 1584, landscape: 1568 },
  high: { square: 4160, portrait: 6240, landscape: 6208 }
};

export default function ImageGenerationSettingsDialog({
  open,
  onOpenChange,
  operator
}: ImageGenerationSettingsDialogProps) {
  const { t } = useTranslation();
  const { getImageSettings, setImageSettings } = useOperatorSettingsStore();
  const currentSettings = getImageSettings(operator);
  
  // OpenRouter settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(currentSettings.imageAspectRatio || '1:1');
  
  // OpenAI settings
  const [size, setSize] = useState<Size>(currentSettings.size || 'auto');
  const [quality, setQuality] = useState<Quality>(currentSettings.quality || 'auto');
  const [format, setFormat] = useState<Format>(currentSettings.format || 'png');
  const [compression, setCompression] = useState<number>(currentSettings.compression || 80);
  const [background, setBackground] = useState<Background>(currentSettings.background || 'opaque');
  const [inputFidelity, setInputFidelity] = useState<InputFidelity>(currentSettings.inputFidelity || 'low');
  const [moderation, setModeration] = useState<Moderation>(currentSettings.moderation || 'auto');

  // Update local state when settings change
  useEffect(() => {
    const settings = getImageSettings(operator);
    if (operator === 'openrouter') {
      setAspectRatio(settings.imageAspectRatio || '1:1');
    } else if (operator === 'openai') {
      setSize(settings.size || 'auto');
      setQuality(settings.quality || 'auto');
      setFormat(settings.format || 'png');
      setCompression(settings.compression || 80);
      setBackground(settings.background || 'opaque');
      setInputFidelity(settings.inputFidelity || 'low');
      setModeration(settings.moderation || 'auto');
    }
  }, [operator, getImageSettings]);

  const ASPECT_RATIOS = [
    { value: '1:1' as AspectRatio, labelKey: 'aspectRatio_1_1' },
    { value: '2:3' as AspectRatio, labelKey: 'aspectRatio_2_3' },
    { value: '3:2' as AspectRatio, labelKey: 'aspectRatio_3_2' },
    { value: '3:4' as AspectRatio, labelKey: 'aspectRatio_3_4' },
    { value: '4:3' as AspectRatio, labelKey: 'aspectRatio_4_3' },
    { value: '4:5' as AspectRatio, labelKey: 'aspectRatio_4_5' },
    { value: '5:4' as AspectRatio, labelKey: 'aspectRatio_5_4' },
    { value: '9:16' as AspectRatio, labelKey: 'aspectRatio_9_16' },
    { value: '16:9' as AspectRatio, labelKey: 'aspectRatio_16_9' },
    { value: '21:9' as AspectRatio, labelKey: 'aspectRatio_21_9' },
  ];

  const handleAspectRatioChange = (value: string) => {
    const ratio = value as AspectRatio;
    setAspectRatio(ratio);
    setImageSettings(operator, {
      ...currentSettings,
      imageAspectRatio: ratio
    });
  };

  const handleSizeChange = (value: string) => {
    const newSize = value as Size;
    setSize(newSize);
    setImageSettings(operator, {
      ...currentSettings,
      size: newSize
    });
  };

  const handleQualityChange = (value: string) => {
    const newQuality = value as Quality;
    setQuality(newQuality);
    setImageSettings(operator, {
      ...currentSettings,
      quality: newQuality
    });
  };

  const handleFormatChange = (value: string) => {
    const newFormat = value as Format;
    setFormat(newFormat);
    setImageSettings(operator, {
      ...currentSettings,
      format: newFormat
    });
  };

  const handleCompressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCompression = parseInt(e.target.value, 10);
    setCompression(newCompression);
    setImageSettings(operator, {
      ...currentSettings,
      compression: newCompression
    });
  };

  const handleBackgroundChange = (value: string) => {
    const newBackground = value as Background;
    setBackground(newBackground);
    setImageSettings(operator, {
      ...currentSettings,
      background: newBackground
    });
  };

  const handleInputFidelityChange = (value: string) => {
    const newFidelity = value as InputFidelity;
    setInputFidelity(newFidelity);
    setImageSettings(operator, {
      ...currentSettings,
      inputFidelity: newFidelity
    });
  };

  const handleModerationChange = (value: string) => {
    const newModeration = value as Moderation;
    setModeration(newModeration);
    setImageSettings(operator, {
      ...currentSettings,
      moderation: newModeration
    });
  };

  // Calculate estimated tokens for OpenAI
  const getEstimatedTokens = () => {
    if (quality === 'auto' || size === 'auto') return null;
    
    const qualityKey = quality as 'low' | 'medium' | 'high';
    let sizeKey: 'square' | 'portrait' | 'landscape' = 'square';
    
    if (size === '1024x1536') sizeKey = 'portrait';
    else if (size === '1536x1024') sizeKey = 'landscape';
    
    return TOKEN_COSTS[qualityKey][sizeKey];
  };

  const estimatedTokens = getEstimatedTokens();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('imageGenerationSettings')}</DialogTitle>
          <DialogDescription>
            {t('imageGenerationSettingsDescription')} {operator === 'openrouter' ? 'OpenRouter' : 'OpenAI'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {operator === 'openrouter' && (
            <div className="space-y-2">
              <Label htmlFor="aspect-ratio">{t('aspectRatio')}</Label>
              <Select value={aspectRatio} onValueChange={handleAspectRatioChange}>
                <SelectTrigger id="aspect-ratio">
                  <SelectValue placeholder={t('selectAspectRatio')} />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {t(ratio.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('aspectRatioDescription')}
              </p>
            </div>
          )}
          
          {operator === 'openai' && (
            <>
              {/* Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="size">{t('imageSize')}</Label>
                  {estimatedTokens && (
                    <span className="text-xs text-muted-foreground">
                      ~{estimatedTokens} {t('tokensEstimate')}
                    </span>
                  )}
                </div>
                <Select value={size} onValueChange={handleSizeChange}>
                  <SelectTrigger id="size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('imageSizeAuto')}</SelectItem>
                    <SelectItem value="1024x1024">{t('imageSize1024x1024')}</SelectItem>
                    <SelectItem value="1536x1024">{t('imageSize1536x1024')}</SelectItem>
                    <SelectItem value="1024x1536">{t('imageSize1024x1536')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label htmlFor="quality">{t('imageQuality')}</Label>
                <Select value={quality} onValueChange={handleQualityChange}>
                  <SelectTrigger id="quality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('imageQualityAuto')}</SelectItem>
                    <SelectItem value="low">{t('imageQualityLow')}</SelectItem>
                    <SelectItem value="medium">{t('imageQualityMedium')}</SelectItem>
                    <SelectItem value="high">{t('imageQualityHigh')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('imageQualityDescription')}
                </p>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <Label htmlFor="format">{t('imageFormat')}</Label>
                <Select value={format} onValueChange={handleFormatChange}>
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('imageFormatDescription')}
                </p>
              </div>

              {/* Compression (only for JPEG/WebP) */}
              {(format === 'jpeg' || format === 'webp') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compression">{t('imageCompression')}</Label>
                    <span className="text-xs text-muted-foreground">{compression}%</span>
                  </div>
                  <input
                    type="range"
                    id="compression"
                    min={0}
                    max={100}
                    step={5}
                    value={compression}
                    onChange={handleCompressionChange}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('imageCompressionDescription')}
                  </p>
                </div>
              )}

              {/* Background (only for PNG/WebP) */}
              {(format === 'png' || format === 'webp') && (
                <div className="space-y-2">
                  <Label htmlFor="background">{t('imageBackground')}</Label>
                  <Select value={background} onValueChange={handleBackgroundChange}>
                    <SelectTrigger id="background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opaque">{t('imageBackgroundOpaque')}</SelectItem>
                      <SelectItem value="transparent">{t('imageBackgroundTransparent')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('imageBackgroundDescription')}
                  </p>
                </div>
              )}

              {/* Input Fidelity */}
              <div className="space-y-2">
                <Label htmlFor="input-fidelity">{t('imageInputFidelity')}</Label>
                <Select value={inputFidelity} onValueChange={handleInputFidelityChange}>
                  <SelectTrigger id="input-fidelity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('imageInputFidelityLow')}</SelectItem>
                    <SelectItem value="high">{t('imageInputFidelityHigh')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('imageInputFidelityDescription')}
                </p>
              </div>

              {/* Moderation */}
              <div className="space-y-2">
                <Label htmlFor="moderation">{t('imageModeration')}</Label>
                <Select value={moderation} onValueChange={handleModerationChange}>
                  <SelectTrigger id="moderation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('imageModerationAuto')}</SelectItem>
                    <SelectItem value="low">{t('imageModerationLow')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('imageModerationDescription')}
                </p>
              </div>
            </>
          )}
          
          {operator !== 'openrouter' && operator !== 'openai' && (
            <p className="text-sm text-muted-foreground">
              {t('imageGenerationNotAvailable')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

