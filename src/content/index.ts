import { extractPageContext, getPageMetadata, extractBySelector } from './pageContext';
import { startVisualEffect, stopVisualEffect, highlightElements } from './visualEffects';
import { fillForm } from './formFiller';
import { startElementSelector, stopElementSelector } from './elementSelector';
import { startScreenshotSelector, stopScreenshotSelector } from './screenshotSelector';
import { getElementByXPath, getCleanInnerHTML } from '@shared/utils/domSelector';

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

