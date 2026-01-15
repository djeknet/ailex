import { useEffect, useState, useRef } from 'react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useChatStore } from '@shared/stores/chatStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { getContextCommand } from '@shared/constants/contextCommands';
import { getAILanguageName } from '@shared/constants';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';

interface PendingContextCommand {
  commandId: string;
  selectedText: string;
  instructionId?: string;
}

export default function Chat() {
  const { t } = useTranslation();
  const { operators, setActiveView, historyMode, autoDeletionDays } = useSettingsStore();
  const chatStore = useChatStore();
  const [initialized, setInitialized] = useState(false);
  const [currentSite, setCurrentSite] = useState<string>('');
  const [pendingContextCommand, setPendingContextCommand] = useState<PendingContextCommand | null>(null);
  
  // Track executed commands to prevent duplicates (using ref to persist across renders)
  const executedCommandsRef = useRef<Set<string>>(new Set());
  
  // Clean up old executed commands periodically (prevent memory leak)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (executedCommandsRef.current.size > 100) {
        console.log('[Chat] Cleaning up executed commands cache');
        executedCommandsRef.current.clear();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    // Check for pending site prompt from widget on initialization
    const checkPendingSitePrompt = async () => {
      try {
        const result = await chrome.storage.local.get('pendingSitePrompt');
        if (result.pendingSitePrompt) {
          console.log('[Chat] Found pending site prompt:', result.pendingSitePrompt);
          const { prompt, currentUrl, tabId } = result.pendingSitePrompt;
          
          if (prompt && currentUrl && tabId) {
            // Wait for chat to be ready
            if (chatStore.currentChat && chatStore.sendSitePrompt) {
              console.log('[Chat] Processing pending site prompt');
              await chatStore.sendSitePrompt(prompt);
              // Clear the pending prompt
              await chrome.storage.local.remove('pendingSitePrompt');
              console.log('[Chat] Pending site prompt processed and cleared');
            }
          }
        }
      } catch (error) {
        console.error('[Chat] Error checking pending site prompt:', error);
      }
    };

    if (initialized && chatStore.currentChat) {
      checkPendingSitePrompt();
    }
  }, [initialized, chatStore.currentChat, chatStore.sendSitePrompt]);

  useEffect(() => {
    // Listen for site prompts from widget
    const handleSitePrompt = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { prompt } = customEvent.detail;
      
      console.log('[Chat] Site prompt received from widget:', prompt);
      
      // Check if chat is initialized
      if (!initialized || !chatStore.currentChat) {
        console.log('[Chat] Not ready, waiting for initialization');
        // Wait a bit and retry
        setTimeout(() => {
          if (chatStore.currentChat && chatStore.sendSitePrompt) {
            chatStore.sendSitePrompt(prompt);
          }
        }, 1000);
        return;
      }
      
      // Send the prompt
      if (chatStore.sendSitePrompt) {
        chatStore.sendSitePrompt(prompt);
      }
    };

    window.addEventListener('processSitePrompt', handleSitePrompt);

    return () => {
      window.removeEventListener('processSitePrompt', handleSitePrompt);
    };
  }, [initialized, chatStore]);

  useEffect(() => {
    // Check if operators are configured
    if (operators.length === 0 || !operators.some(op => op.selectedModel)) {
      // Redirect to settings
      setActiveView('settings');
      return;
    }

    // Set default operator if not already selected
    if (!chatStore.selectedOperator) {
      const defaultOperator = operators.find(op => op.selectedModel);
      if (defaultOperator) {
        chatStore.setSelectedOperator(defaultOperator);
      }
    }

    // Initialize chat only once
    if (!initialized) {
      initializeChat();
    }

    // Listen for context menu actions
    const handleContextMenuAction = async (message: any) => {
      if (message.type === 'CONTEXT_MENU_ACTION') {
        console.log('[Chat] Context menu action received:', message.data);
        const { commandId, selectedText, instructionId } = message.data;
        
        // Get and IMMEDIATELY clear storage to prevent race condition
        const storageResult = await chrome.storage.local.get('pendingContextCommand');
        await chrome.storage.local.remove('pendingContextCommand');
        
        const timestamp = storageResult.pendingContextCommand?.timestamp || Date.now();
        
        // Create unique key for deduplication (use timestamp from storage)
        const commandKey = `${commandId}_${selectedText}_${timestamp}`;
        
        // Check if already executed
        if (executedCommandsRef.current.has(commandKey)) {
          console.log('[Chat] Command already executed, skipping duplicate');
          return;
        }
        
        // Mark as executed
        executedCommandsRef.current.add(commandKey);
        
        // Check if chat is initialized
        if (!initialized || !chatStore.currentChat) {
          console.log('[Chat] Not ready, saving command for later');
          setPendingContextCommand({ commandId, selectedText, instructionId });
          return;
        }
        
        handleContextCommand(commandId, selectedText, instructionId);
      }
    };

    chrome.runtime.onMessage.addListener(handleContextMenuAction);

    // Listen for tab changes
    const handleTabChange = async (activeInfo: chrome.tabs.TabActiveInfo) => {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      handleTabUpdate(tab);
    };

    const handleTabUpdate = async (tab: chrome.tabs.Tab) => {
      if (!tab.url) return;
      
      // Ignore extension pages (like webcam popup)
      if (tab.url.startsWith('chrome-extension://')) return;
      
      // Only handle active tabs in current window
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id !== activeTab?.id) return;
      
      const site = new URL(tab.url).hostname;
      
      // Only reload chat if site changed and historyMode is 'per-site'
      if (site !== currentSite && historyMode === 'per-site') {
        console.log('[Chat] Site changed from', currentSite, 'to', site);
        setCurrentSite(site);
        await chatStore.loadOrCreateChat(site, historyMode);
      }
    };

    // Listen for active tab changes
    chrome.tabs.onActivated.addListener(handleTabChange);

    // Listen for tab updates (URL changes in current tab)
    const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.url) {
        handleTabUpdate(tab);
      }
    };
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      chrome.runtime.onMessage.removeListener(handleContextMenuAction);
      chrome.tabs.onActivated.removeListener(handleTabChange);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [historyMode]); // Removed currentSite from dependencies to prevent re-initialization

  // Handle pending context command after initialization
  useEffect(() => {
    if (initialized && pendingContextCommand && chatStore.currentChat) {
      console.log('[Chat] Executing pending context command');
      handleContextCommand(
        pendingContextCommand.commandId,
        pendingContextCommand.selectedText,
        pendingContextCommand.instructionId
      );
      setPendingContextCommand(null);
    }
  }, [initialized, pendingContextCommand, chatStore.currentChat]);

  // Check storage for pending context command on initialization
  useEffect(() => {
    if (!initialized || !chatStore.currentChat) return;

    const checkPendingCommand = async () => {
      try {
        const result = await chrome.storage.local.get('pendingContextCommand');
        
        if (result.pendingContextCommand) {
          const { commandId, selectedText, instructionId, toolId, timestamp } = result.pendingContextCommand;
          
          console.log('[Chat] Found pending context command in storage:', { 
            commandId, 
            hasText: !!selectedText,
            timestamp,
            age: Date.now() - timestamp
          });
          
          // Check that command is not older than 10 seconds
          if (timestamp && Date.now() - timestamp < 10000) {
            // Create unique key for deduplication
            const commandKey = `${commandId}_${selectedText}_${timestamp}`;
            
            // Clear storage BEFORE checking execution (prevents race condition)
            await chrome.storage.local.remove('pendingContextCommand');
            
            // Check if already executed (message listener might have handled it)
            if (!executedCommandsRef.current.has(commandKey)) {
              // Mark as executed
              executedCommandsRef.current.add(commandKey);
              
              console.log('[Chat] Executing command from storage');
              
              // Execute the command
              if (toolId) {
                // Handle tool command
                handleContextCommand(commandId, selectedText, undefined);
              } else {
                handleContextCommand(commandId, selectedText, instructionId);
              }
            } else {
              console.log('[Chat] Command from storage already executed by message listener, skipping');
            }
          } else {
            console.log('[Chat] Pending command expired');
            await chrome.storage.local.remove('pendingContextCommand');
          }
        } else {
          console.log('[Chat] No pending command in storage (might have been processed by message listener)');
        }
      } catch (error) {
        console.error('[Chat] Error checking pending context command:', error);
      }
    };

    // Small delay to let message listener process first if UI is ready
    const timeoutId = setTimeout(checkPendingCommand, 200);
    return () => clearTimeout(timeoutId);
  }, [initialized, chatStore.currentChat]);

  const handleContextCommand = async (commandId: string, selectedText: string, instructionId?: string) => {
    console.log('[Chat] Handling context command:', { commandId, textLength: selectedText.length, instructionId });

    try {
      // Handle instruction commands separately
      if (instructionId) {
        await handleInstructionCommand(instructionId, selectedText);
        return;
      }

      // Get command configuration
      const command = getContextCommand(commandId);
      if (!command) {
        console.error('[Chat] Unknown command:', commandId);
        return;
      }

      // Get localized texts
      const actionLabel = t(command.titleKey);
      let promptTemplate = t(command.promptKey);

      // For translate command, add target language
      if (command.id === 'translate_text') {
        const { language } = useSettingsStore.getState();
        const targetLanguage = getAILanguageName(language);
        promptTemplate = `${promptTemplate} ${targetLanguage}:`;
      }

      console.log('[Chat] Command:', { actionLabel, promptTemplate });

      // Build full prompt
      const fullPrompt = `${promptTemplate}\n\n${selectedText}`;

      // Check if web search is required
      const webSearchEnabled = command.requires?.includes('web_search') || false;

      console.log('[Chat] Sending message:', { 
        webSearchEnabled, 
        promptLength: fullPrompt.length 
      });
      
      // Send the message with the selected text as quotedText
      await chatStore.sendUserMessage(
        fullPrompt,
        '', // explicitly disable page context
        undefined, // no replyTo (quotedText will be used instead)
        actionLabel, // action label to display
        [], // no attachments
        webSearchEnabled, // web search flag
        undefined, // no instruction
        selectedText // quoted text for context menu actions
      );

      console.log('[Chat] Context command executed successfully');
    } catch (error) {
      console.error('[Chat] Error executing context command:', error);
    }
  };

  const handleInstructionCommand = async (instructionId: string, selectedText: string) => {
    console.log('[Chat] Handling instruction command:', { instructionId, textLength: selectedText.length });

    try {
      // Get instruction from storage
      const storageData = await chrome.storage.sync.get(['instructions']);
      const instructions = storageData.instructions || [];
      const instruction = instructions.find((i: any) => i.id === instructionId);

      if (!instruction) {
        console.error('[Chat] Instruction not found:', instructionId);
        return;
      }

      console.log('[Chat] Found instruction:', instruction.name);

      // Get localized prompt template
      const promptTemplate = t('contextMenu_instruction_prompt');
      
      // Build full prompt with instruction content
      const fullPrompt = `${promptTemplate}\n\n${instruction.content}\n\n---\n\n${selectedText}`;

      console.log('[Chat] Sending instruction message:', { 
        instructionName: instruction.name,
        promptLength: fullPrompt.length 
      });

      // Send the message with instruction
      await chatStore.sendUserMessage(
        fullPrompt,
        '', // explicitly disable page context
        undefined, // no replyTo
        instruction.name, // action label - instruction name
        [], // no attachments
        false, // no web search by default
        undefined, // no instruction data (already in prompt)
        selectedText // quoted text
      );

      console.log('[Chat] Instruction command executed successfully');
    } catch (error) {
      console.error('[Chat] Error executing instruction command:', error);
    }
  };

  const initializeChat = async () => {
    try {
      // Delete old chats based on settings
      if (autoDeletionDays && autoDeletionDays > 0) {
        await chatStore.deleteOldChats(autoDeletionDays);
      }

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const site = tab.url ? new URL(tab.url).hostname : 'unknown';
      
      setCurrentSite(site);

      // Load or create chat based on history mode
      await chatStore.loadOrCreateChat(site, historyMode);
      
      setInitialized(true);
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader />
      <MessageList />
      <MessageInput />
    </div>
  );
}
