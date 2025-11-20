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
  suggestedQuestions?: string[];
  citations?: Citation[];
  generatedImages?: string;
  responseId?: string;
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
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onQuestionClick?: (question: string, operator?: string, model?: string) => void;
  onBranchChange?: (branchIndex: number) => void;
  
  // Config
  operators?: AIOperatorConfig[];
  isLoading?: boolean;
  generatingQuestionsForMessage?: string | null;
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
  onMouseEnter,
  onMouseLeave,
  onQuestionClick,
  onBranchChange,
  operators = [],
  isLoading = false,
  generatingQuestionsForMessage
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
      onBranchChange={onBranchChange}
      onQuestionClick={onQuestionClick}
      operators={operators}
      isLoading={isLoading}
      generatingQuestionsForMessage={generatingQuestionsForMessage}
    />
  );
}
