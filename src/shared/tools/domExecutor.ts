import { Tool } from '@shared/types/tools';

export const executeDOMFunctionTool: Tool = {
  id: 'execute-dom-function',
  name: 'Execute DOM Function',
  description: 'Executes any DOM function on the page. Available functions: clickElement (click element by selector), setValue (set input/textarea value), selectOption (select dropdown option), setCheckbox (check/uncheck), getText (get element text), getAttribute (get attribute value), getElements (find elements), scrollToElement, waitForElement, focusElement, blurElement, hoverElement, removeElement, addClassName, removeClassName, toggleClassName, setStyle, getComputedStyle, isVisible, isEnabled, isChecked, getValue, getHTML, getOuterHTML, setHTML, insertHTML, replaceHTML, submitForm, resetForm, and more.',
  nameKey: 'tool_executeDOMFunction',
  descriptionKey: 'tool_executeDOMFunction_desc',
  icon: '⚙️',
  command: '/dom',
  urlPattern: undefined,
  isBuiltIn: true,
  hiddenFromUI: true,
  systemInstructions: 'Use this tool to execute any DOM function on the page for direct element manipulation. Pass the function name and its parameters.',
  
  parameters: {
    type: 'object',
    properties: {
      functionName: {
        type: 'string',
        description: 'Name of the DOM function to execute',
        enum: [
          'clickElement', 'setValue', 'getText', 'getAttribute', 'selectOption',
          'setCheckbox', 'getElements', 'scrollToElement', 'waitForElement',
          'focusElement', 'blurElement', 'hoverElement', 'removeElement',
          'addClassName', 'removeClassName', 'toggleClassName', 'setStyle',
          'getComputedStyle', 'isVisible', 'isEnabled', 'isChecked',
          'getValue', 'getHTML', 'getOuterHTML', 'setHTML', 'insertHTML',
          'replaceHTML', 'submitForm', 'resetForm', 'uploadFile',
          'downloadFile', 'printPage', 'copyToClipboard', 'pasteFromClipboard',
          'selectText', 'getSelection', 'executeScript', 'waitForCondition',
          'observeElement', 'dispatchEvent', 'createToast', 'showNotification'
        ]
      },
      params: {
        type: 'object',
        description: 'Parameters for the function. Examples: setValue needs {selector: "#id", value: "text"}. clickElement needs {selector: "#button", index: 0}. getText needs {selector: ".class"}. Check function signatures for exact parameters.'
      }
    },
    required: ['functionName', 'params']
  },

  async execute(params: { tabId: number; functionName: string; params: any }) {
    try {
      const { functionName, params: funcParams } = params;

      console.log('[executeDOMFunction] Tool called with:', { 
        tabId: params.tabId,
        functionName, 
        funcParams 
      });

      // Execute function in content script
      const response = await chrome.tabs.sendMessage(params.tabId, {
        type: 'EXECUTE_DOM_FUNCTION',
        data: {
          functionName,
          params: funcParams
        }
      });

      console.log('[executeDOMFunction] Response from content script:', response);

      if (response.success) {
        const resultMessage = `Function ${functionName} executed successfully${response.result ? ': ' + JSON.stringify(response.result) : ''}`;
        console.log('[executeDOMFunction] SUCCESS:', resultMessage);
        return JSON.stringify({
          success: true,
          result: response.result,
          message: resultMessage
        });
      } else {
        console.error('[executeDOMFunction] FAILED:', response.error);
        return JSON.stringify({
          success: false,
          error: response.error || 'Function execution failed'
        });
      }
    } catch (error) {
      console.error('[executeDOMFunction] Error:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

