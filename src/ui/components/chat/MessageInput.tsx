import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@shared/stores/chatStore';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useToolsStore } from '@shared/stores/toolsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { getModelContextLimit, getModelCapabilities } from '@shared/constants';
import { readFileAsBase64, readTextFile, isTextFile, validateFileSize } from '@shared/utils/fileUtils';
import { captureScreenshot, compressImage } from '@shared/utils/screenshotUtils';
import { Button } from '@/ui/components/ui/button';
import { ButtonGroup } from '@/ui/components/ui/button-group';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/ui/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import {
  Paperclip,
  Globe,
  Settings,
  Mic,
  MoreHorizontal,
  FileText,
  Code,
  FileCode,
  Image as ImageIcon,
  Camera,
  Monitor,
  CircleFadingPlus,
  MousePointer2,
  Square,
  Send,
  Check,
} from 'lucide-react';
import InstructionSelector from './InstructionSelector';
import ModelSelect from './ModelSelect';
import AttachmentBadge from './AttachmentBadge';
import EditImageBadge from './EditImageBadge';
import ImagePreview from './ImagePreview';
import WebSearchSettingsDialog from './WebSearchSettingsDialog';
import ToolsCommandDropdown from './ToolsCommandDropdown';

type PageContextType = 'text' | 'dom' | 'html';

interface Attachment {
  type: 'file' | 'dom';
  name: string;
  data: string;
  xpath?: string;
}

interface ImageAttachment {
  data: string;
  name: string;
}

export default function MessageInput() {
  const { t } = useTranslation();
  const { maxFileSize = 10, maxImageSize = 5, instructions } = useSettingsStore();
  const { availableTools, loadTools } = useToolsStore();
  const [text, setText] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [webSearchSettingsOpen, setWebSearchSettingsOpen] = useState(false);
  const [showWebSearchTooltip, setShowWebSearchTooltip] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<string>('none');
  const [pageContextEnabled, setPageContextEnabled] = useState(true);
  const [pageContextType, setPageContextType] = useState<PageContextType>('text');
  const [siteFavicon, setSiteFavicon] = useState<string | null>(null);
  const [isSystemPage, setIsSystemPage] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  
  // Tools dropdown state
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  
  // Attachment state
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const [isSelectingScreenshot, setIsSelectingScreenshot] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    sendUserMessage, 
    isLoading, 
    selectedOperator, 
    setContextTruncationInfo, 
    stopGeneration, 
    setPageContextType: setGlobalPageContextType,
    editingImageResponseId,
    setEditingImageResponseId
  } = useChatStore();
  
  // Get model capabilities (default: enabled if model not found)
  const modelCapabilities = selectedOperator?.selectedModel 
    ? getModelCapabilities(selectedOperator.selectedModel, selectedOperator.operator)
    : { supportsFiles: true, supportsImages: true };

  // Load tools on mount
  useEffect(() => {
    loadTools();
  }, [loadTools]);

  // Listen for voice input capture
  useEffect(() => {
    const handleVoiceMessage = (message: any) => {
      if (message.type === 'VOICE_INPUT_CAPTURED' && message.data?.text) {
        setText(prev => prev + (prev ? ' ' : '') + message.data.text);
        setIsRecordingVoice(false);
      } else if (message.type === 'VOICE_INPUT_CANCELLED') {
        setIsRecordingVoice(false);
      }
    };
    
    chrome.runtime.onMessage.addListener(handleVoiceMessage);
    return () => chrome.runtime.onMessage.removeListener(handleVoiceMessage);
  }, []);

  // Listen for webcam photo capture
  useEffect(() => {
    const handleWebcamMessage = (message: any) => {
      if (message.type === 'WEBCAM_PHOTO_CAPTURED' && message.data?.base64) {
        handleWebcamCapture(message.data.base64);
      }
    };
    
    chrome.runtime.onMessage.addListener(handleWebcamMessage);
    return () => chrome.runtime.onMessage.removeListener(handleWebcamMessage);
  }, [maxImageSize]);

  useEffect(() => {
    // Get current tab favicon and check if it's a system page
    const checkCurrentTab = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if it's a system page
        const url = tab.url || '';
        const isSystem = url.startsWith('chrome://') || 
                        url.startsWith('chrome-extension://') || 
                        url.startsWith('edge://') || 
                        url.startsWith('about:') ||
                        url.startsWith('file://') ||
                        url === '';
        
        setIsSystemPage(isSystem);
        
        // Disable page context on system pages
        if (isSystem) {
          setPageContextEnabled(false);
        }
        
        // Set favicon
        if (tab.favIconUrl && !isSystem) {
          setSiteFavicon(tab.favIconUrl);
        } else {
          setSiteFavicon(null);
        }
        
        // Auto-select instruction based on domain
        if (!isSystem && url) {
          try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            
            // Find instruction matching the domain
            const matchedInstruction = instructions.find(i => 
              i.domain && domain.includes(i.domain)
            );
            
            if (matchedInstruction) {
              console.log('[MessageInput] Auto-selecting instruction:', matchedInstruction.name);
              setSelectedInstruction(matchedInstruction.id);
            }
          } catch (error) {
            console.error('[MessageInput] Error parsing URL for instruction:', error);
          }
        }
        
        // If there's a pending message and page is loaded, send it
        if (pendingMessage && tab.status === 'complete' && !isSystem) {
          console.log('[MessageInput] Page loaded, sending pending message');
          setText(pendingMessage);
          setPendingMessage(null);
          
          // Auto-submit after a short delay
          setTimeout(() => {
            const submitBtn = document.querySelector('[data-auto-submit="true"]') as HTMLButtonElement;
            submitBtn?.click();
          }, 100);
        }
      } catch (error) {
        console.error('Error checking tab:', error);
        setSiteFavicon(null);
        setIsSystemPage(false);
      }
    };

    checkCurrentTab();

    // Listen for tab updates
    const handleTabUpdate = () => {
      checkCurrentTab();
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabUpdate);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabUpdate);
    };
  }, [pendingMessage, instructions]);

  // Show tooltip when web search is activated
  useEffect(() => {
    if (useWebSearch) {
      setShowWebSearchTooltip(true);
      const timer = setTimeout(() => {
        setShowWebSearchTooltip(false);
      }, 2000); // Hide after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [useWebSearch]);

  // Watch for model changes and reset selection modes
  useEffect(() => {
    if (isSelectingElement || isSelectingScreenshot) {
      handleCancelSelection();
    }
    // Disable web search for LM Studio
    if (selectedOperator?.operator === 'lmstudio' && useWebSearch) {
      setUseWebSearch(false);
    }
    // Disable web search for Grok models that don't support it (only grok-4* supports web search)
    if (selectedOperator?.operator === 'grok' && selectedOperator?.selectedModel) {
      const modelId = selectedOperator.selectedModel.toLowerCase();
      if (!modelId.includes('grok-4') && useWebSearch) {
        setUseWebSearch(false);
      }
    }
  }, [selectedOperator?.selectedModel, selectedOperator?.operator, useWebSearch]);

  // Handle Esc key to cancel selection modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isSelectingElement || isSelectingScreenshot)) {
        handleCancelSelection();
      }
    };

    if (isSelectingElement || isSelectingScreenshot) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSelectingElement, isSelectingScreenshot]);

  // Listen for element selection results
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'ELEMENT_SELECTED') {
        setIsSelectingElement(false);
        const { xpath, name, innerHTML } = message.data;
        setAttachedFiles(prev => [...prev, {
          type: 'dom',
          name,
          data: innerHTML,
          xpath
        }]);
      } else if (message.type === 'ELEMENT_SELECTION_CANCELLED') {
        setIsSelectingElement(false);
      } else if (message.type === 'SCREENSHOT_AREA_SELECTED') {
        setIsSelectingScreenshot(false);
        const area = message.data;
        handleScreenshotCapture(area);
      } else if (message.type === 'SCREENSHOT_SELECTION_CANCELLED') {
        setIsSelectingScreenshot(false);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Track "/" command input for tools dropdown
  useEffect(() => {
    const shouldShow = text.startsWith('/') && text.length > 0;
    setShowToolsDropdown(shouldShow);
  }, [text]);

  const handleCancelSelection = async () => {
    if (isSelectingElement) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { type: 'STOP_ELEMENT_SELECTOR' });
      }
      setIsSelectingElement(false);
    }
    if (isSelectingScreenshot) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { type: 'STOP_SCREENSHOT_SELECTOR' });
      }
      setIsSelectingScreenshot(false);
    }
  };

  const handleAttachFile = () => {
    if (!modelCapabilities.supportsFiles) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // Validate file size
      if (!validateFileSize(file, maxFileSize)) {
        alert(t('fileTooLarge').replace('{size}', `${maxFileSize}MB`));
        continue;
      }

      try {
        let data: string;
        if (isTextFile(file.name)) {
          data = await readTextFile(file);
        } else {
          data = await readFileAsBase64(file);
        }

        setAttachedFiles(prev => [...prev, {
          type: 'file',
          name: file.name,
          data
        }]);
      } catch (error) {
        console.error('Error reading file:', error);
        alert(t('errorReadingFile'));
      }
    }

    // Reset input
    e.target.value = '';
  };

  const handleAttachImage = () => {
    if (!modelCapabilities.supportsImages) return;
    imageInputRef.current?.click();
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // Validate image size
      if (!validateFileSize(file, maxImageSize)) {
        alert(t('fileTooLarge').replace('{size}', `${maxImageSize}MB`));
        continue;
      }

      try {
        let data = await readFileAsBase64(file);
        
        // Compress if needed
        const sizeInMB = (data.length * 3) / 4 / 1024 / 1024;
        if (sizeInMB > maxImageSize) {
          data = await compressImage(data, maxImageSize);
        }

        setAttachedImages(prev => [...prev, {
          data,
          name: file.name
        }]);
      } catch (error) {
        console.error('Error reading image:', error);
        alert(t('errorReadingFile'));
      }
    }

    // Reset input
    e.target.value = '';
  };

  const handleTakeScreenshot = async () => {
    if (!modelCapabilities.supportsImages) return;
    
    setIsSelectingScreenshot(true);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_SCREENSHOT_AREA' });
    }
  };

  const handleScreenshotCapture = async (area: { x: number; y: number; width: number; height: number }) => {
    try {
      let data = await captureScreenshot(area);
      
      // Compress if needed
      const sizeInMB = (data.length * 3) / 4 / 1024 / 1024;
      if (sizeInMB > maxImageSize) {
        data = await compressImage(data, maxImageSize);
      }

      setAttachedImages(prev => [...prev, {
        data,
        name: `screenshot_${Date.now()}.png`
      }]);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert(t('errorCapturingScreenshot'));
    }
  };

  const handleTakePhoto = async () => {
    if (!modelCapabilities.supportsImages) return;
    
    // Open webcam in a popup window
    const width = 800;
    const height = 600;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    chrome.windows.create({
      url: chrome.runtime.getURL('src/ui/webcam/index.html'),
      type: 'popup',
      width,
      height,
      left: Math.round(left),
      top: Math.round(top)
    });
  };

  const handleVoiceInput = async () => {
    setIsRecordingVoice(true);
    
    // Open voice input in a popup window
    const width = 600;
    const height = 500;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    chrome.windows.create({
      url: chrome.runtime.getURL('src/ui/microphone/index.html'),
      type: 'popup',
      width,
      height,
      left: Math.round(left),
      top: Math.round(top)
    });
  };

  const handleWebcamCapture = async (base64: string) => {
    try {
      let data = base64;
      
      // Compress if needed
      const sizeInMB = (data.length * 3) / 4 / 1024 / 1024;
      if (sizeInMB > maxImageSize) {
        data = await compressImage(data, maxImageSize);
      }

      setAttachedImages(prev => [...prev, {
        data,
        name: `photo_${Date.now()}.png`
      }]);
    } catch (error) {
      console.error('Error processing photo:', error);
      alert(t('errorReadingFile'));
    }
  };

  const handleSelectElement = async () => {
    setIsSelectingElement(true);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_SELECTOR' });
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleToolSelect = (tool: any) => {
    setText(tool.command);
    setShowToolsDropdown(false);
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    if (!hasText || isLoading) return;

    const content = message.text!.trim();
    setText('');
    setShowToolsDropdown(false); // Скрыть dropdown при отправке
    
    // Prepare instruction data if selected
    let instructionData: { id: string; content: string } | undefined;
    if (selectedInstruction && selectedInstruction !== 'none') {
      const instruction = instructions.find(i => i.id === selectedInstruction);
      if (instruction) {
        instructionData = {
          id: instruction.id,
          content: instruction.content
        };
      }
    }
    
    // Prepare attachments
    const attachments = [
      ...attachedFiles,
      ...attachedImages.map(img => ({
        type: 'image' as const,
        name: img.name,
        data: img.data
      }))
    ];
    
    // Clear attachments
    setAttachedFiles([]);
    setAttachedImages([]);

    // Get page context if enabled
    let pageContext = '';
    let contextWasTruncated = false;
    let originalTokenCount = 0;
    
    if (pageContextEnabled) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id && tab.url) {
          // Check if this is a page where content scripts can run
          const url = new URL(tab.url);
          const isSystemPage = 
            url.protocol === 'chrome:' || 
            url.protocol === 'chrome-extension:' || 
            url.protocol === 'about:' || 
            url.protocol === 'file:' ||
            url.hostname === '';
          
          if (!isSystemPage) {
            // Get model's context limit
            const modelName = selectedOperator?.selectedModel || '';
            const operator = selectedOperator?.operator;
            const modelLimit = getModelContextLimit(modelName, operator);
            
            // Reserve tokens for conversation history and response
            // For large context models (>500K), we can use more for page context
            let contextPercentage = 0.4; // Default 40%
            if (modelLimit > 500000) {
              contextPercentage = 0.6; // 60% for models with >500K context
            } else if (modelLimit > 200000) {
              contextPercentage = 0.5; // 50% for models with >200K context
            }
            
            const maxContextTokens = Math.floor(modelLimit * contextPercentage);
            
            console.log('[MessageInput] Model context limit:', {
              model: modelName,
              operator,
              totalLimit: modelLimit,
              contextPercentage: `${contextPercentage * 100}%`,
              contextLimit: maxContextTokens
            });
            
            try {
              const response = await chrome.tabs.sendMessage(tab.id, {
                type: 'GET_PAGE_CONTEXT',
                data: { 
                  type: pageContextType,
                  maxTokens: maxContextTokens
                }
              });
              
              if (response?.success && response.data) {
                const contextData = response.data;
                pageContext = contextData.content || contextData; // Handle both old and new format
                contextWasTruncated = contextData.truncated || false;
                originalTokenCount = contextData.estimatedTokens || 0;
                
                console.log('[MessageInput] Page context retrieved:', {
                  length: pageContext.length,
                  truncated: contextWasTruncated,
                  originalTokens: originalTokenCount
                });
                
                // Store truncation info if context was truncated
                if (contextWasTruncated && setContextTruncationInfo) {
                  setContextTruncationInfo({
                    wasTruncated: true,
                    originalTokenCount,
                    currentModel: modelName,
                    currentModelLimit: modelLimit
                  });
                }
              }
            } catch (connError) {
              // Content script not injected - save message and ask to refresh
              console.warn('[MessageInput] Content script not available', connError);
              
              // Save the message for after page refresh
              setPendingMessage(content);
              setText(content); // Keep text in input
              
              // Show dialog asking to refresh
              const shouldRefresh = confirm(t('pageContextUnavailable'));
              if (shouldRefresh) {
                await chrome.tabs.reload(tab.id);
                return; // Will auto-submit after page loads
              } else {
                // User declined refresh, clear pending message and try to inject script
                setPendingMessage(null);
                
                try {
                  await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['src/content/index.ts']
                  });
                  
                  // Retry after injection
                  await new Promise(resolve => setTimeout(resolve, 100));
                  const retryResponse = await chrome.tabs.sendMessage(tab.id, {
                    type: 'GET_PAGE_CONTEXT',
                    data: { 
                      type: pageContextType,
                      maxTokens: maxContextTokens
                    }
                  });
                  
                  if (retryResponse?.success && retryResponse.data) {
                    const contextData = retryResponse.data;
                    pageContext = contextData.content || contextData;
                    contextWasTruncated = contextData.truncated || false;
                    originalTokenCount = contextData.estimatedTokens || 0;
                    
                    console.log('[MessageInput] Page context retrieved after injection:', {
                      length: pageContext.length,
                      truncated: contextWasTruncated,
                      originalTokens: originalTokenCount
                    });
                    
                    if (contextWasTruncated && setContextTruncationInfo) {
                      setContextTruncationInfo({
                        wasTruncated: true,
                        originalTokenCount,
                        currentModel: modelName,
                        currentModelLimit: modelLimit
                      });
                    }
                    
                    // Clear text now that we have context
                    setText('');
                  }
                } catch (injectError) {
                  console.warn('[MessageInput] Failed to inject content script or get context:', injectError);
                  // Continue without page context, clear text
                  setText('');
                }
              }
            }
          } else {
            console.log('[MessageInput] System page detected, skipping context extraction');
          }
        }
      } catch (error) {
        console.error('[MessageInput] Error getting page context:', error);
      }
    }

    console.log('[MessageInput] Submitting message:', {
      contentLength: content.length,
      hasPageContext: !!pageContext,
      pageContextLength: pageContext.length,
      attachmentsCount: attachments.length,
      hasInstruction: !!instructionData
    });

    // Pass attachments, web search enabled flag, and instruction data to sendUserMessage
    await sendUserMessage(content, pageContext, undefined, undefined, attachments, useWebSearch, instructionData);
  };

  return (
    <TooltipProvider>
      <div className="border-t p-4 bg-card relative">
        {/* Tools Command Dropdown */}
        <ToolsCommandDropdown
          text={text}
          tools={availableTools}
          onSelect={handleToolSelect}
          visible={showToolsDropdown}
        />
        
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            {/* Image previews */}
            {attachedImages.length > 0 && (
              <ImagePreview
                images={attachedImages}
                onRemove={handleRemoveImage}
              />
            )}
            
            {/* File/DOM badges above textarea */}
            {(attachedFiles.length > 0 || editingImageResponseId) && (
              <div className="flex flex-wrap gap-1 items-center mb-2" style={{ width: '100%', padding: '5px', paddingBottom: '0px' }}>
                {/* Edit image badge */}
                {editingImageResponseId && (
                  <EditImageBadge
                    responseId={editingImageResponseId}
                    onRemove={() => setEditingImageResponseId(null)}
                  />
                )}
                
                {/* File/DOM attachment badges */}
                {attachedFiles.map((file, index) => (
                  <AttachmentBadge
                    key={index}
                    type={file.type}
                    name={file.name}
                    onRemove={() => handleRemoveFile(index)}
                  />
                ))}
              </div>
            )}
            
            <PromptInputTextarea
              onChange={(event) => setText(event.target.value)}
              value={text}
              placeholder={t('messageInputPlaceholder')}
              className="min-h-[60px] max-h-[200px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={() => {
                // Cancel selection modes when clicking on chat input
                if (isSelectingElement || isSelectingScreenshot) {
                  handleCancelSelection();
                }
              }}
            />
          </PromptInputBody>
          
          <PromptInputFooter>
            <div className="flex items-center justify-between gap-2 w-full">
              {/* Left side tools */}
              <div className="flex items-center gap-2">
                <ButtonGroup>
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" type="button" className="h-10 w-10 flex items-center justify-center">
                          <Paperclip className="h-4 w-4" />
                          <span className="sr-only">{t('attach')}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>{t('attach')}</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuGroup>
                        <DropdownMenuItem 
                          onClick={handleAttachFile}
                          disabled={!modelCapabilities.supportsFiles}
                          title={!modelCapabilities.supportsFiles ? t('featureNotAvailableForModel') : ''}
                        >
                          <FileText className="h-4 w-4" />
                          {t('attachFile')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleAttachImage}
                          disabled={!modelCapabilities.supportsImages}
                          title={!modelCapabilities.supportsImages ? t('featureNotAvailableForModel') : ''}
                        >
                          <ImageIcon className="h-4 w-4" />
                          {t('attachPhoto')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleTakeScreenshot}
                          disabled={!modelCapabilities.supportsImages}
                          title={!modelCapabilities.supportsImages ? t('featureNotAvailableForModel') : ''}
                        >
                          <Monitor className="h-4 w-4" />
                          {t('takeScreenshot')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleTakePhoto}
                          disabled={!modelCapabilities.supportsImages}
                          title={!modelCapabilities.supportsImages ? t('featureNotAvailableForModel') : ''}
                        >
                          <Camera className="h-4 w-4" />
                          {t('takePhoto')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSelectElement}>
                          <MousePointer2 className="h-4 w-4" />
                          {t('selectElement')}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ButtonGroup>

                <ButtonGroup className="h-10">
                  <Tooltip open={showWebSearchTooltip} onOpenChange={setShowWebSearchTooltip}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => setUseWebSearch(!useWebSearch)}
                        disabled={
                          selectedOperator?.operator === 'lmstudio' ||
                          !!(selectedOperator?.operator === 'grok' && 
                             selectedOperator?.selectedModel && 
                             !selectedOperator.selectedModel.toLowerCase().includes('grok-4'))
                        }
                        className={useWebSearch ? 'text-primary h-10 w-10' : 'h-10 w-10'}
                      >
                        <Globe className="h-4 w-4" />
                        <span className="sr-only">{t('webSearch')}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="flex items-center gap-2">
                      <span>{t('webSearch')}</span>
                      {selectedOperator?.operator !== 'lmstudio' && 
                       !(selectedOperator?.operator === 'grok' && 
                         selectedOperator?.selectedModel && 
                         !selectedOperator.selectedModel.toLowerCase().includes('grok-4')) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setWebSearchSettingsOpen(true);
                          }}
                          className="hover:bg-accent p-1 rounded transition-colors"
                        >
                          <Settings className="h-3 w-3" />
                        </button>
                      )}
                      {selectedOperator?.operator === 'lmstudio' && (
                        <span className="text-xs text-muted-foreground">
                          ({t('notSupported')})
                        </span>
                      )}
                      {selectedOperator?.operator === 'grok' && 
                       selectedOperator?.selectedModel && 
                       !selectedOperator.selectedModel.toLowerCase().includes('grok-4') && (
                        <span className="text-xs text-muted-foreground">
                          ({t('notSupported')})
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </ButtonGroup>

                <WebSearchSettingsDialog
                  open={webSearchSettingsOpen}
                  onOpenChange={setWebSearchSettingsOpen}
                  operator={selectedOperator?.operator || 'anthropic'}
                />

                <ButtonGroup className="h-10">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => !isSystemPage && setPageContextEnabled(!pageContextEnabled)}
                        disabled={isSystemPage}
                        className={pageContextEnabled ? 'text-primary h-10' : 'h-10'}
                      >
                        <div className="relative flex items-center">
                          {siteFavicon ? (
                            <>
                              <img 
                                src={siteFavicon} 
                                alt="Site icon" 
                                className="h-4 w-4 mr-1 rounded-sm"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              {pageContextEnabled && (
                                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                              )}
                            </>
                          ) : (
                            <CircleFadingPlus className="h-4 w-4 mr-1" />
                          )}
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isSystemPage ? t('unavailableOnSystemPages') : t('currentPageContext')}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          disabled={!pageContextEnabled || isSystemPage}
                          className={pageContextEnabled ? 'text-primary h-10 w-10' : 'h-10 w-10'}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t('contextType')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>{t('contextType')}</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel>{t('contextType')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem 
                          onClick={() => {
                            setPageContextType('text');
                            setGlobalPageContextType('text');
                          }} 
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> 
                            {t('textOnly')}
                          </div>
                          {pageContextType === 'text' && <Check className="h-4 w-4 text-green-500" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setPageContextType('dom');
                            setGlobalPageContextType('dom');
                          }} 
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4" /> 
                            {t('domPage')}
                          </div>
                          {pageContextType === 'dom' && <Check className="h-4 w-4 text-green-500" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setPageContextType('html');
                            setGlobalPageContextType('html');
                          }} 
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <FileCode className="h-4 w-4" /> 
                            {t('htmlPage')}
                          </div>
                          {pageContextType === 'html' && <Check className="h-4 w-4 text-green-500" />}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ButtonGroup>
                <InstructionSelector value={selectedInstruction} onValueChange={setSelectedInstruction} />
              </div>

              {/* Right side tools */}
              <div className="flex items-center justify-end gap-2">
            
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={handleVoiceInput}
                      className={isRecordingVoice ? 'text-primary animate-pulse h-10 w-10 flex items-center justify-center' : 'h-10 w-10 flex items-center justify-center'}
                    >
                      <Mic className="h-4 w-4" />
                      <span className="sr-only">{t('microphone')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('microphone')}</TooltipContent>
                </Tooltip>

                <ModelSelect />

                {isLoading ? (
                  // Stop button during generation
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={async () => {
                          const restoredText = await stopGeneration();
                          if (restoredText) {
                            setText(restoredText);
                          }
                        }}
                        className="bg-muted hover:bg-muted/80 h-10 w-10 flex items-center justify-center rounded-full"
                      >
                        <Square className="h-4 w-4" />
                        <span className="sr-only">{t('stopGeneration')}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('stopGeneration')}</TooltipContent>
                  </Tooltip>
                ) : (
                  // Send button
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => {
                          if (text.trim() && !isLoading) {
                            handleSubmit({ text });
                          }
                        }}
                        disabled={!text.trim()}
                        className={text.trim() ? 'bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-10 flex items-center justify-center' : 'h-10 w-10 flex items-center justify-center'}
                      >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">{t('sendMessage')}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('sendMessage')}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </TooltipProvider>
  );
}

