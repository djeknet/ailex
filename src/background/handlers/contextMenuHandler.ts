// Context menu handler for AI commands on selected text

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

  if (!selectedText) {
    console.error('[ContextMenu] No text selected');
    return;
  }

  console.log('[ContextMenu] Opening side panel and executing command:', {
    commandId,
    textLength: selectedText.length,
    tabId: tab.id
  });

  try {
    // Check if this is an instruction command
    let instructionId: string | undefined;
    if (commandId.startsWith('instruction_')) {
      instructionId = commandId.replace('instruction_', '');
      console.log('[ContextMenu] Instruction command detected:', instructionId);
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
        instructionId // Pass instruction ID if it's an instruction command
      }
    });

    console.log('[ContextMenu] Message sent to UI');
  } catch (error) {
    console.error('[ContextMenu] Error handling context menu click:', error);
  }
}

