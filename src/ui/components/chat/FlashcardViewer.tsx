import { useState } from 'react';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Button } from '@/ui/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import type { Flashcard } from '@shared/types/flashcard';
import { useTranslation } from '@shared/i18n/useTranslation';

interface FlashcardViewerProps {
  cards: Flashcard[];
}

export default function FlashcardViewer({ cards }: FlashcardViewerProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (!cards || cards.length === 0) {
    return null;
  }

  const current = cards[currentIndex];

  return (
    <div className="space-y-3 max-w-2xl">
      {/* Карточка */}
      <Card 
        className="min-h-[200px] cursor-pointer transition-all hover:shadow-md" 
        onClick={handleFlip}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px]">
          <div className="text-center space-y-2 w-full">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {isFlipped ? t('flashcard_definition') : t('flashcard_term')}
            </div>
            <div className="text-lg font-medium break-words">
              {isFlipped ? current.definition : current.term}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Навигация */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrev} 
          disabled={cards.length <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleFlip}
            title={t('flashcard_flipCard')}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNext} 
          disabled={cards.length <= 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Подсказка */}
      <div className="text-xs text-center text-muted-foreground">
        {t('flashcard_clickToFlip')}
      </div>
    </div>
  );
}

