import { ChatMessage } from '@shared/types/database';
import { useTranslation } from '@shared/i18n/useTranslation';
import { getTranslationLanguages } from '@shared/constants';
import type { AIOperatorConfig, AIOperator } from '@shared/types/extension';
import type { MessageBranch } from './MessageItem';
import { useWebSearchStore } from '@shared/stores/webSearchStore';
import { useChatStore } from '@shared/stores/chatStore';
import ToolExecutionDisplay from './ToolExecutionDisplay';
import GeneratedImage from './GeneratedImage';
import type { GeneratedImage as GeneratedImageType } from '@shared/types/ai';
import {
  Copy,
  Check,
  RefreshCw,
  ChevronsUpDown,
  Sparkles,
  BadgeCheck,
  Wand2,
  Languages,
  MessageSquare,
  WandSparkles
} from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from '@/ui/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import { Response } from '@/components/ai-elements/response';
import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
} from '@/components/ai-elements/branch';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselHeader,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationCarouselIndex,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationSource,
} from '@/components/ai-elements/inline-citation';
import CompareModelSelect from './CompareModelSelect';
import SuggestedQuestions from './SuggestedQuestions';

interface AIMessageProps {
  message: ChatMessage;
  branches: MessageBranch[];
  hasBranches: boolean;
  activeBranchIndex?: number;
  isCopied?: boolean;
  isComparing?: boolean;
  onCopy?: (text: string, messageId: string, withFormatting?: boolean) => void;
  onRewrite?: (messageId: string, action: string) => void;
  onCompare?: (messageId: string, operator: AIOperatorConfig, modelId: string) => void;
  onBranchChange?: (branchIndex: number) => void;
  onQuestionClick?: (question: string, operator?: string, model?: string) => void;
  operators?: AIOperatorConfig[];
  isLoading?: boolean;
  generatingQuestionsForMessage?: string | null;
}

export default function AIMessage({
  message,
  branches,
  hasBranches,
  activeBranchIndex = 0,
  isCopied = false,
  isComparing = false,
  onCopy,
  onRewrite,
  onCompare,
  onBranchChange,
  onQuestionClick,
  isLoading = false,
  generatingQuestionsForMessage
}: AIMessageProps) {
  const { t } = useTranslation();
  const { citationMode } = useWebSearchStore();
  const { setEditingImageResponseId } = useChatStore();

  // Handler for editing an image
  const handleEditImage = (responseId: string) => {
    console.log('[AIMessage] Edit image requested, responseId:', responseId);
    setEditingImageResponseId(responseId);
    
    // Focus on the input field
    // The input field will show the EditImageBadge automatically
    const textarea = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  };

  // Helper function to render generated images
  const renderGeneratedImages = (generatedImagesJson?: string, responseId?: string, messageId?: string, operator?: string) => {
    if (!generatedImagesJson) return null;
    
    try {
      const images: GeneratedImageType[] = JSON.parse(generatedImagesJson);
      if (!images || images.length === 0) return null;
      
      return (
        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((img, idx) => {
            // Для Gemini используем ID сообщения, для OpenAI - response_id
            const editId = operator === 'gemini' 
              ? messageId 
              : (img.response_id || responseId);
              
            return (
              <GeneratedImage
                key={idx}
                src={img.image_url.url}
                alt={`Generated image ${idx + 1}`}
                responseId={editId}
                imageGenerationCallId={img.image_generation_call_id}
                onEdit={editId ? handleEditImage : undefined}
              />
            );
          })}
        </div>
      );
    } catch (error) {
      console.error('[AIMessage] Error parsing generated images:', error);
      return null;
    }
  };

  // Helper function to render inline citations as custom badges
  const renderInlineCitations = (text: string, citations: any[]) => {
    // Разбиваем текст на параграфы
    const paragraphs = text.split('\n\n');
    const citationsPerParagraph = Math.ceil(citations.length / paragraphs.length);
    
    return (
      <>
        {paragraphs.map((para, paraIdx) => {
          const startIdx = paraIdx * citationsPerParagraph;
          const endIdx = Math.min((paraIdx + 1) * citationsPerParagraph, citations.length);
          const paraCitations = citations.slice(startIdx, endIdx);
          
          // Создаем badge'и для цитат
          const citationBadges = paraCitations.length > 0 ? (
            <>
              {paraCitations.map((citation, idx) => {
                const citationNumber = startIdx + idx + 1;
                return (
                  <TooltipProvider key={idx}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded text-[10px] font-medium  bg-muted text-muted-foreground hover:bg-muted/80 transition-colors no-underline ml-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          style={{ paddingLeft: '9px', paddingRight: '9px' }}
                        >
                          {citationNumber}
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs break-all">{citation.url}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </>
          ) : null;
          
          // Рендерим параграф через Response для markdown + badge'и в одной строке
          return (
            <div key={paraIdx} className="inline">
              <Response>{para}</Response>
              {citationBadges}
              {paraIdx < paragraphs.length - 1 && <br />}
            </div>
          );
        })}
      </>
    );
  };

  // Helper function to render message text with citations
  const renderMessageWithCitations = (text: string, citations?: any[], operator?: AIOperator) => {
    if (!citations || citations.length === 0) {
      return <Response>{text}</Response>;
    }

    // Для Gemini используем citationMode, для остальных всегда 'end'
    const mode = operator === 'gemini' ? citationMode : 'end';
    
    // Inline citations - кастомные badge'и с номерами в тексте
    if (mode === 'inline') {
      return <div className="text-base">{renderInlineCitations(text, citations)}</div>;
    }
    
    // Both - inline badges + блок в конце
    if (mode === 'both') {
      return (
        <div>
          <div className="text-base">{renderInlineCitations(text, citations)}</div>
          <span> </span>
          <InlineCitation>
            <InlineCitationCard>
              <InlineCitationCardTrigger sources={citations.map((c) => c.url)} />
              <InlineCitationCardBody>
                <InlineCitationCarousel>
                  <InlineCitationCarouselHeader>
                    <InlineCitationCarouselPrev />
                    <InlineCitationCarouselNext />
                    <InlineCitationCarouselIndex />
                  </InlineCitationCarouselHeader>
                  <InlineCitationCarouselContent>
                    {citations.map((citation, index) => (
                      <InlineCitationCarouselItem key={index}>
                        <InlineCitationSource
                          description={citation.cited_text || ''}
                          title={citation.title || citation.url}
                          url={citation.url}
                        />
                      </InlineCitationCarouselItem>
                    ))}
                  </InlineCitationCarouselContent>
                </InlineCitationCarousel>
              </InlineCitationCardBody>
            </InlineCitationCard>
          </InlineCitation>
        </div>
      );
    }

    // End (default) - только блок в конце
    return (
      <div>
        <Response>{text}</Response>
        <span> </span>
        <InlineCitation>
          <InlineCitationCard>
            <InlineCitationCardTrigger sources={citations.map((c) => c.url)} />
            <InlineCitationCardBody>
              <InlineCitationCarousel>
                <InlineCitationCarouselHeader>
                  <InlineCitationCarouselPrev />
                  <InlineCitationCarouselNext />
                  <InlineCitationCarouselIndex />
                </InlineCitationCarouselHeader>
                <InlineCitationCarouselContent>
                  {citations.map((citation, index) => (
                    <InlineCitationCarouselItem key={index}>
                      <InlineCitationSource
                        description={citation.cited_text || ''}
                        title={citation.title || citation.url}
                        url={citation.url}
                      />
                    </InlineCitationCarouselItem>
                  ))}
                </InlineCitationCarouselContent>
              </InlineCitationCarousel>
            </InlineCitationCardBody>
          </InlineCitationCard>
        </InlineCitation>
      </div>
    );
  };

  // Helper function to render action buttons for a message
  const renderActionButtons = (text: string, msgId: string, operator?: AIOperator, model?: string) => (
    <TooltipProvider>
      <div className="flex items-center gap-2 mt-2">
        {/* Operator icon with compare dropdown or loader */}
        {operator && (
          isComparing ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </Button>
          ) : (
            <CompareModelSelect
              onModelSelect={(op, modelId) => onCompare && onCompare(message.id, op, modelId)}
              currentOperator={operator}
              currentModel={model}
            />
          )
        )}

        {/* Copy button */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('copy')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onCopy && onCopy(text, msgId, true)}>
              {t('copyWithFormatting')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopy && onCopy(text, msgId, false)}>
              {t('copyWithoutFormatting')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Rewrite button - only show if there's text to rewrite */}
        {text && text.trim() && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <WandSparkles className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>{t('rewrite')}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t('rewriteAnswer')}
              </DropdownMenuLabel>
            
            <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'longer')}>
              <ChevronsUpDown className="h-4 w-4 mr-2" />
              {t('makeLonger')}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'improve')}>
              <Sparkles className="h-4 w-4 mr-2" />
              {t('improveWriting')}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'fix-spelling')}>
              <BadgeCheck className="h-4 w-4 mr-2" />
              {t('fixSpelling')}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'shorter')}>
              <ChevronsUpDown className="h-4 w-4 mr-2" />
              {t('makeShorter')}
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('changeTone')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'tone-professional')}>
                  {t('toneProfessional')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'tone-friendly')}>
                  {t('toneFriendly')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'tone-direct')}>
                  {t('toneDirect')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'tone-confident')}>
                  {t('toneConfident')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'tone-casual')}>
                  {t('toneCasual')}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'simplify')}>
              <Wand2 className="h-4 w-4 mr-2" />
              {t('simplifyLanguage')}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onRewrite && onRewrite(msgId, 'rephrase')}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('rephrase')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages className="h-4 w-4 mr-2" />
                {t('translateTo')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                {getTranslationLanguages().map((lang) => (
                  <DropdownMenuItem 
                    key={lang.code} 
                    onClick={() => onRewrite && onRewrite(msgId, `translate-${lang.code}`)}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );

  if (hasBranches) {
    // Render with Branch component if there are alternative responses
    return (
      <Branch
        key={`branch-${message.id}-${branches.length}`}
        defaultBranch={activeBranchIndex}
        onBranchChange={(branchIndex) => onBranchChange && onBranchChange(branchIndex)}
      >
        <BranchMessages>
          {/* Create a flat array of all pages */}
          {[
            /* Page 0: Original message */
            <div key="original">
              {/* Show tool executions if any */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mb-4 space-y-2">
                  {message.toolCalls.map((toolExecution) => (
                    <ToolExecutionDisplay key={toolExecution.id} toolExecution={toolExecution} />
                  ))}
                </div>
              )}
              
              <div className="rounded-lg p-4 text-base max-w-full overflow-hidden" style={{ paddingLeft: '6px' }}>
                {renderMessageWithCitations(message.text, message.citations, message.operator)}
              </div>
              
              {/* Show generated images if any */}
              {renderGeneratedImages(message.generatedImages, message.responseId, message.id, message.operator)}
              
              {renderActionButtons(message.text, message.id, message.operator, message.model)}
            </div>,
            
            /* Pages 1+: Alternative responses */
            ...branches.map((branch, idx) => (
              <div key={`branch-${idx}`}>
                <div className="rounded-lg p-4 text-base max-w-full overflow-hidden" style={{ paddingLeft: '6px' }}>
                  {renderMessageWithCitations(branch.text, branch.citations, branch.operator)}
                </div>
                
                {/* Show generated images if any */}
                {renderGeneratedImages(branch.generatedImages, branch.responseId, branch.id, branch.operator)}
                
                {renderActionButtons(branch.text, branch.id, branch.operator, branch.model)}
              </div>
            ))
          ]}
        </BranchMessages>
        
        {/* Branch navigation at the bottom with model names */}
        <div className="mt-2 flex items-center gap-2">
          <BranchSelector from="assistant">
            <BranchPrevious />
            <BranchPage />
            <BranchNext />
          </BranchSelector>
          <span className="text-xs text-muted-foreground ml-2">
            {/* Show current model name based on active branch */}
            {(() => {
              if (activeBranchIndex === 0) {
                return message.model || t('unknownModel');
              } else {
                const branch = branches[activeBranchIndex - 1];
                return branch?.model || t('unknownModel');
              }
            })()}
          </span>
        </div>
        
        {/* Show questions for active branch */}
        {(() => {
          const currentMessage = activeBranchIndex === 0 
            ? message 
            : branches[activeBranchIndex - 1];
          
          return (
            <SuggestedQuestions
              questions={currentMessage.suggestedQuestions || []}
              onQuestionClick={(question) => onQuestionClick && onQuestionClick(question, currentMessage.operator, currentMessage.model)}
              isLoading={isLoading}
              isGenerating={generatingQuestionsForMessage === currentMessage.id}
            />
          );
        })()}
      </Branch>
    );
  }

  // Render normal AI message without branches
  return (
    <>
      {/* Show tool executions if any */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mb-4 space-y-2">
          {message.toolCalls.map((toolExecution) => (
            <ToolExecutionDisplay key={toolExecution.id} toolExecution={toolExecution} />
          ))}
        </div>
      )}
      
      <div className="rounded-lg p-4 text-base max-w-full overflow-hidden" style={{ paddingLeft: '6px' }}>
        {renderMessageWithCitations(message.text, message.citations, message.operator)}
      </div>
      
      {/* Show generated images if any */}
      {renderGeneratedImages(message.generatedImages, message.responseId, message.id, message.operator)}
      
      {/* Action buttons for AI messages without branches */}
      {renderActionButtons(message.text, message.id, message.operator, message.model)}
      
      {/* Suggested questions */}
      <SuggestedQuestions
        questions={message.suggestedQuestions || []}
        onQuestionClick={(question) => onQuestionClick && onQuestionClick(question, message.operator, message.model)}
        isLoading={isLoading}
        isGenerating={generatingQuestionsForMessage === message.id}
      />
    </>
  );
}

