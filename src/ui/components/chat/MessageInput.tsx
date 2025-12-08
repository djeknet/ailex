import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '@shared/stores/chatStore';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useToolsStore } from '@shared/stores/toolsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { getModelContextLimit, getModelCapabilities } from '@shared/constants';
import { readFileAsBase64, readTextFile, isTextFile, validateFileSize } from '@shared/utils/fileUtils';
import { captureScreenshot, compressImage } from '@shared/utils/screenshotUtils';
import { isPdfPage, getPdfUrlFromPage, extractFilenameFromUrl } from '@shared/utils/pageUtils';
import { chatAPI, historyAPI } from '@shared/utils/messaging';
import { ChatMessage } from '@shared/types/database';
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
  AtSign,
} from 'lucide-react';
import InstructionSelector from './InstructionSelector';
import ModelSelect from './ModelSelect';
import AttachmentBadge from './AttachmentBadge';
import EditImageBadge from './EditImageBadge';
import ImagePreview from './ImagePreview';
import WebSearchSettingsDialog from './WebSearchSettingsDialog';
import ToolsCommandDropdown from './ToolsCommandDropdown';
import TabMentionDropdown from './TabMentionDropdown';
import TabMentionBadge from './TabMentionBadge';
import { TabReference } from '@shared/types/extension';

type PageContextType = 'text' | 'dom' | 'html';

interface FileAttachment {
  type: 'file' | 'dom';
  name: string;
  data: string;
  xpath?: string;
}

interface TabAttachment {
  type: 'tab';
  name: string;
  data: string;
  tabUrl?: string;
  tabTitle?: string;
}

interface ImageAttachment {
  data: string;
  name: string;
  mimeType?: string;
}

interface MessageInputProps {
  isFullscreen?: boolean;
}

export default function MessageInput({ isFullscreen = false }: MessageInputProps) {
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
  const [contentScriptAvailable, setContentScriptAvailable] = useState(true);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  
  // Tools dropdown state
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  
  // Tab mention dropdown state
  const [showTabMentionDropdown, setShowTabMentionDropdown] = useState(false);
  
  // Attachment state
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [attachedTabs, setAttachedTabs] = useState<TabReference[]>([]);
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const [isSelectingScreenshot, setIsSelectingScreenshot] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  
  // Autocomplete state
  const [userMessageHistory, setUserMessageHistory] = useState<string[]>([]);
  const [matchedSuggestions, setMatchedSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [autocompleteSuggestion, setAutocompleteSuggestion] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    sendUserMessage, 
    isLoading, 
    selectedOperator, 
    setContextTruncationInfo, 
    stopGeneration, 
    setPageContextType: setGlobalPageContextType,
    editingImageResponseId,
    setEditingImageResponseId,
    editingMessage,
    setEditingMessage,
    currentChat,
    createNewChat
  } = useChatStore();
  
  // Get model capabilities (default: enabled if model not found)
  const modelCapabilities = selectedOperator?.selectedModel 
    ? getModelCapabilities(selectedOperator.selectedModel, selectedOperator.operator)
    : { supportsFiles: true, supportsImages: true };

  // Load tools on mount
  useEffect(() => {
    loadTools();
  }, [loadTools]);

  // Load user message history for autocomplete
  useEffect(() => {
    const loadUserMessageHistory = async () => {
      try {
        // Get all chats
        const allChats = await chatAPI.getAllChats();
        
        if (!allChats || allChats.length === 0) {
          return;
        }
        
        // Collect all user messages from all chats
        const allUserMessages: string[] = [];
        
        for (const chat of allChats) {
          try {
            const messages = await historyAPI.getMessages(chat.id);
            messages
              .filter((msg: ChatMessage) => msg.isUser && msg.text && msg.text.trim().length > 0)
              .forEach((msg: ChatMessage) => {
                allUserMessages.push(msg.text.trim());
              });
          } catch (error) {
            console.error('[MessageInput] Error loading messages for chat:', chat.id, error);
          }
        }
        
        // Remove duplicates and sort by frequency
        const messageFrequency = new Map<string, number>();
        allUserMessages.forEach(msg => {
          messageFrequency.set(msg, (messageFrequency.get(msg) || 0) + 1);
        });
        
        const uniqueMessages = Array.from(new Set(allUserMessages));
        
        // Sort by frequency (most used first)
        uniqueMessages.sort((a, b) => 
          (messageFrequency.get(b) || 0) - (messageFrequency.get(a) || 0)
        );
        
        setUserMessageHistory(uniqueMessages);
        console.log('[MessageInput] Loaded', uniqueMessages.length, 'unique user messages for autocomplete');
      } catch (error) {
        console.error('[MessageInput] Error loading user message history:', error);
      }
    };
    
    loadUserMessageHistory();
  }, []);

  // Autocomplete matching with debounce
  const updateAutocompleteSuggestions = useCallback((inputText: string) => {
    if (inputText.length < 2) {
      setMatchedSuggestions([]);
      setAutocompleteSuggestion('');
      setSuggestionIndex(0);
      return;
    }
    
    // Find messages that start with the input text
    const lowerText = inputText.toLowerCase();
    const matches = userMessageHistory.filter(msg => 
      msg.toLowerCase().startsWith(lowerText) && msg.length > inputText.length
    );
    
    setMatchedSuggestions(matches);
    setSuggestionIndex(0);
    
    if (matches.length > 0) {
      // Show only the missing part
      setAutocompleteSuggestion(matches[0].substring(inputText.length));
    } else {
      setAutocompleteSuggestion('');
    }
  }, [userMessageHistory]);

  // Update suggestions when text changes
  useEffect(() => {
    // Don't show autocomplete when tools or tab mention dropdowns are visible
    if (showToolsDropdown || showTabMentionDropdown) {
      setAutocompleteSuggestion('');
      return;
    }
    
    const timeoutId = setTimeout(() => {
      updateAutocompleteSuggestions(text);
    }, 150); // Debounce delay
    
    return () => clearTimeout(timeoutId);
  }, [text, updateAutocompleteSuggestions, showToolsDropdown, showTabMentionDropdown]);

  // Update suggestion when navigating with arrows
  useEffect(() => {
    if (matchedSuggestions.length > 0 && text.length >= 2) {
      const currentMatch = matchedSuggestions[suggestionIndex];
      if (currentMatch) {
        setAutocompleteSuggestion(currentMatch.substring(text.length));
      }
    }
  }, [suggestionIndex, matchedSuggestions, text]);

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
          setContentScriptAvailable(false);
        } else {
          // Check content script availability on non-system pages
          if (tab.id && pageContextEnabled) {
            try {
              await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
              setContentScriptAvailable(true);
            } catch (error) {
              console.warn('[MessageInput] Content script not available');
              setContentScriptAvailable(false);
            }
          }
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
        setContentScriptAvailable(false);
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
  }, [pendingMessage, instructions, pageContextEnabled]);

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

  // Track "@" symbol for tab mention dropdown
  useEffect(() => {
    // Show dropdown if text contains "@" and no tabs selected yet or still typing
    const shouldShow = text.includes('@') && text.length > 0;
    setShowTabMentionDropdown(shouldShow);
  }, [text]);

  // Handle editingMessage - восстановить текст и attachments
  useEffect(() => {
    if (editingMessage) {
      console.log('[MessageInput] Restoring message for editing:', editingMessage);
      
      // Установить текст
      setText(editingMessage.text);
      
      // Установить attachments
      const images: ImageAttachment[] = [];
      const files: FileAttachment[] = [];
      const tabs: TabReference[] = [];
      
      editingMessage.attachments.forEach((att, idx) => {
        if (att.type === 'image') {
          images.push({
            data: att.data,
            name: att.name,
            mimeType: att.mimeType
          });
        } else if (att.type === 'file' || att.type === 'dom') {
          files.push({
            type: att.type as 'file' | 'dom',
            name: att.name,
            data: att.data,
            xpath: att.xpath
          });
        } else if (att.type === 'tab') {
          // Восстановить tab references
          tabs.push({
            id: idx, // Используем индекс как временный ID
            title: att.tabTitle || att.name,
            url: att.tabUrl || '',
            favicon: att.tabFavicon
          });
        }
      });
      
      setAttachedImages(images);
      setAttachedFiles(files);
      setAttachedTabs(tabs);
      
      console.log('[MessageInput] Restored:', {
        images: images.length,
        files: files.length,
        tabs: tabs.length
      });
      
      // Очистить editingMessage после загрузки
      setEditingMessage(null);
    }
  }, [editingMessage, setEditingMessage]);

  // Restore pending fullscreen text (only in fullscreen mode)
  useEffect(() => {
    if (!isFullscreen) return;

    const checkPendingText = async () => {
      try {
        const result = await chrome.storage.local.get('pendingFullscreenText');
        
        if (result.pendingFullscreenText) {
          const { text: pendingText, timestamp } = result.pendingFullscreenText;
          
          // Check that text is not older than 10 seconds
          if (timestamp && Date.now() - timestamp < 10000 && pendingText) {
            console.log('[MessageInput] Restoring pending fullscreen text:', pendingText.length, 'chars');
            setText(pendingText);
          }
          
          // Clear pending text
          await chrome.storage.local.remove('pendingFullscreenText');
        }
      } catch (error) {
        console.error('[MessageInput] Error checking pending fullscreen text:', error);
      }
    };

    checkPendingText();
  }, [isFullscreen]);

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
      console.log('[MessageInput] File selected:', file.name, 'type:', file.type);
      
      // Validate image size
      if (!validateFileSize(file, maxImageSize)) {
        alert(t('fileTooLarge').replace('{size}', `${maxImageSize}MB`));
        continue;
      }

      try {
        let mimeType = file.type || 'image/png';
        console.log('[MessageInput] MIME type determined:', mimeType);
        
        let data = await readFileAsBase64(file);
        console.log('[MessageInput] Base64 data length:', data.length);
        
        // Always process through compressImage (handles SVG conversion and compression)
        const sizeInMB = (data.length * 3) / 4 / 1024 / 1024;
        console.log('[MessageInput] Image size:', sizeInMB.toFixed(2), 'MB');
        
        // Process if SVG or if size exceeds limit
        if (mimeType === 'image/svg+xml' || sizeInMB > maxImageSize) {
          console.log('[MessageInput] Processing image with MIME type:', mimeType);
          const processed = await compressImage(data, maxImageSize, mimeType);
          data = processed.data;
          mimeType = processed.mimeType;
          console.log('[MessageInput] Processed data length:', data.length, 'new MIME type:', mimeType);
        }

        const attachment = {
          data,
          name: file.name,
          mimeType
        };
        console.log('[MessageInput] Adding attachment:', { name: attachment.name, mimeType: attachment.mimeType, dataLength: attachment.data.length });
        
        setAttachedImages(prev => [...prev, attachment]);
      } catch (error) {
        console.error('[MessageInput] Error reading image:', error);
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

  const handleTakeFullPageScreenshot = async () => {
    if (!modelCapabilities.supportsImages) return;
    
    try {
      // Capture full visible area without cropping
      let data = await captureScreenshot();
      
      // Compress if needed
      const sizeInMB = (data.length * 3) / 4 / 1024 / 1024;
      let mimeType = 'image/png';
      if (sizeInMB > maxImageSize) {
        const compressed = await compressImage(data, maxImageSize, 'image/png');
        data = compressed.data;
        mimeType = compressed.mimeType;
      }

      setAttachedImages(prev => [...prev, {
        data,
        name: `fullpage_screenshot_${Date.now()}.png`,
        mimeType
      }]);
    } catch (error) {
      console.error('Error capturing full page screenshot:', error);
      alert(t('errorCapturingScreenshot'));
    }
  };

  const handleScreenshotCapture = async (area: { x: number; y: number; width: number; height: number }) => {
    try {
      let data = await captureScreenshot(area);
      
      // Compress if needed
      const sizeInMB = (data.length * 3) / 4 / 1024 / 1024;
      let mimeType = 'image/png';
      if (sizeInMB > maxImageSize) {
        const compressed = await compressImage(data, maxImageSize, 'image/png');
        data = compressed.data;
        mimeType = compressed.mimeType;
      }

      setAttachedImages(prev => [...prev, {
        data,
        name: `screenshot_${Date.now()}.png`,
        mimeType
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
      let mimeType = 'image/png';
      if (sizeInMB > maxImageSize) {
        const compressed = await compressImage(data, maxImageSize, 'image/png');
        data = compressed.data;
        mimeType = compressed.mimeType;
      }

      setAttachedImages(prev => [...prev, {
        data,
        name: `photo_${Date.now()}.png`,
        mimeType
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

  const handleTabSelect = (tabs: TabReference[]) => {
    if (tabs.length > 0) {
      // Add tabs to attached tabs
      setAttachedTabs(prev => {
        // Merge with existing, avoid duplicates
        const existing = new Map(prev.map(t => [t.id, t]));
        tabs.forEach(t => existing.set(t.id, t));
        return Array.from(existing.values());
      });
    }
    
    // Remove "@" and everything after it from text
    setText(prev => {
      const atIndex = prev.lastIndexOf('@');
      if (atIndex !== -1) {
        return prev.substring(0, atIndex);
      }
      return prev;
    });
    setShowTabMentionDropdown(false);
  };

  const handleRemoveTab = (tabId: number) => {
    setAttachedTabs(prev => prev.filter(t => t.id !== tabId));
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab for accepting autocomplete suggestion
    if (e.key === 'Tab' && autocompleteSuggestion && !showToolsDropdown && !showTabMentionDropdown) {
      e.preventDefault();
      setText(text + autocompleteSuggestion);
      setAutocompleteSuggestion('');
      setMatchedSuggestions([]);
      setSuggestionIndex(0);
      return;
    }
    
    // Handle ArrowDown for next suggestion
    if (e.key === 'ArrowDown' && matchedSuggestions.length > 1 && autocompleteSuggestion) {
      e.preventDefault();
      setSuggestionIndex((prev) => 
        prev < matchedSuggestions.length - 1 ? prev + 1 : 0
      );
      return;
    }
    
    // Handle ArrowUp for previous suggestion
    if (e.key === 'ArrowUp' && matchedSuggestions.length > 1 && autocompleteSuggestion) {
      e.preventDefault();
      setSuggestionIndex((prev) => 
        prev > 0 ? prev - 1 : matchedSuggestions.length - 1
      );
      return;
    }
    
    // Handle Escape to dismiss autocomplete
    if (e.key === 'Escape' && autocompleteSuggestion) {
      e.preventDefault();
      setAutocompleteSuggestion('');
      setMatchedSuggestions([]);
      setSuggestionIndex(0);
      return;
    }
    
    // Handle Enter - submit form (without Shift) or new line (with Shift)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
      return;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0; // Сбрасываем счетчик

    if (!modelCapabilities.supportsImages) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    // Process dropped files
    for (const file of imageFiles) {
      console.log('[MessageInput] Dropped file:', file.name, 'type:', file.type);
      
      // Validate image size
      if (!validateFileSize(file, maxImageSize)) {
        alert(t('fileTooLarge').replace('{size}', `${maxImageSize}MB`));
        continue;
      }

      try {
        let mimeType = file.type || 'image/png';
        console.log('[MessageInput] Dropped file MIME type:', mimeType);
        
        let data = await readFileAsBase64(file);
        
        // Always process through compressImage (handles SVG conversion and compression)
        const sizeInMB = (data.length * 3) / 4 / 1024 / 1024;
        
        // Process if SVG or if size exceeds limit
        if (mimeType === 'image/svg+xml' || sizeInMB > maxImageSize) {
          console.log('[MessageInput] Processing dropped image with MIME type:', mimeType);
          const processed = await compressImage(data, maxImageSize, mimeType);
          data = processed.data;
          mimeType = processed.mimeType;
          console.log('[MessageInput] Processed, new MIME type:', mimeType);
        }

        const attachment = {
          data,
          name: file.name,
          mimeType
        };
        console.log('[MessageInput] Adding dropped attachment:', { name: attachment.name, mimeType: attachment.mimeType });
        
        setAttachedImages(prev => [...prev, attachment]);
      } catch (error) {
        console.error('[MessageInput] Error reading dropped image:', error);
        alert(t('errorReadingFile'));
      }
    }

    // If no files, try to get image URLs from dataTransfer
    if (imageFiles.length === 0) {
      const html = e.dataTransfer.getData('text/html');
      const text = e.dataTransfer.getData('text/plain');
      
      console.log('[MessageInput] No files dropped, checking for URLs');
      
      // Try to extract image URL from HTML first (more reliable)
      let imageUrl: string | null = null;
      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const img = doc.querySelector('img');
        if (img?.src) {
          imageUrl = img.src;
          console.log('[MessageInput] Found image URL in HTML:', imageUrl);
        }
      }
      
      // If no image in HTML, try plain text URL
      if (!imageUrl && text) {
        try {
          const url = new URL(text);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            imageUrl = text;
            console.log('[MessageInput] Using plain text URL:', imageUrl);
          }
        } catch {
          // Not a valid URL
        }
      }
      
      // Download and process the image
      if (imageUrl) {
        try {
          console.log('[MessageInput] Downloading image from URL:', imageUrl);
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const mimeType = blob.type || 'image/png';
          console.log('[MessageInput] Downloaded image MIME type:', mimeType);
          
          // Check if it's an image
          if (!mimeType.startsWith('image/')) {
            alert(t('invalidFileType'));
            return;
          }
          
          // Convert blob to base64
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              let data = reader.result as string;
              // Remove data URL prefix if present
              data = data.replace(/^data:image\/[a-z+]+;base64,/, '');
              
              let finalMimeType = mimeType;
              
              // Always process through compressImage (handles SVG conversion and compression)
              const sizeInMB = (data.length * 3) / 4 / 1024 / 1024;
              console.log('[MessageInput] Downloaded image size:', sizeInMB.toFixed(2), 'MB');
              
              // Process if SVG or if size exceeds limit
              if (mimeType === 'image/svg+xml' || sizeInMB > maxImageSize) {
                console.log('[MessageInput] Processing downloaded image with MIME type:', mimeType);
                const processed = await compressImage(data, maxImageSize, mimeType);
                data = processed.data;
                finalMimeType = processed.mimeType;
                console.log('[MessageInput] Processed, new MIME type:', finalMimeType);
              }
              
              // Extract filename from URL
              const urlObj = new URL(imageUrl);
              const pathSegments = urlObj.pathname.split('/');
              const fileName = pathSegments[pathSegments.length - 1] || `image_${Date.now()}`;
              
              const attachment = {
                data,
                name: fileName,
                mimeType: finalMimeType
              };
              console.log('[MessageInput] Adding downloaded image attachment:', { name: attachment.name, mimeType: attachment.mimeType });
              
              setAttachedImages(prev => [...prev, attachment]);
            } catch (error) {
              console.error('[MessageInput] Error processing downloaded image:', error);
              alert(t('errorReadingFile'));
            }
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('[MessageInput] Error downloading image:', error);
          alert(t('errorReadingFile'));
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!modelCapabilities.supportsImages) return;
    
    // Увеличиваем счетчик при каждом dragEnter
    dragCounterRef.current++;
    
    // Игнорируем внутренние drag операции из самого компонента
    // Проверяем, что это внешний источник данных (файлы, изображения или HTML)
    const hasFiles = e.dataTransfer.types.includes('Files');
    const hasImages = e.dataTransfer.items.length > 0 && 
      Array.from(e.dataTransfer.items).some(item => item.type.startsWith('image/'));
    const hasHtml = e.dataTransfer.types.includes('text/html');
    
    // Если нет файлов/изображений/HTML - это скорее всего внутренний drag (иконка провайдера)
    if (!hasFiles && !hasImages && !hasHtml) {
      dragCounterRef.current--;
      return;
    }
    
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Уменьшаем счетчик при каждом dragLeave
    dragCounterRef.current--;
    
    // Скрываем overlay только когда счетчик достигнет 0 (покинули весь компонент)
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    if (!hasText || isLoading) return;

    // Ensure we have a chat - create one if needed
    if (!currentChat) {
      console.log('[MessageInput] No current chat, creating new one');
      if (isFullscreen) {
        await createNewChat('fullscreen');
      } else {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const site = tab.url ? new URL(tab.url).hostname : 'unknown';
          await createNewChat(site);
        } catch (error) {
          console.error('[MessageInput] Error creating chat:', error);
          await createNewChat('unknown');
        }
      }
      // Небольшая задержка, чтобы store обновился
      await new Promise(resolve => setTimeout(resolve, 50));
      console.log('[MessageInput] Chat created, currentChat:', useChatStore.getState().currentChat?.id);
    }

    const content = message.text!.trim();
    setText('');
    setShowToolsDropdown(false); // Скрыть dropdown при отправке
    setShowTabMentionDropdown(false); // Скрыть tab dropdown при отправке
    
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
    const attachments: Array<{
      type: 'file' | 'image' | 'dom' | 'tab';
      name: string;
      data: string;
      xpath?: string;
      mimeType?: string;
      tabUrl?: string;
      tabTitle?: string;
      tabFavicon?: string;
    }> = [
      ...attachedFiles,
      ...attachedImages.map(img => {
        console.log('[MessageInput] Preparing image attachment for submit:', { name: img.name, mimeType: img.mimeType, dataLength: img.data?.length });
        return {
          type: 'image' as const,
          name: img.name,
          data: img.data,
          mimeType: img.mimeType
        };
      })
    ];
    
    // Auto-attach PDF if this is the first message in a new chat
    const { messages } = useChatStore.getState();
    const isFirstMessage = !messages || messages.length === 0;
    
    if (isFirstMessage && !isFullscreen) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if current page is a PDF
        if (tab.url && isPdfPage(tab.url, (tab as any).mimeType)) {
          console.log('[MessageInput] PDF detected, auto-attaching:', tab.url);
          
          let pdfData: string | null = null;
          let pdfSize = 0;
          const pdfUrl = tab.url;
          
          // Try to get PDF data based on URL type
          if (pdfUrl.startsWith('file://')) {
            // For file:// URLs, use background script
            try {
              const response = await chrome.runtime.sendMessage({
                type: 'GET_PDF_FILE',
                data: { url: pdfUrl }
              });
              
              if (response.success) {
                pdfData = response.data;
                pdfSize = response.size || 0;
                console.log('[MessageInput] PDF fetched from file://, size:', pdfSize);
              } else if (response.error === 'FILE_ACCESS_DENIED') {
                console.warn('[MessageInput] File access denied:', response.message);
                alert(t('pdfAccessDenied'));
              } else {
                console.error('[MessageInput] Failed to fetch PDF:', response.error);
              }
            } catch (error) {
              console.error('[MessageInput] Error fetching file:// PDF:', error);
            }
          } else if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
            // For http(s):// URLs, use content script
            try {
              if (tab.id) {
                const response = await chrome.tabs.sendMessage(tab.id, {
                  type: 'GET_PDF_DATA',
                  data: { url: pdfUrl }
                });
                
                if (response.success) {
                  pdfData = response.data;
                  pdfSize = response.size || 0;
                  console.log('[MessageInput] PDF fetched from https://, size:', pdfSize);
                } else {
                  console.error('[MessageInput] Failed to fetch PDF:', response.error);
                }
              }
            } catch (error) {
              console.error('[MessageInput] Error fetching https:// PDF:', error);
            }
          }
          
          // Add PDF to attachments if successfully fetched
          if (pdfData) {
            // Validate file size
            const sizeInMB = pdfSize / (1024 * 1024);
            if (sizeInMB > maxFileSize) {
              console.warn('[MessageInput] PDF too large:', sizeInMB.toFixed(2), 'MB, max:', maxFileSize, 'MB');
              alert(t('pdfTooLarge').replace('{size}', `${maxFileSize}MB`));
            } else {
              const filename = extractFilenameFromUrl(pdfUrl) || 'document.pdf';
              attachments.push({
                type: 'file',
                name: filename,
                data: pdfData,
                mimeType: 'application/pdf'
              });
              
              console.log('[MessageInput] PDF auto-attached:', filename, 'size:', sizeInMB.toFixed(2), 'MB');
              
              // Show notification
              console.log('[MessageInput] PDF automatically attached to message');
            }
          }
        }
      } catch (error) {
        console.error('[MessageInput] Error in PDF auto-attach:', error);
      }
    }
    
    // Get tab contents if tabs are attached (BEFORE clearing attachedTabs)
    const tabsToProcess = [...attachedTabs]; // Make a copy
    
    console.log('[MessageInput] Tabs to process:', tabsToProcess.length, tabsToProcess);
    
    if (tabsToProcess.length > 0) {
      console.log('[MessageInput] Fetching content for', tabsToProcess.length, 'tabs');
      
      // Get model's context limit for token calculation
      const modelName = selectedOperator?.selectedModel || '';
      const operator = selectedOperator?.operator;
      const modelLimit = getModelContextLimit(modelName, operator);
      const maxContextTokens = Math.floor(modelLimit * 0.3); // 30% for tab contents
      
      for (const tab of tabsToProcess) {
        try {
          console.log('[MessageInput] Processing tab:', tab.id, tab.title);
          
          // Send message to get page context
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'GET_PAGE_CONTEXT',
            data: { 
              type: pageContextType,
              maxTokens: maxContextTokens
            }
          });
          
          if (response?.success && response.data) {
            const contextData = response.data;
            const content = contextData.content || contextData;
            
            console.log('[MessageInput] Got content for tab:', {
              tabTitle: tab.title,
              tabUrl: tab.url,
              contentLength: content.length,
              contentType: typeof content,
              contentPreview: content.substring(0, 200)
            });
            
            // Add as tab attachment with ALL required fields
            attachments.push({
              type: 'tab' as const,
              name: tab.title,
              data: content,
              tabUrl: tab.url,
              tabTitle: tab.title,
              tabFavicon: tab.favicon
            });
            
            console.log('[MessageInput] Added tab attachment:', {
              type: 'tab',
              name: tab.title,
              tabUrl: tab.url,
              tabTitle: tab.title,
              tabFavicon: tab.favicon,
              dataLength: content.length
            });
          } else {
            console.warn('[MessageInput] No data in response for tab:', {
              tabTitle: tab.title,
              responseSuccess: response?.success,
              hasData: !!response?.data,
              response: response
            });
          }
        } catch (error) {
          console.error('[MessageInput] Error getting tab content:', tab.title, error);
          // Skip this tab if error
        }
      }
    }
    
    console.log('[MessageInput] Total attachments to send:', attachments.length);
    attachments.forEach((att, idx) => {
      if (att.type === 'image') {
        console.log(`[MessageInput] Attachment ${idx}:`, { type: att.type, name: att.name, mimeType: att.mimeType });
      } else if (att.type === 'tab') {
        console.log(`[MessageInput] Attachment ${idx}:`, { 
          type: att.type, 
          name: att.name, 
          url: att.tabUrl,
          dataLength: att.data?.length || 0,
          dataPreview: att.data?.substring(0, 100)
        });
      } else {
        console.log(`[MessageInput] Attachment ${idx}:`, { type: att.type, name: att.name });
      }
    });
    
    // Clear attachments AFTER processing
    setAttachedFiles([]);
    setAttachedImages([]);
    setAttachedTabs([]);

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
      <div 
        data-message-input
        className={`border-t p-4 bg-card relative transition-colors ${
          isDragging ? 'bg-accent/50 border-primary' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {/* Drag overlay indicator */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-accent/80 border-2 border-dashed border-primary rounded-lg pointer-events-none">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
              <p className="text-lg font-medium">{t('dropImagesHere')}</p>
            </div>
          </div>
        )}
        
        {/* Tools Command Dropdown */}
        <ToolsCommandDropdown
          text={text}
          tools={availableTools}
          onSelect={handleToolSelect}
          visible={showToolsDropdown}
        />
        
        {/* Tab Mention Dropdown */}
        <TabMentionDropdown
          text={text}
          onSelect={handleTabSelect}
          visible={showTabMentionDropdown}
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
            {(attachedFiles.length > 0 || attachedTabs.length > 0 || editingImageResponseId) && (
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
                
                {/* Tab mention badges */}
                {attachedTabs.map((tab) => (
                  <TabMentionBadge
                    key={tab.id}
                    tab={tab}
                    onRemove={() => handleRemoveTab(tab.id)}
                  />
                ))}
              </div>
            )}
            
            <div className="relative w-full">
              <PromptInputTextarea
                ref={textareaRef as any}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                value={text}
                placeholder={t('messageInputPlaceholder')}
                className="min-h-[60px] max-h-[200px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                onClick={() => {
                  // Cancel selection modes when clicking on chat input
                  if (isSelectingElement || isSelectingScreenshot) {
                    handleCancelSelection();
                  }
                }}
              />
              
              {/* Ghost text overlay для автокомплита - только одна строка */}
              {autocompleteSuggestion && !showToolsDropdown && !showTabMentionDropdown && text.length > 0 && (
                <div 
                  className="absolute left-0 top-0 pointer-events-none overflow-hidden whitespace-nowrap"
                  style={{
                    height: '1.5rem',
                    marginTop: '0.75rem',
                    paddingLeft: '0.75rem',
                    paddingRight: '0.75rem',
                    width: 'calc(100% - 1.5rem)',
                    maxWidth: 'calc(100% - 1.5rem)'
                  }}
                >
                  <span 
                    style={{ 
                      fontSize: '0.875rem',
                      lineHeight: '1.5rem',
                      color: 'transparent',
                      userSelect: 'none'
                    }}
                  >
                    {text}
                  </span><span 
                    style={{ 
                      fontSize: '0.875rem',
                      lineHeight: '1.5rem',
                      color: 'hsl(var(--muted-foreground))', 
                      opacity: 0.5,
                      userSelect: 'none'
                    }}
                  >
                    {autocompleteSuggestion.split('\n')[0]}
                  </span>
                </div>
              )}
            </div>
            
            {/* Индикатор Tab для принятия предложения - внизу под полем */}
            {autocompleteSuggestion && !showToolsDropdown && !showTabMentionDropdown && (
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border">Tab</kbd>
                <span>{t('toAccept')}</span>
                {matchedSuggestions.length > 1 && (
                  <>
                    <span className="mx-1">•</span>
                    <kbd className="px-1 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border">↑↓</kbd>
                    <span>{suggestionIndex + 1}/{matchedSuggestions.length}</span>
                  </>
                )}
              </div>
            )}
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
                        {!isFullscreen && (
                          <>
                            <DropdownMenuItem 
                              onClick={handleTakeScreenshot}
                              disabled={!modelCapabilities.supportsImages}
                              title={!modelCapabilities.supportsImages ? t('featureNotAvailableForModel') : ''}
                            >
                              <Monitor className="h-4 w-4" />
                              {t('takeScreenshot')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={handleTakeFullPageScreenshot}
                              disabled={!modelCapabilities.supportsImages}
                              title={!modelCapabilities.supportsImages ? t('featureNotAvailableForModel') : ''}
                            >
                              <Square className="h-4 w-4" />
                              {t('takeFullPageScreenshot')}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem 
                          onClick={handleTakePhoto}
                          disabled={!modelCapabilities.supportsImages}
                          title={!modelCapabilities.supportsImages ? t('featureNotAvailableForModel') : ''}
                        >
                          <Camera className="h-4 w-4" />
                          {t('takePhoto')}
                        </DropdownMenuItem>
                        {!isFullscreen && (
                          <DropdownMenuItem onClick={handleSelectElement}>
                            <MousePointer2 className="h-4 w-4" />
                            {t('selectElement')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => {
                          setText(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + '@');
                        }}>
                          <AtSign className="h-4 w-4" />
                          {t('attachBrowserTab')}
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

                {!isFullscreen && (
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
                                  <span className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${
                                    contentScriptAvailable ? 'bg-green-500' : 'bg-red-500'
                                  }`} />
                                )}
                              </>
                            ) : (
                              <CircleFadingPlus className="h-4 w-4 mr-1" />
                            )}
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isSystemPage 
                          ? t('unavailableOnSystemPages') 
                          : !contentScriptAvailable 
                            ? t('pageNeedsRefresh')
                            : t('currentPageContext')
                        }
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
                )}
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

