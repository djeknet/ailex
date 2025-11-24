// Custom instruction prompt UI for field filling

let promptContainer: HTMLElement | null = null;
let targetElement: HTMLElement | null = null;
let onSubmitCallback: ((instruction: string) => void) | null = null;

export function showCustomInstructionPrompt(
  element: HTMLElement,
  onSubmit: (instruction: string) => void
) {
  // Remove existing prompt if any
  hideCustomInstructionPrompt();

  targetElement = element;
  onSubmitCallback = onSubmit;

  // Detect dark mode
  const isDarkMode = document.documentElement.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Create prompt container with theme support
  promptContainer = document.createElement('div');
  promptContainer.id = 'ailex-custom-instruction-prompt';
  
  // Base styles with CSS variables for theming
  const bgColor = isDarkMode ? '#1c1917' : '#ffffff';
  const borderColor = isDarkMode ? '#292524' : '#e5e7eb';
  const textColor = isDarkMode ? '#f5f5f4' : '#1f2937';
  
  promptContainer.style.cssText = `
    all: initial;
    position: absolute;
    z-index: 2147483645;
    background: ${bgColor};
    border: 1px solid ${borderColor};
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, ${isDarkMode ? '0.5' : '0.15'});
    padding: 12px;
    min-width: 300px;
    max-width: 500px;
    margin-top: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: ${textColor};
  `;

  // Create textarea
  const textarea = document.createElement('textarea');
  textarea.id = 'ailex-instruction-textarea';
  textarea.setAttribute('data-i18n-placeholder', 'customInstructionPlaceholder');
  
  const inputBg = isDarkMode ? '#292524' : '#ffffff';
  const inputBorder = isDarkMode ? '#44403c' : '#d1d5db';
  const inputFocus = isDarkMode ? '#22c55e' : '#3b82f6';
  
  textarea.style.cssText = `
    all: initial;
    display: block;
    width: 100%;
    min-height: 80px;
    padding: 8px;
    background: ${inputBg};
    border: 1px solid ${inputBorder};
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: ${textColor};
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  `;

  textarea.addEventListener('focus', () => {
    textarea.style.borderColor = inputFocus;
  });

  textarea.addEventListener('blur', () => {
    textarea.style.borderColor = inputBorder;
  });

  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    all: initial;
    display: flex;
    gap: 8px;
    margin-top: 8px;
    justify-content: flex-end;
  `;

  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="m15 9-6 6"></path>
      <path d="m9 9 6 6"></path>
    </svg>
    <span data-i18n="cancel">Cancel</span>
  `;
  
  const cancelBg = isDarkMode ? '#292524' : '#f3f4f6';
  const cancelBgHover = isDarkMode ? '#44403c' : '#e5e7eb';
  const cancelBorder = isDarkMode ? '#44403c' : '#d1d5db';
  
  cancelButton.style.cssText = `
    all: initial;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: ${cancelBg};
    border: 1px solid ${cancelBorder};
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: ${textColor};
    transition: background 0.15s;
  `;

  cancelButton.addEventListener('mouseenter', () => {
    cancelButton.style.background = cancelBgHover;
  });

  cancelButton.addEventListener('mouseleave', () => {
    cancelButton.style.background = cancelBg;
  });

  cancelButton.addEventListener('click', () => {
    hideCustomInstructionPrompt();
  });

  // Submit button
  const submitButton = document.createElement('button');
  submitButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z"></path>
      <path d="M22 2 11 13"></path>
    </svg>
    <span data-i18n="sendMessage">Send</span>
  `;
  submitButton.disabled = true;
  
  const submitBg = isDarkMode ? '#22c55e' : '#3b82f6';
  const submitBgHover = isDarkMode ? '#16a34a' : '#2563eb';
  
  submitButton.style.cssText = `
    all: initial;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: ${submitBg};
    border: 1px solid ${submitBg};
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: white;
    transition: background 0.15s, opacity 0.15s;
    opacity: 0.5;
    cursor: not-allowed;
  `;

  const updateSubmitButton = () => {
    const hasText = textarea.value.trim().length > 0;
    submitButton.disabled = !hasText;
    submitButton.style.opacity = hasText ? '1' : '0.5';
    submitButton.style.cursor = hasText ? 'pointer' : 'not-allowed';
  };

  textarea.addEventListener('input', updateSubmitButton);

  submitButton.addEventListener('mouseenter', () => {
    if (!submitButton.disabled) {
      submitButton.style.background = submitBgHover;
    }
  });

  submitButton.addEventListener('mouseleave', () => {
    if (!submitButton.disabled) {
      submitButton.style.background = submitBg;
    }
  });

  submitButton.addEventListener('click', () => {
    const instruction = textarea.value.trim();
    if (instruction && onSubmitCallback) {
      onSubmitCallback(instruction);
      hideCustomInstructionPrompt();
    }
  });

  // Handle Enter key (with Ctrl/Cmd)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const instruction = textarea.value.trim();
      if (instruction && onSubmitCallback) {
        onSubmitCallback(instruction);
        hideCustomInstructionPrompt();
      }
    }
  });

  // Assemble UI
  buttonsContainer.appendChild(cancelButton);
  buttonsContainer.appendChild(submitButton);
  promptContainer.appendChild(textarea);
  promptContainer.appendChild(buttonsContainer);

  // Position below the target element
  const rect = element.getBoundingClientRect();
  promptContainer.style.left = `${rect.left + window.scrollX}px`;
  promptContainer.style.top = `${rect.bottom + window.scrollY}px`;

  document.body.appendChild(promptContainer);

  // Load translations
  loadTranslations(promptContainer);

  // Focus textarea
  setTimeout(() => textarea.focus(), 100);

  // Close on Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideCustomInstructionPrompt();
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Store handler for cleanup
  (promptContainer as any)._escapeHandler = handleEscape;
}

export function hideCustomInstructionPrompt() {
  if (promptContainer) {
    // Remove escape handler
    if ((promptContainer as any)._escapeHandler) {
      document.removeEventListener('keydown', (promptContainer as any)._escapeHandler);
    }
    
    if (promptContainer.parentNode) {
      promptContainer.parentNode.removeChild(promptContainer);
    }
    promptContainer = null;
  }
  
  targetElement = null;
  onSubmitCallback = null;
}

export function getTargetElement(): HTMLElement | null {
  return targetElement;
}

// Load translations for the UI
async function loadTranslations(container: HTMLElement) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_STORAGE',
      data: { storage: 'sync', keys: ['language'] }
    });
    
    const language = response?.language || 'en';
    const messagesUrl = chrome.runtime.getURL(`_locales/${language}/messages.json`);
    const messagesResponse = await fetch(messagesUrl);
    const messages = await messagesResponse.json();
    
    // Apply translations
    const elements = container.querySelectorAll('[data-i18n], [data-i18n-placeholder]');
    elements.forEach((el: Element) => {
      const key = el.getAttribute('data-i18n');
      if (key && messages[key]) {
        el.textContent = messages[key].message;
      }
      
      const placeholderKey = el.getAttribute('data-i18n-placeholder');
      if (placeholderKey && messages[placeholderKey] && el instanceof HTMLTextAreaElement) {
        el.placeholder = messages[placeholderKey].message;
      }
    });
  } catch (error) {
    console.error('[customInstructionPrompt] Error loading translations:', error);
  }
}

