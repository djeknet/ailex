import { useState, useEffect } from 'react';
import { ScrollText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import { Instruction } from '@shared/types/extension';
import { useTranslation } from '@shared/i18n/useTranslation';

interface InstructionBadgeProps {
  instructionId: string;
}

export default function InstructionBadge({ instructionId }: InstructionBadgeProps) {
  const { t } = useTranslation();
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const loadInstruction = async () => {
      try {
        const result = await chrome.storage.sync.get('instructions');
        const instructions = result.instructions || [];
        const found = instructions.find((inst: Instruction) => inst.id === instructionId);
        if (found) {
          setInstruction(found);
          console.log('[InstructionBadge] Instruction loaded:', found);
        }
      } catch (error) {
        console.error('[InstructionBadge] Error loading instruction:', error);
      }
    };

    loadInstruction();
  }, [instructionId]);

  if (!instruction) {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="inline-flex items-center gap-2 px-3 mb-2 bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors text-sm text-foreground"
              style={{ paddingTop: '5px', paddingBottom: '5px' }}
            >
              <ScrollText className="w-4 h-4" />
              <span className="font-medium">{instruction.name}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('instructionConnected')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              {instruction.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 whitespace-pre-wrap text-sm">
            {instruction.content}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

