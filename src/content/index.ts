import { extractPageContext, getPageMetadata, extractBySelector } from './pageContext';
import { startVisualEffect, stopVisualEffect, highlightElements } from './visualEffects';
import { fillForm } from './formFiller';
import { startElementSelector, stopElementSelector } from './elementSelector';
import { startScreenshotSelector, stopScreenshotSelector } from './screenshotSelector';
import { getElementByXPath, getCleanInnerHTML } from '@shared/utils/domSelector';
import * as domFunctions from './domFunctions';

// Content script entry point

console.log('AiLex content script loaded');

// Слушаем сообщения от background/popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  (async () => {
    try {
      switch (message.type) {
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
          startVisualEffect();
          sendResponse({ success: true });
          break;

        case 'STOP_VISUAL_EFFECT':
          stopVisualEffect();
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
            let total = 0;

            for (const [fieldIdentifier, value] of Object.entries(fieldsToFill)) {
              total++;
              
              // Пытаемся найти элемент по id, name или placeholder
              let element = document.getElementById(fieldIdentifier) as HTMLInputElement;
              
              if (!element) {
                element = document.querySelector(`[name="${fieldIdentifier}"]`) as HTMLInputElement;
              }
              
              if (!element) {
                element = document.querySelector(`input[placeholder="${fieldIdentifier}"], textarea[placeholder="${fieldIdentifier}"]`) as HTMLInputElement;
              }
              
              if (element && value) {
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                filled++;
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
          
          // Проверяем, существует ли функция
          if (typeof (domFunctions as any)[functionName] !== 'function') {
            sendResponse({ success: false, error: `Function ${functionName} not found` });
            break;
          }
          
          try {
            // Вызываем функцию
            const result = await (domFunctions as any)[functionName](params);
            sendResponse({ success: true, result });
          } catch (error) {
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Function execution failed' 
            });
          }
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

