import { extractPageContext, getPageMetadata, extractBySelector } from './pageContext';
import { startVisualEffect, stopVisualEffect, highlightElements, updateParsingProgress } from './visualEffects';
import { fillForm } from './formFiller';
import { startElementSelector, stopElementSelector } from './elementSelector';
import { startScreenshotSelector, stopScreenshotSelector } from './screenshotSelector';
import { getElementByXPath, getCleanInnerHTML } from '@shared/utils/domSelector';
import * as domFunctions from './domFunctions';
import { showFieldLoader, hideFieldLoader, getSavedActiveElement, clearSavedActiveElement } from './fieldLoader';
import { showToast } from './toast';
import { showCustomInstructionPrompt, hideCustomInstructionPrompt } from './customInstructionPrompt';
import { initSiteWidget } from './siteWidget';

// Content script entry point

console.log('AiLex content script loaded');

// Initialize site widget after page load (if enabled in settings)
const initializeWidget = async () => {
  try {
    const result = await chrome.storage.sync.get(['showSiteWidget']);
    const showSiteWidget = result.showSiteWidget !== undefined ? result.showSiteWidget : true;
    
    if (showSiteWidget) {
      console.log('[content] Initializing site widget...');
      setTimeout(() => initSiteWidget(), 1000);
    } else {
      console.log('[content] Site widget disabled in settings');
    }
  } catch (error) {
    console.error('[content] Error checking widget settings:', error);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeWidget();
  });
} else {
  // DOM already loaded
  initializeWidget();
}

// Слушаем сообщения от background/popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  (async () => {
    try {
      switch (message.type) {
        case 'PING':
          // Simple ping-pong for availability check
          sendResponse({ success: true, pong: true });
          break;

        case 'GET_PAGE_CONTEXT':
          const contextData = extractPageContext(
            message.data?.type || 'text',
            message.data?.maxTokens
          );
          sendResponse({ success: true, data: contextData });
          break;

        case 'GET_PAGE_METADATA':
          const metadata = getPageMetadata();
          sendResponse({ success: true, data: metadata });
          break;

        case 'EXTRACT_BY_SELECTOR':
          const content = extractBySelector(message.data.selector);
          sendResponse({ success: true, data: content });
          break;

        case 'START_VISUAL_EFFECT':
          const effectType = message.data?.type || 'tool';
          const sessionId = message.data?.sessionId;
          startVisualEffect(effectType, sessionId);
          sendResponse({ success: true });
          break;

        case 'STOP_VISUAL_EFFECT':
          stopVisualEffect();
          sendResponse({ success: true });
          break;

        case 'UPDATE_PARSING_PROGRESS':
          updateParsingProgress(
            message.data.current,
            message.data.total,
            message.data.status,
            message.data.sessionId
          );
          sendResponse({ success: true });
          break;

        case 'HIGHLIGHT_ELEMENTS':
          highlightElements(message.data.selector, message.data.duration);
          sendResponse({ success: true });
          break;

        case 'FILL_FORM':
          const result = await fillForm(message.data.personalInfo);
          sendResponse({ success: true, data: result });
          break;

        case 'FILL_FORM_FIELDS':
          try {
            const fieldsToFill = message.data.fieldsToFill as Record<string, string>;
            let filled = 0;
            let total = Object.keys(fieldsToFill).length;

            for (const [fieldIdentifier, value] of Object.entries(fieldsToFill)) {
              // Пытаемся найти элемент по id, name или placeholder
              let element = document.getElementById(fieldIdentifier) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
              
              if (!element) {
                element = document.querySelector(`[name="${fieldIdentifier}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
              }
              
              if (!element) {
                element = document.querySelector(`input[placeholder="${fieldIdentifier}"], textarea[placeholder="${fieldIdentifier}"]`) as HTMLInputElement | HTMLTextAreaElement;
              }
              
              if (element && value) {
                // Обработка SELECT элементов
                if (element.tagName === 'SELECT') {
                  const select = element as HTMLSelectElement;
                  
                  // Пытаемся найти option по value
                  let optionFound = false;
                  for (let i = 0; i < select.options.length; i++) {
                    const option = select.options[i];
                    // Сравниваем по value или по тексту (case-insensitive)
                    if (option.value.toLowerCase() === value.toLowerCase() || 
                        option.text.toLowerCase() === value.toLowerCase() ||
                        option.text.toLowerCase().includes(value.toLowerCase())) {
                      select.selectedIndex = i;
                      optionFound = true;
                      break;
                    }
                  }
                  
                  if (optionFound) {
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    filled++;
                  }
                } else {
                  // Обработка INPUT и TEXTAREA
                  element.value = value;
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  filled++;
                }
              }
            }

            sendResponse({ success: true, data: { filled, total } });
          } catch (error) {
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Failed to fill form fields' 
            });
          }
          break;

        case 'STOP_PROCESSING':
          stopVisualEffect();
          sendResponse({ success: true, stopped: true });
          break;

        case 'START_ELEMENT_SELECTOR':
          startElementSelector(
            (data) => {
              chrome.runtime.sendMessage({
                type: 'ELEMENT_SELECTED',
                data
              });
            },
            () => {
              chrome.runtime.sendMessage({
                type: 'ELEMENT_SELECTION_CANCELLED'
              });
            }
          );
          sendResponse({ success: true });
          break;

        case 'STOP_ELEMENT_SELECTOR':
          stopElementSelector();
          sendResponse({ success: true });
          break;

        case 'CAPTURE_SCREENSHOT_AREA':
          startScreenshotSelector(
            (area) => {
              chrome.runtime.sendMessage({
                type: 'SCREENSHOT_AREA_SELECTED',
                data: area
              });
            },
            () => {
              chrome.runtime.sendMessage({
                type: 'SCREENSHOT_SELECTION_CANCELLED'
              });
            }
          );
          sendResponse({ success: true });
          break;

        case 'STOP_SCREENSHOT_SELECTOR':
          stopScreenshotSelector();
          sendResponse({ success: true });
          break;


          case 'CAPTURE_SCREENSHOT':
          // Делаем скриншот всей видимой части страницы
          try {
            console.log('[content] Capturing screenshot...');
            const screenshot = await chrome.runtime.sendMessage({
              type: 'CAPTURE_SCREENSHOT',
              data: { tabId: message.data.tabId } // Передаем tabId в background
            });
            
            if (screenshot?.success) {
              console.log('[content] Screenshot captured successfully');
              sendResponse({ success: true, data: screenshot.data });
            } else {
              console.error('[content] Screenshot capture failed:', screenshot?.error);
              sendResponse({ success: false, error: screenshot?.error || 'Failed to capture screenshot' });
            }
          } catch (error) {
            console.error('[content] Error capturing screenshot:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
          return true; // Асинхронный ответ
          break;

        case 'GET_ELEMENT_CONTENT':
          const element = getElementByXPath(message.data.xpath);
          if (element) {
            const innerHTML = getCleanInnerHTML(element);
            sendResponse({ success: true, data: { innerHTML } });
          } else {
            sendResponse({ success: false, error: 'Element not found' });
          }
          break;

        case 'EXECUTE_DOM_FUNCTION':
          const { functionName, params } = message.data;
          
          console.log('[content] EXECUTE_DOM_FUNCTION received:', { functionName, params });
          
          // Проверяем, существует ли функция
          if (typeof (domFunctions as any)[functionName] !== 'function') {
            console.error('[content] Function not found:', functionName);
            sendResponse({ success: false, error: `Function ${functionName} not found` });
            break;
          }
          
          try {
            console.log('[content] Calling function:', functionName, 'with params:', params);
            // Вызываем функцию
            const result = await (domFunctions as any)[functionName](params);
            console.log('[content] Function result:', { functionName, result });
            sendResponse({ success: true, result });
          } catch (error) {
            console.error('[content] Error executing function:', functionName, error);
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Function execution failed' 
            });
          }
          break;

        case 'DETECT_PAGE_TYPE':
          try {
            const pageTypes = message.data?.pageTypes || {};
            let detectedType: string | null = null;
            
            // Проверяем каждый тип страницы по его селекторам
            for (const [typeName, typeConfig] of Object.entries(pageTypes)) {
              const selectors = (typeConfig as any).selectors || [];
              
              // Проверяем, существует ли хотя бы один из селекторов
              for (const selector of selectors) {
                try {
                  const element = document.querySelector(selector);
                  if (element) {
                    detectedType = typeName;
                    console.log('[content] Detected page type:', typeName, 'via selector:', selector);
                    break;
                  }
                } catch (error) {
                  console.warn('[content] Invalid selector:', selector, error);
                }
              }
              
              if (detectedType) break;
            }
            
            sendResponse({ success: true, pageType: detectedType });
          } catch (error) {
            console.error('[content] Error detecting page type:', error);
            sendResponse({ success: false, error: 'Failed to detect page type' });
          }
          break;

        case 'GET_PDF_DATA':
          try {
            const pdfUrl = message.data?.url;
            
            if (!pdfUrl) {
              sendResponse({ success: false, error: 'No PDF URL provided' });
              break;
            }
            
            console.log('[content] Fetching PDF from:', pdfUrl);
            
            // Fetch PDF as blob
            const response = await fetch(pdfUrl);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch PDF: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              // Remove data URL prefix
              const base64 = base64data.split(',')[1] || base64data;
              
              console.log('[content] PDF fetched successfully, size:', blob.size, 'bytes');
              sendResponse({ 
                success: true, 
                data: base64, 
                mimeType: 'application/pdf',
                size: blob.size
              });
            };
            reader.onerror = () => {
              console.error('[content] Error reading PDF blob');
              sendResponse({ success: false, error: 'Failed to read PDF data' });
            };
            reader.readAsDataURL(blob);
            
            // Return true to indicate async response
            return true;
          } catch (error) {
            console.error('[content] Error fetching PDF:', error);
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Failed to fetch PDF' 
            });
          }
          break;

        case 'START_FIELD_LOADER':
          try {
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && (
              activeElement.tagName === 'INPUT' || 
              activeElement.tagName === 'TEXTAREA' || 
              activeElement.isContentEditable
            )) {
              showFieldLoader(activeElement);
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'No active editable element' });
            }
          } catch (error) {
            console.error('[content] Error showing field loader:', error);
            sendResponse({ success: false, error: 'Failed to show loader' });
          }
          break;

        case 'INSERT_PERSONAL_DATA':
          try {
            const text = message.data?.text || '';
            const inserted = insertTextIntoActiveElement(text);
            sendResponse({ success: inserted });
          } catch (error) {
            console.error('[content] Error inserting personal data:', error);
            sendResponse({ success: false, error: 'Failed to insert data' });
          }
          break;

        case 'INSERT_GENERATED_TEXT':
          try {
            console.log('[content] INSERT_GENERATED_TEXT received, savedElement:', getSavedActiveElement());
            hideFieldLoader();
            
            const { text, success, error: errorMsg } = message.data || {};
            
            if (success && text) {
              // Use saved element instead of document.activeElement
              const targetElement = getSavedActiveElement();
              console.log('[content] Target element for insertion:', targetElement, 'text length:', text.length);
              
              const inserted = targetElement ? insertTextIntoElement(targetElement, text) : false;
              
              if (inserted) {
                showToast('Response generated', 'success');
              } else {
                showToast('Failed to insert text', 'error');
              }
              
              clearSavedActiveElement();
              sendResponse({ success: inserted });
            } else {
              showToast(errorMsg || 'Generation error', 'error');
              clearSavedActiveElement();
              sendResponse({ success: false });
            }
          } catch (error) {
            hideFieldLoader();
            clearSavedActiveElement();
            console.error('[content] Error inserting generated text:', error);
            showToast('Failed to insert text', 'error');
            sendResponse({ success: false, error: 'Failed to insert text' });
          }
          break;

        case 'SHOW_CUSTOM_INSTRUCTION_PROMPT':
          try {
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && (
              activeElement.tagName === 'INPUT' || 
              activeElement.tagName === 'TEXTAREA' || 
              activeElement.isContentEditable
            )) {
              showCustomInstructionPrompt(activeElement, (instruction) => {
                // Get the target element from custom instruction prompt
                // This is the original field where user clicked
                const targetField = activeElement;
                
                // Show loader on the target field
                showFieldLoader(targetField);
                
                // Send custom instruction to background for processing
                chrome.runtime.sendMessage({
                  type: 'PROCESS_CUSTOM_INSTRUCTION',
                  data: { instruction }
                });
              });
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'No active editable element' });
            }
          } catch (error) {
            console.error('[content] Error showing custom instruction prompt:', error);
            sendResponse({ success: false, error: 'Failed to show prompt' });
          }
          break;

        case 'HIDE_CUSTOM_INSTRUCTION_PROMPT':
          hideCustomInstructionPrompt();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  })();
  
  return true;
});

// Helper function to insert text into the active element
function insertTextIntoActiveElement(text: string): boolean {
  const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  
  if (!activeElement) {
    console.error('[content] No active element');
    return false;
  }

  return insertTextIntoElement(activeElement, text);
}

// Helper function to insert text into a specific element
function insertTextIntoElement(element: HTMLElement, text: string): boolean {
  console.log('[content] insertTextIntoElement called, element:', element.tagName, element.isContentEditable, 'text length:', text.length);
  
  if (!element) {
    console.error('[content] No element provided');
    return false;
  }

  try {
    // For INPUT and TEXTAREA elements
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
      const start = inputElement.selectionStart || 0;
      const end = inputElement.selectionEnd || 0;
      const currentValue = inputElement.value;
      
      // Insert text at cursor position
      inputElement.value = currentValue.substring(0, start) + text + currentValue.substring(end);
      
      // Move cursor to end of inserted text
      const newPosition = start + text.length;
      inputElement.selectionStart = newPosition;
      inputElement.selectionEnd = newPosition;
      
      // Focus the element
      inputElement.focus();
      
      // Trigger events for frameworks (React, Vue, etc.)
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('[content] Text inserted into input/textarea');
      return true;
    }
    
    // For contenteditable elements
    if (element.isContentEditable) {
      console.log('[content] Inserting into contenteditable, current content:', element.textContent);
      
      // Focus the element first
      element.focus();
      
      try {
        // Clear existing content by selecting all
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(element);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        // Create a ClipboardEvent for paste (works with Draft.js)
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', text);
        
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: dataTransfer,
          bubbles: true,
          cancelable: true
        });
        
        element.dispatchEvent(pasteEvent);
        
        console.log('[content] Text inserted via ClipboardEvent');
      } catch (error) {
        console.error('[content] ClipboardEvent failed, using fallback:', error);
        
        // Fallback: try to set value directly via React/Draft.js
        // Clear and type character by character
        element.textContent = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Insert text
        element.textContent = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      console.log('[content] Text inserted into contenteditable, new content:', element.textContent);
      return true;
    }
    
    console.warn('[content] Element is not editable:', element.tagName);
    return false;
  } catch (error) {
    console.error('[content] Error inserting text:', error);
    return false;
  }
}

