// Context menu handler for AI commands on selected text and editable fields
import { sendMessage } from '@shared/services/aiService';
import { AIMessage, AIOperatorConfig } from '@shared/types/ai';
import { PersonalInfo } from '@shared/types/extension';
import { decryptApiKey } from '@shared/utils/encryption';

// Export the handler for use in background message listener
export { handleCustomInstructionRequest };

export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
) {
  console.log('[ContextMenu] Click received:', info);

  if (!tab?.id) {
    console.error('[ContextMenu] No tab ID available');
    return;
  }

  const commandId = String(info.menuItemId);
  const selectedText = info.selectionText;

  console.log('[ContextMenu] Executing command:', {
    commandId,
    hasText: !!selectedText,
    textLength: selectedText?.length || 0,
    tabId: tab.id
  });

  try {
    // ========== HANDLE PERSONAL DATA INSERTION ==========
    if (commandId.startsWith('personal_info_')) {
      const fieldName = commandId.replace('personal_info_', '') as keyof PersonalInfo;
      console.log('[ContextMenu] Personal info command:', fieldName);
      
      // Get personal info from storage
      const storageData = await chrome.storage.sync.get(['personalInfo']);
      const personalInfo: PersonalInfo = storageData.personalInfo || {};
      const value = personalInfo[fieldName];
      
      if (value) {
        // Send directly to content script for insertion
        await chrome.tabs.sendMessage(tab.id, {
          type: 'INSERT_PERSONAL_DATA',
          data: { text: String(value) }
        });
        console.log('[ContextMenu] Personal data sent for insertion');
      }
      return;
    }

    // ========== HANDLE RESPONSE TONE GENERATION ==========
    if (commandId.startsWith('response_tone_')) {
      const tone = commandId.replace('response_tone_', '');
      console.log('[ContextMenu] Response tone command:', tone);
      
      await handleAIGeneration(tab.id, tone, undefined);
      return;
    }

    // ========== HANDLE FILL BY INSTRUCTION ==========
    if (commandId.startsWith('fill_instruction_')) {
      const instructionId = commandId.replace('fill_instruction_', '');
      console.log('[ContextMenu] Fill instruction command:', instructionId);
      
      // Check if this is a custom instruction request
      if (instructionId === 'custom') {
        // Send message to show custom instruction prompt
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_CUSTOM_INSTRUCTION_PROMPT'
        });
      } else {
        await handleAIGeneration(tab.id, undefined, instructionId);
      }
      return;
    }

    // ========== HANDLE REGULAR COMMANDS (selection context) ==========
    // Check if this is an instruction command
    let instructionId: string | undefined;
    if (commandId.startsWith('instruction_')) {
      instructionId = commandId.replace('instruction_', '');
      console.log('[ContextMenu] Instruction command detected:', instructionId);
    }
    
    // Check if this is a tool command
    let toolId: string | undefined;
    if (commandId.startsWith('tool_')) {
      toolId = commandId.replace('tool_', '');
      console.log('[ContextMenu] Tool command detected:', toolId);
    }

    // Always open side panel (idempotent operation - no-op if already open)
    await chrome.sidePanel.open({ tabId: tab.id });

    // Small delay to allow UI initialization if it was closed
    await new Promise(resolve => setTimeout(resolve, 300));

    // Send command to UI
    chrome.runtime.sendMessage({
      type: 'CONTEXT_MENU_ACTION',
      data: {
        commandId,
        selectedText,
        instructionId, // Pass instruction ID if it's an instruction command
        toolId // Pass tool ID if it's a tool command
      }
    });

    console.log('[ContextMenu] Message sent to UI');
  } catch (error) {
    console.error('[ContextMenu] Error handling context menu click:', error);
  }
}

// Handle AI generation for tone and instruction commands
async function handleAIGeneration(
  tabId: number,
  tone?: string,
  instructionId?: string,
  customInstruction?: string
) {
  try {
    // Step 1: Show loader on the field
    await chrome.tabs.sendMessage(tabId, {
      type: 'START_FIELD_LOADER'
    });

    // Step 2: Get page context
    const contextResponse = await chrome.tabs.sendMessage(tabId, {
      type: 'GET_PAGE_CONTEXT',
      data: { type: 'text', maxTokens: 100000 }
    });

    if (!contextResponse?.success) {
      throw new Error('Failed to get page context');
    }

    const pageContext = contextResponse.data?.content || '';
    console.log('[ContextMenu] Page context retrieved:', pageContext.substring(0, 200));

    // Step 3: Build prompt
    let prompt = '';
    
    if (tone) {
      // For tone: generate response in that tone
      const toneDescriptions: Record<string, string> = {
        professional: 'professional and formal',
        friendly: 'friendly and warm',
        direct: 'direct and concise',
        confident: 'confident and assertive',
        casual: 'casual and relaxed'
      };
      
      const toneDesc = toneDescriptions[tone] || tone;
      prompt = `Write a response in a ${toneDesc} tone. Use the same language as the context below. Context:\n\n${pageContext}`;
    } else if (customInstruction) {
      // For custom instruction: use provided instruction
      prompt = `${customInstruction}\n\nContext:\n\n${pageContext}`;
    } else if (instructionId) {
      // For saved instruction: apply instruction with context
      const storageData = await chrome.storage.sync.get(['instructions']);
      const instructions = storageData.instructions || [];
      const instruction = instructions.find((i: any) => i.id === instructionId);
      
      if (!instruction) {
        throw new Error('Instruction not found');
      }
      
      prompt = `${instruction.content}\n\nContext:\n\n${pageContext}`;
    }

    console.log('[ContextMenu] Prompt built:', prompt.substring(0, 200));

    // Step 4: Get operator config
    const operatorData = await chrome.storage.sync.get(['operators']);
    const operators: AIOperatorConfig[] = operatorData.operators || [];
    
    // Find first operator with API key
    let activeOperator = operators.find(op => op.apiKey && op.selectedModel);
    
    if (!activeOperator) {
      throw new Error('No active AI operator configured');
    }

    // Decrypt API key (keys are stored encrypted in sync storage)
    if (activeOperator.apiKey) {
      const decryptedApiKey = await decryptApiKey(activeOperator.apiKey);
      activeOperator = {
        ...activeOperator,
        apiKey: decryptedApiKey
      };
    }

    console.log('[ContextMenu] Using operator:', activeOperator.operator, 'with model:', activeOperator.selectedModel);

    // Step 5: Call AI API
    const messages: AIMessage[] = [
      { role: 'user', content: prompt }
    ];

    const response = await sendMessage(messages, activeOperator);
    const generatedText = response.content;

    console.log('[ContextMenu] AI response received:', generatedText.substring(0, 200));

    // Step 6: Send result to content script
    await chrome.tabs.sendMessage(tabId, {
      type: 'INSERT_GENERATED_TEXT',
      data: {
        text: generatedText,
        success: true
      }
    });

    console.log('[ContextMenu] Generated text sent for insertion');

  } catch (error) {
    console.error('[ContextMenu] Error in AI generation:', error);
    
    // Send error to content script
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'INSERT_GENERATED_TEXT',
        data: {
          text: '',
          success: false,
          error: error instanceof Error ? error.message : 'Generation failed'
        }
      });
    } catch (sendError) {
      console.error('[ContextMenu] Failed to send error to content script:', sendError);
    }
  }
}

// Handle custom instruction request from content script
async function handleCustomInstructionRequest(tabId: number, instruction: string) {
  await handleAIGeneration(tabId, undefined, undefined, instruction);
}

