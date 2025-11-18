import { BadgeHelp, Plus } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { Skeleton } from '@/ui/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import { useTranslation } from '@shared/i18n/useTranslation';

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  isLoading: boolean; // Blocks buttons when sending any request
  isGenerating: boolean; // Shows skeleton loading for this message
}

export default function SuggestedQuestions({ 
  questions, 
  onQuestionClick, 
  isLoading,
  isGenerating
}: SuggestedQuestionsProps) {
  const { t } = useTranslation();

  // Helper to strip HTML tags (for safety with old saved questions)
  const stripHtml = (text: string): string => {
    return text.replace(/<[^>]*>/g, '').trim();
  };

  // Don't render if no questions and not generating
  if (questions.length === 0 && !isGenerating) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <BadgeHelp className="w-3.5 h-3.5" />
        <span>{t('relatedQuestions')}</span>
      </div>
      
      {isGenerating ? (
        // Show skeleton loaders while generating
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10" style={{ width: `${Math.random() * 40 + 40}%` }} />
          <Skeleton className="h-10" style={{ width: `${Math.random() * 40 + 40}%` }} />
          <Skeleton className="h-10" style={{ width: `${Math.random() * 40 + 40}%` }} />
        </div>
      ) : (
        // Show actual questions
        <div className="flex flex-wrap gap-2">
          {questions.map((question, index) => {
            // Clean question from any HTML tags
            const cleanQuestion = stripHtml(question);
            const truncatedQuestion = cleanQuestion.length > 70 
              ? cleanQuestion.substring(0, 70) + '...' 
              : cleanQuestion;

            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-left whitespace-normal justify-start hover:bg-accent/50 transition-colors"
                      onClick={() => onQuestionClick(cleanQuestion)}
                      disabled={isLoading}
                    >
                      <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs">{truncatedQuestion}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-xs">{cleanQuestion}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      )}
    </div>
  );
}

