import { useChatStore } from '@shared/stores/chatStore';
import { useWebSearchStore } from '@shared/stores/webSearchStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { sendMessage as sendAIMessage } from '@shared/services/aiService';
import { ChatMessage } from '@shared/types/database';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Response } from '@/components/ai-elements/response';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@/components/ai-elements/reasoning';
import { 
  AlertCircle, 
  X,
  BrainIcon
} from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { useState, useEffect } from 'react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import ContextTruncatedDialog from './ContextTruncatedDialog';
import MessageItem, { type MessageBranch } from './MessageItem';
import ToolsGrid from './ToolsGrid';
import SitePromptsGrid from './SitePromptsGrid';
import ToolExecutionDisplay from './ToolExecutionDisplay';
import type { AIOperatorConfig } from '@shared/types/extension';

interface MessageListProps {
  isFullscreen?: boolean;
}

export default function MessageList({ isFullscreen = false }: MessageListProps) {
  const { t } = useTranslation();
  const { operators } = useSettingsStore();
  const { 
    messages, 
    streamingContent,
    streamingReasoning,
    activeToolExecutions, // Добавил
    isLoading, 
    error, 
    clearError, 
    addMessage, 
    sendUserMessage, 
    currentChat, 
    selectedOperator,
    setSelectedOperator,
    contextTruncationInfo,
    clearContextTruncationInfo,
    generatingQuestionsForMessage,
    generateSuggestedQuestions,
    sendSitePrompt
  } = useChatStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messageBranches, setMessageBranches] = useState<Record<string, MessageBranch[]>>({});
  const [activeBranches, setActiveBranches] = useState<Record<string, number>>({});
  const [comparingMessageId, setComparingMessageId] = useState<string | null>(null);
  const [compareAbortController, setCompareAbortController] = useState<AbortController | null>(null);
  const [compareError, setCompareError] = useState<{ messageId: string; error: string } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showTruncationDialog, setShowTruncationDialog] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(undefined);
  const [siteFavicon, setSiteFavicon] = useState<string | null>(null);

  // Get current tab URL and favicon
  useEffect(() => {
    const getCurrentTabInfo = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
          setCurrentUrl(tab.url);
          console.log('[MessageList] Current URL:', tab.url);
        }
        if (tab?.favIconUrl) {
          setSiteFavicon(tab.favIconUrl);
          console.log('[MessageList] Favicon:', tab.favIconUrl);
        }
      } catch (error) {
        console.error('[MessageList] Error getting current tab info:', error);
      }
    };
    
    getCurrentTabInfo();
  }, []);

  // Cleanup comparison AbortController on unmount
  useEffect(() => {
    return () => {
      if (compareAbortController) {
        compareAbortController.abort();
      }
    };
  }, [compareAbortController]);

  // Show truncation dialog when context was truncated
  useEffect(() => {
    if (contextTruncationInfo?.wasTruncated && !isLoading) {
      setShowTruncationDialog(true);
    }
  }, [contextTruncationInfo, isLoading]);

  // Load branches from messages when messages change
  useEffect(() => {
    const branches: Record<string, MessageBranch[]> = {};
    
    messages.forEach(msg => {
      if (msg.branchId && !msg.isUser) {
        // This is a branch message
        if (!branches[msg.branchId]) {
          branches[msg.branchId] = [];
        }
        branches[msg.branchId].push({
          id: msg.id,
          operator: msg.operator!,
          model: msg.model!,
          text: msg.text,
          suggestedQuestions: msg.suggestedQuestions,
          citations: msg.citations,
          generatedImages: msg.generatedImages,
          responseId: msg.responseId,
          reasoningContent: msg.reasoningContent,
          reasoningDuration: msg.reasoningDuration
        });
      }
    });
    
    setMessageBranches(branches);
  }, [messages]);

  const handleCopy = async (text: string, messageId: string, withFormatting: boolean = true) => {
    try {
      if (withFormatting) {
        await navigator.clipboard.writeText(text);
      } else {
        // Remove markdown formatting
        const plainText = text.replace(/[*_~`#]/g, '');
        await navigator.clipboard.writeText(plainText);
      }
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle retry - resend user message without creating duplicate
  const handleRetry = async (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message || !message.isUser) return;

      // Get attachments
      const getAttachments = () => {
        if (message.attachments) {
          try {
            return JSON.parse(message.attachments);
          } catch (error) {
            console.error('[MessageList] Failed to parse attachments:', error);
          }
        }
        return [];
      };

      const attachments = getAttachments();

      // Resend the message with all its metadata and retryMessageId to avoid duplication
      await sendUserMessage(
        message.text,
        undefined, // pageContext будет получен заново если включен
        message.replyTo,
        message.actionLabel,
        attachments,
        message.webSearch,
        message.instructionId ? { id: message.instructionId, content: '' } : undefined,
        message.quotedText,
        undefined, // previousResponseId
        messageId // retryMessageId - использовать существующее сообщение
      );
    } catch (error) {
      console.error('[MessageList] Error retrying message:', error);
    }
  };

  // Handle question click with automatic model switching
  const handleQuestionClick = async (question: string, operator?: string, model?: string) => {
    // If operator and model are provided (from branch), switch to that model
    if (operator && model && operators.length > 0) {
      const targetOperator = operators.find(op => op.operator === operator);
      if (targetOperator) {
        const operatorWithModel = {
          ...targetOperator,
          selectedModel: model
        };
        console.log('[MessageList] Switching to branch model:', { operator, model });
        setSelectedOperator(operatorWithModel);
      }
    }
    
    // Send the question using the (possibly updated) operator
    await sendUserMessage(question);
  };

  const handleRewrite = async (messageId: string, action: string) => {
    try {
      // Find the message - check both regular messages and branches
      let message = messages.find(m => m.id === messageId);
      
      // If not found in regular messages, search in all branches
      if (!message) {
        for (const [originalId, branches] of Object.entries(messageBranches)) {
          const branchMsg = branches.find(b => b.id === messageId);
          if (branchMsg) {
            message = {
              id: branchMsg.id,
              text: branchMsg.text,
              isUser: false,
              operator: branchMsg.operator,
              model: branchMsg.model,
              chatId: currentChat?.id || '',
              createdAt: Date.now(),
              tokens: 0,
              branchId: originalId
            };
            break;
          }
        }
      }
      
      if (!message || message.isUser) {
        console.error('[MessageList] Message not found or is user message:', messageId);
        return;
      }

      if (!currentChat || !selectedOperator) {
        console.error('[MessageList] No current chat or selected operator');
        return;
      }

      // Build the action label and prompt instruction
      let actionLabel = '';
      let promptInstruction = '';

      if (action === 'longer') {
        actionLabel = t('makeLonger');
        promptInstruction = t('promptMakeLonger');
      } else if (action === 'improve') {
        actionLabel = t('improveWriting');
        promptInstruction = t('promptImproveWriting');
      } else if (action === 'fix-spelling') {
        actionLabel = t('fixSpelling');
        promptInstruction = t('promptFixSpelling');
      } else if (action === 'shorter') {
        actionLabel = t('makeShorter');
        promptInstruction = t('promptMakeShorter');
      } else if (action === 'simplify') {
        actionLabel = t('simplifyLanguage');
        promptInstruction = t('promptSimplifyLanguage');
      } else if (action === 'rephrase') {
        actionLabel = t('rephrase');
        promptInstruction = t('promptRephrase');
      } else if (action.startsWith('tone-')) {
        const tone = action.replace('tone-', '');
        const toneLabels: Record<string, string> = {
          'professional': t('toneProfessional'),
          'friendly': t('toneFriendly'),
          'direct': t('toneDirect'),
          'confident': t('toneConfident'),
          'casual': t('toneCasual'),
        };
        actionLabel = `${t('changeTone')}: ${toneLabels[tone] || tone}`;
        promptInstruction = t('promptChangeTone').replace('{tone}', toneLabels[tone] || tone);
      } else if (action.startsWith('translate-')) {
        const langCode = action.replace('translate-', '');
        const langLabels: Record<string, string> = {
          'en': t('langEnglish'),
          'zh-CN': t('langChineseSimplified'),
          'zh-TW': t('langChineseTraditional'),
          'pt': t('langPortuguese'),
          'es': t('langSpanish'),
          'fr': t('langFrench'),
          'ko': t('langKorean'),
          'vi': t('langVietnamese'),
          'ja': t('langJapanese'),
          'ru': t('langRussian'),
          'de': t('langGerman'),
          'tr': t('langTurkish'),
          'it': t('langItalian'),
          'mk': t('langMacedonian'),
          'pl': t('langPolish'),
          'ar': t('langArabic'),
          'he': t('langHebrew'),
          'id': t('langIndonesian'),
          'sv': t('langSwedish'),
          'fil': t('langFilipino'),
          'no': t('langNorwegian'),
          'fi': t('langFinnish'),
          'cs': t('langCzech'),
          'da': t('langDanish'),
          'uk': t('langUkrainian'),
        };
        actionLabel = `${t('translateTo')}: ${langLabels[langCode] || langCode}`;
        promptInstruction = t('promptTranslateTo').replace('{language}', langLabels[langCode] || langCode);
      }

      if (!promptInstruction) {
        console.error('[MessageList] Unknown action:', action);
        return;
      }

      // Build the full prompt
      const fullPrompt = `${promptInstruction}\n\n${message.text}`;

      console.log('[MessageList] Rewrite action:', {
        messageId,
        action,
        actionLabel,
        promptInstruction,
        messageTextLength: message.text.length
      });

      // Send the message with quote reference
      await sendUserMessage(fullPrompt, undefined, messageId, actionLabel);

    } catch (error) {
      console.error('[MessageList] Error in handleRewrite:', error);
    }
  };

  const handleCompareResponse = async (
    messageId: string,
    operator: AIOperatorConfig,
    modelId: string
  ) => {
    // Temporary branch ID (defined outside try-catch for access in error handling)
    const tempBranchId = `msg_${Date.now()}_branch`;
    
    // Cancel previous comparison if exists
    if (compareAbortController) {
      console.log('[MessageList] Cancelling previous comparison request');
      compareAbortController.abort();
    }

    // Create new AbortController for this comparison
    const controller = new AbortController();
    setCompareAbortController(controller);
    
    // Set loading state - use chatStore's isLoading to show stop button
    setComparingMessageId(messageId);
    setCompareError(null);
    useChatStore.setState({ isLoading: true, activeRequestController: controller });

    try {
      // Find the original user message that triggered this AI response
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        throw new Error(t('errorMessageNotFound'));
      }
      
      // Find the previous user message
      let userMessage = null;
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].isUser) {
          userMessage = messages[i];
          break;
        }
      }
      
      if (!userMessage) {
        throw new Error(t('errorOriginalMessageNotFound'));
      }

      // Get current chat
      const { currentChat } = useChatStore.getState();
      if (!currentChat) {
        throw new Error(t('errorChatNotInitialized'));
      }

      // Prepare the operator config with selected model
      const compareOperator: AIOperatorConfig = {
        ...operator,
        selectedModel: modelId
      };

      // Prepare message history: all messages up to (but excluding) the original AI response
      // Exclude branch messages and the original AI response we're comparing against
      const chatMessages = messages
        .slice(0, messageIndex) // Take all messages before the original AI response
        .filter(m => m.chatId === currentChat.id && !m.branchId); // Exclude branch messages
      
      // Build context messages with smart page context insertion and attachments
      const contextMessages: any[] = [];
      
      // Helper to get page context from active tab
      const getPageContextFromTab = async (type: string): Promise<string | null> => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab.id) return null;
          
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'GET_PAGE_CONTEXT',
            data: { type }
          });
          
          if (response.success && response.data) {
            if (typeof response.data === 'string') {
              return response.data;
            } else if (response.data.content) {
              return response.data.content;
            }
          }
          return null;
        } catch (error) {
          console.error('[MessageList] Error getting page context:', error);
          return null;
        }
      };
      
      for (let i = 0; i < chatMessages.length; i++) {
        const m = chatMessages[i];
        // Message text already includes text attachments but NOT page context
        let content = m.text;
        
        // Add page context dynamically if message has it enabled
        if (m.pageContextEnabled && m.isUser && m.pageContextType && m.pageContextHash) {
          const prevMessages = chatMessages.slice(0, i);
          const lastWithSameContext = prevMessages.reverse().find(msg => 
            msg.pageContextEnabled && 
            msg.pageUrl === m.pageUrl &&
            msg.pageContextHash === m.pageContextHash
          );
          
          // Add context only if it's new or changed
          if (!lastWithSameContext) {
            const pageContext = await getPageContextFromTab(m.pageContextType);
            if (pageContext) {
              content += `\n\nPage context:\n${pageContext}`;
            }
          }
        }
        
        // Handle images and binary files - create multimodal content
        // First try new format (attachments)
        if (m.isUser && m.attachments) {
          try {
            const attachments = JSON.parse(m.attachments);
            const imageAttachments = attachments.filter((a: any) => a.type === 'image');
            const fileAttachments = attachments.filter((a: any) => a.type === 'file' && a.data.match(/^[A-Za-z0-9+/=]+$/));
            const tabAttachments = attachments.filter((a: any) => a.type === 'tab');
            
            // Add tab contents to message content (BEFORE creating multimodal)
            if (tabAttachments.length > 0) {
              console.log('[MessageList] Processing tab attachments for comparison:', {
                tabCount: tabAttachments.length,
                tabs: tabAttachments.map((t: any) => ({
                  title: t.tabTitle || t.name,
                  url: t.tabUrl,
                  dataLength: t.data?.length || 0
                }))
              });
              
              content += '\n\n--- Referenced Tabs ---';
              tabAttachments.forEach((tab: any, index: number) => {
                content += `\n\nTab ${index + 1}: ${tab.tabTitle || tab.name}`;
                if (tab.tabUrl) {
                  content += ` (${tab.tabUrl})`;
                }
                if (tab.data) {
                  content += `\nContent:\n${tab.data}`;
                } else {
                  console.warn('[MessageList] Tab attachment missing data:', tab);
                }
              });
              
              console.log('[MessageList] Final content length with tabs:', content.length);
            }
            
            // If has images or binary files, create multimodal content
            if (imageAttachments.length > 0 || fileAttachments.length > 0) {
              const contentParts: any[] = [{ type: 'text', text: content }];
              
              // Add images (already converted to PNG at upload time if needed)
              for (const img of imageAttachments) {
                const mimeType = img.mimeType || 'image/png';
                const imageData = img.data;
                
                contentParts.push({
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageData}`
                  }
                });
              }
              
              // Add binary files
              for (const file of fileAttachments) {
                const ext = file.name.split('.').pop()?.toLowerCase();
                let mimeType = 'application/octet-stream';
                if (ext === 'pdf') mimeType = 'application/pdf';
                else if (ext === 'doc') mimeType = 'application/msword';
                else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                
                contentParts.push({
                  type: 'document',
                  document: {
                    mimeType,
                    data: file.data
                  }
                });
              }
              
              contextMessages.push({
                role: 'user',
                content: contentParts
              });
              continue; // Skip adding as text message below
            }
          } catch (error) {
            console.error('[MessageList] Error parsing attachments:', error);
          }
        }
        
        // Fallback to old format for backward compatibility
        if (m.isUser && m.attach_type === 'image' && m.file_data) {
          // For images, use multimodal format
          // Try to get mimeType from old data if available
          const mimeType = 'image/png'; // Default for old format
          contextMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: content },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${m.file_data}`
                }
              }
            ]
          });
          continue; // Skip adding as text message below
        }
        
        // Handle binary files (PDF, etc.)
        if (m.isUser && m.attach_type === 'file' && m.file_data && m.attach_name) {
          // Check if it's base64 (binary file)
          const isBinary = m.file_data.match(/^[A-Za-z0-9+/=]+$/);
          if (isBinary) {
            // Determine MIME type from file extension
            const ext = m.attach_name.split('.').pop()?.toLowerCase();
            let mimeType = 'application/octet-stream';
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext === 'doc') mimeType = 'application/msword';
            else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            
            contextMessages.push({
              role: 'user',
              content: [
                { type: 'text', text: content },
                {
                  type: 'document',
                  document: {
                    url: `data:${mimeType};base64,${m.file_data}`,
                    filename: m.attach_name
                  }
                }
              ]
            });
            continue; // Skip adding as text message below
          }
        }
        
        contextMessages.push({
          role: m.isUser ? 'user' : 'assistant',
          content
        });
      }

      console.log('[MessageList] Prepared context for comparison:', {
        originalMessageIndex: messageIndex,
        totalMessages: messages.length,
        contextMessagesCount: contextMessages.length,
        messagesWithPageContext: chatMessages.filter(m => m.pageContextEnabled).length,
        userMessageText: userMessage.text.substring(0, 50),
        webSearchEnabled: userMessage.webSearch
      });

      // Get web search settings if web search was enabled in original message
      const webSearchSettings = userMessage.webSearch 
        ? useWebSearchStore.getState().getSettings(operator.operator)
        : undefined;

      // Accumulate streaming content and update branch state in real-time
      let accumulatedContent = '';
      let streamingBranchMessage: ChatMessage | null = null;

      // Send the request with the full context
      const response = await sendAIMessage(
        contextMessages,
        compareOperator,
        (chunk) => {
          accumulatedContent += chunk;
          console.log('[MessageList] Streaming chunk received:', chunk);
          
          // Create or update streaming branch message
          if (!streamingBranchMessage) {
            streamingBranchMessage = {
              id: tempBranchId,
              createdAt: Date.now(),
              chatId: currentChat.id,
              isUser: false,
              operator: operator.operator,
              model: modelId,
              branchId: messageId,
              text: accumulatedContent,
              tokens: 0
            };
            
            // Add temporary message to branches for immediate display
            setMessageBranches(prev => {
              const updated = { ...prev };
              if (!updated[messageId]) {
                updated[messageId] = [];
              }
              updated[messageId] = [...updated[messageId], {
                id: tempBranchId,
                operator: operator.operator,
                model: modelId,
                text: accumulatedContent
              }];
              return updated;
            });
            
            // Switch to the new branch immediately
            setActiveBranches(prev => ({
              ...prev,
              [messageId]: (messageBranches[messageId]?.length || 0) + 1
            }));
          } else {
            // Update streaming content in the branch
            setMessageBranches(prev => {
              const updated = { ...prev };
              const branchIndex = updated[messageId].length - 1;
              if (branchIndex >= 0) {
                updated[messageId][branchIndex] = {
                  ...updated[messageId][branchIndex],
                  text: accumulatedContent
                };
              }
              return updated;
            });
          }
        },
        userMessage.webSearch, // Pass web search flag from original message
        webSearchSettings, // Pass web search settings
        controller.signal // Pass abort signal for cancellation
      );

      console.log('[MessageList] Response received:', {
        contentLength: response.content?.length || 0,
        accumulatedLength: accumulatedContent.length,
        hasTokens: !!response.tokens,
        hasImages: !!response.images?.length
      });

      // Use accumulated content if available, otherwise use response.content
      const finalContent = accumulatedContent || response.content;

      // Allow empty content if images were generated
      if (!finalContent && (!response.images || response.images.length === 0)) {
        throw new Error(t('errorEmptyResponse'));
      }

      // Create final branch message and save to database
      const branchMessage: ChatMessage = {
        id: tempBranchId,
        createdAt: Date.now(),
        chatId: currentChat.id,
        isUser: false,
        operator: operator.operator,
        model: modelId,
        branchId: messageId, // Link to original message
        text: finalContent || '', // Allow empty text if images are present
        tokens: response.tokens?.total || 0,
        citations: response.citations, // Add citations from response
        generatedImages: response.images ? JSON.stringify(response.images) : undefined,
        responseId: response.response_id
      };

      console.log('[MessageList] Saving branch message:', {
        id: branchMessage.id,
        branchId: branchMessage.branchId,
        textLength: branchMessage.text.length,
        tokens: branchMessage.tokens,
        hasCitations: !!response.citations,
        citationsCount: response.citations?.length || 0
      });

      // Save to database and update local state
      await addMessage(branchMessage);

      console.log('[MessageList] Branch message saved to database and added to store');
      
      // Update or create branch with final data including images
      setMessageBranches(prev => {
        const updated = { ...prev };
        
        // If no branches exist yet (no streaming occurred), create the branch
        if (!updated[messageId] || updated[messageId].length === 0) {
          updated[messageId] = [{
            id: tempBranchId,
            operator: operator.operator,
            model: modelId,
            text: finalContent || '',
            generatedImages: response.images ? JSON.stringify(response.images) : undefined,
            responseId: response.response_id
          }];
        } else {
          // Update existing branch
          const branchIndex = updated[messageId].length - 1;
          if (branchIndex >= 0) {
            updated[messageId][branchIndex] = {
              ...updated[messageId][branchIndex],
              text: finalContent || '',
              generatedImages: response.images ? JSON.stringify(response.images) : undefined,
              responseId: response.response_id
            };
          }
        }
        
        return updated;
      });
      
      // Switch to the new branch if not already switched
      setActiveBranches(prev => {
        const currentBranchIndex = prev[messageId];
        const totalBranches = messageBranches[messageId]?.length || 0;
        
        // If we're still on the original message (no branch active), switch to the first branch
        if (currentBranchIndex === undefined || currentBranchIndex === 0) {
          return {
            ...prev,
            [messageId]: totalBranches > 0 ? totalBranches : 1
          };
        }
        
        return prev;
      });
      
      // Generate suggested questions for branch (asynchronously, non-blocking)
      const { useSettingsStore } = await import('@shared/stores/settingsStore');
      const { showAISuggestions } = useSettingsStore.getState();
      const hasGeneratedImages = !!response.images && response.images.length > 0;
      if (showAISuggestions && !hasGeneratedImages) {
        setTimeout(() => {
          generateSuggestedQuestions(
            branchMessage.id,
            finalContent || '',
            operator.operator,
            modelId
          );
        }, 500);
      }
    } catch (error) {
      // Check if error is AbortError
      const isAborted = error instanceof Error && 
        (error.name === 'AbortError' || error.message.includes('aborted'));
      
      if (isAborted) {
        console.log('[MessageList] Comparison request was aborted');
        // Remove the temporary streaming branch from messageBranches
        setMessageBranches(prev => {
          const updated = { ...prev };
          if (updated[messageId] && updated[messageId].length > 0) {
            // Remove the last branch (the one that was streaming)
            const lastBranch = updated[messageId][updated[messageId].length - 1];
            if (lastBranch.id === tempBranchId) {
              updated[messageId] = updated[messageId].slice(0, -1);
            }
          }
          return updated;
        });
        
        // Reset active branch index
        setActiveBranches(prev => {
          const updated = { ...prev };
          const branchCount = messageBranches[messageId]?.length || 0;
          if (branchCount > 0) {
            updated[messageId] = branchCount - 1; // Go back to previous branch
          } else {
            delete updated[messageId]; // No branches left, show original
          }
          return updated;
        });
        
        // Don't show error for aborted requests
        return;
      }
      
      // Log error only for non-abort errors
      console.error('[MessageList] Error comparing response:', error);
      
      // Determine user-friendly error message
      const errorMessage = error instanceof Error ? error.message : t('errorUnknownCompare');
      let userFriendlyError = errorMessage;
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        userFriendlyError = t('errorConnectionFailedCompare');
      } else if (errorMessage.includes('timeout')) {
        userFriendlyError = t('errorTimeoutCompare');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        userFriendlyError = t('errorAuthCompare');
      } else if (errorMessage.includes('429')) {
        userFriendlyError = t('errorRateLimitCompare');
      } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
        userFriendlyError = t('errorServerCompare');
      }
      
      setCompareError({ messageId, error: userFriendlyError });
    } finally {
      setComparingMessageId(null);
      setCompareAbortController(null);
      // Reset loading state
      useChatStore.setState({ isLoading: false, activeRequestController: null });
    }
  };

  if (messages.length === 0 && !error) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-center text-muted-foreground mb-6">
            <p className="text-lg mb-2">{t('askQuestion')}</p>
            <p className="text-sm">{t('startConversation')}</p>
          </div>
          
          <div className="w-full max-w-4xl space-y-6">
            {/* Site Prompts Grid - контекстные подсказки для сайтов */}
            {!isFullscreen && (
              <SitePromptsGrid
                currentUrl={currentUrl}
                favicon={siteFavicon}
                onPromptSelect={sendSitePrompt}
              />
            )}
            
            {/* Tools Grid - пользовательские инструменты */}
            <ToolsGrid 
              currentUrl={currentUrl}
              isFullscreen={isFullscreen}
              onToolSelect={async (tool) => {
                // Если инструмент требует контекст страницы, автоматически включаем его
                let pageContext: string | undefined;
                if (tool.requiresPageContext) {
                  try {
                    // Получаем текущую вкладку
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tab?.id) {
                      // Получаем контекст страницы
                      const response = await chrome.tabs.sendMessage(tab.id, {
                        type: 'GET_PAGE_CONTEXT',
                        data: { type: 'text' }
                      });
                      // Обрабатываем ответ - может быть строкой или объектом с полем content
                      if (typeof response === 'string') {
                        pageContext = response;
                      } else if (response?.content) {
                        pageContext = response.content;
                      } else if (response) {
                        // Если ответ - объект, пробуем stringify
                        pageContext = typeof response === 'object' ? JSON.stringify(response) : String(response);
                      }
                      console.log('[MessageList] Page context retrieved for tool:', { 
                        toolId: tool.id, 
                        length: pageContext?.length,
                        type: typeof pageContext 
                      });
                    }
                  } catch (error) {
                    console.error('[MessageList] Error getting page context for tool:', error);
                  }
                }
                
                // Вставляем команду инструмента в чат с контекстом если нужен
                sendUserMessage(tool.command, pageContext, undefined, undefined, [], false);
              }} 
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <Conversation className="overflow-x-hidden">
      <ConversationContent className="p-4 space-y-4 text-base max-w-full">
        {messages
          .filter(msg => !msg.branchId) // Filter out branch messages from main list
          .map((message, index, filteredMessages) => {
            // Determine if this is the last user message without a response
            const isLastUserMessage = message.isUser && 
              index === filteredMessages.length - 1;
            
            return (
            <MessageItem
              key={message.id}
              message={message}
              messages={messages}
              messageBranches={messageBranches}
              isCopied={copiedId === message.id}
              isHovered={hoveredMessageId === message.id}
              isComparing={comparingMessageId === message.id}
              activeBranchIndex={activeBranches[message.id] || 0}
              onCopy={handleCopy}
              onRewrite={handleRewrite}
              onCompare={handleCompareResponse}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              onQuestionClick={handleQuestionClick}
              onBranchChange={(branchIndex) => {
                setActiveBranches(prev => ({ ...prev, [message.id]: branchIndex }));
              }}
              onRetry={handleRetry}
              operators={operators}
              isLoading={isLoading}
              generatingQuestionsForMessage={generatingQuestionsForMessage}
              isLastUserMessage={isLastUserMessage}
              currentUrl={currentUrl}
              favicon={siteFavicon}
            />
            );
          })
        }

        {error && (
          <div className="flex justify-start">
            <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3 max-w-[80%] flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium mb-1">{t('error')}</p>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-1 -mt-1 hover:bg-destructive/20"
                onClick={clearError}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        )}

        {isLoading && (streamingContent || streamingReasoning) && (
          <div className="flex flex-col">
            {/* Show active tool executions */}
            {activeToolExecutions.length > 0 && (
              <div className="mb-4 space-y-2">
                {activeToolExecutions.map((execution) => (
                  <ToolExecutionDisplay key={execution.id} toolExecution={execution} />
                ))}
              </div>
            )}
            
            {/* Show streaming reasoning if available */}
            {streamingReasoning && (
              <Reasoning isStreaming={true} defaultOpen={true} className="pl-[5px]">
                <ReasoningTrigger>
                  <div className="flex items-center gap-2">
                    <BrainIcon className="size-4" />
                    <span className="text-muted-foreground text-sm">
                      Thinking
                      <span className="inline-flex gap-0.5 ml-1">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                      </span>
                    </span>
                  </div>
                </ReasoningTrigger>
                <ReasoningContent>{streamingReasoning}</ReasoningContent>
              </Reasoning>
            )}
            
            {/* Show streaming content */}
            {streamingContent && (
              <div className="rounded-lg p-4 max-w-[80%] text-base">
                <Response>{streamingContent}</Response>
              </div>
            )}
          </div>
        )}

        {isLoading && !streamingContent && !error && (
          <div className="flex flex-col gap-2">
            {/* Show active tool executions even without streaming content */}
            {activeToolExecutions.length > 0 && (
              <div className="w-full space-y-2">
                {activeToolExecutions.map((execution) => (
                  <ToolExecutionDisplay key={execution.id} toolExecution={execution} />
                ))}
              </div>
            )}
            
            {/* Always show loader when loading */}
            <div className="p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>

    {/* Error Dialog for comparison errors */}
    <Dialog open={!!compareError} onOpenChange={() => setCompareError(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t('errorComparingResponses')}
          </DialogTitle>
          <DialogDescription>
            {compareError?.error}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setCompareError(null)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Context Truncation Dialog */}
    {contextTruncationInfo && (
      <ContextTruncatedDialog
        open={showTruncationDialog}
        onOpenChange={(open) => {
          setShowTruncationDialog(open);
          if (!open) {
            clearContextTruncationInfo();
          }
        }}
        originalTokenCount={contextTruncationInfo.originalTokenCount}
        currentModel={contextTruncationInfo.currentModel}
        currentModelLimit={contextTruncationInfo.currentModelLimit}
      />
    )}
    </>
  );
}

