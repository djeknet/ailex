import { ChatMessage } from '@shared/types/database';
import { AIOperator, Citation } from '@shared/types/ai';
import type { AIOperatorConfig } from '@shared/types/extension';
import UserMessage from './UserMessage';
import AIMessage from './AIMessage';

export interface MessageBranch {
  id: string;
  operator: AIOperator;
  model: string;
  text: string;
  tokens?: number;
  suggestedQuestions?: string[];
  citations?: Citation[];
  generatedImages?: string;
  responseId?: string;
  reasoningContent?: string;
  reasoningDuration?: number;
}

interface MessageItemProps {
  message: ChatMessage;
  messages?: ChatMessage[];
  messageBranches?: Record<string, MessageBranch[]>;
  
  // State
  isCopied?: boolean;
  isHovered?: boolean;
  isComparing?: boolean;
  activeBranchIndex?: number;
  
  // Callbacks
  onCopy?: (text: string, messageId: string, withFormatting?: boolean) => void;
  onRewrite?: (messageId: string, action: string) => void;
  onCompare?: (messageId: string, operator: AIOperatorConfig, modelId: string) => void;
  onConsulSummary?: (messageId: string, operator: AIOperatorConfig, modelId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onQuestionClick?: (question: string, operator?: string, model?: string) => void;
  onBranchChange?: (branchIndex: number) => void;
  onRetry?: (messageId: string) => void;
  
  // Config
  operators?: AIOperatorConfig[];
  isLoading?: boolean;
  generatingQuestionsForMessage?: string | null;
  isLastUserMessage?: boolean;
  currentUrl?: string;
  favicon?: string | null;
}

export default function MessageItem({
  message,
  messages = [],
  messageBranches = {},
  isCopied = false,
  isHovered = false,
  isComparing = false,
  activeBranchIndex = 0,
  onCopy,
  onRewrite,
  onCompare,
  onConsulSummary,
  onMouseEnter,
  onMouseLeave,
  onQuestionClick,
  onBranchChange,
  onRetry,
  operators = [],
  isLoading = false,
  generatingQuestionsForMessage,
  isLastUserMessage = false,
  currentUrl,
  favicon
}: MessageItemProps) {
  const branches = messageBranches[message.id] || [];
  const hasBranches = branches.length > 0;

  if (message.isUser) {
    return (
      <UserMessage
        message={message}
        messages={messages}
        isCopied={isCopied}
        isHovered={isHovered}
        onCopy={onCopy}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        messageBranches={messageBranches}
        onRetry={onRetry}
        isLastUserMessage={isLastUserMessage}
      />
    );
  }

  return (
    <AIMessage
      message={message}
      branches={branches}
      hasBranches={hasBranches}
      activeBranchIndex={activeBranchIndex}
      isCopied={isCopied}
      isComparing={isComparing}
      onCopy={onCopy}
      onRewrite={onRewrite}
      onCompare={onCompare}
      onConsulSummary={onConsulSummary}
      onBranchChange={onBranchChange}
      onQuestionClick={onQuestionClick}
      operators={operators}
      isLoading={isLoading}
      generatingQuestionsForMessage={generatingQuestionsForMessage}
      currentUrl={currentUrl}
      favicon={favicon}
    />
  );
}
