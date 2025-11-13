import { Tool } from '@shared/types/tools';
import { getTranslation } from '@shared/i18n/useTranslation';

/**
 * Инструмент для установки/снятия галочки checkbox
 */
export const setCheckboxTool: Tool = {
  id: 'set-checkbox',
  name: 'Set Checkbox',
  description: 'Check or uncheck a checkbox element on the page. Use CSS selector to find the checkbox.',
  nameKey: 'tool_setCheckbox',
  descriptionKey: 'tool_setCheckbox_desc',
  icon: '☑️',
  command: '/checkbox',
  urlPattern: undefined,
  isBuiltIn: true,
  hiddenFromUI: true, // Скрыт из UI, используется только AI
  systemInstructions: 'Use this tool to check or uncheck checkboxes on the page. You can use CSS selectors like input[type="checkbox"], #agree-checkbox, or .terms-checkbox to target specific checkboxes.',
  
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector to find the checkbox element (e.g., input[type="checkbox"], #agree-checkbox, .terms-checkbox)'
      },
      checked: {
        type: 'boolean',
        description: 'true to check the checkbox, false to uncheck it'
      }
    },
    required: ['selector', 'checked']
  },

  async execute(params: { tabId: number; selector: string; checked: boolean }) {
    try {
      const { executeDOMFunction } = await import('@shared/services/toolExecutor');
      
      const result = await executeDOMFunction('setCheckbox', [params.selector, params.checked], params.tabId);
      
      if (result) {
        const action = params.checked ? getTranslation('checked') : getTranslation('unchecked');
        return getTranslation('checkboxSuccess').replace('{action}', action).replace('{selector}', params.selector);
      } else {
        return getTranslation('checkboxNotFound').replace('{selector}', params.selector);
      }
    } catch (error) {
      console.error('Error in set checkbox tool:', error);
      const errorMsg = error instanceof Error ? error.message : getTranslation('unknownError');
      return `${getTranslation('checkboxError')}: ${errorMsg}`;
    }
  }
};

/**
 * Инструмент для отправки формы
 */
export const submitFormTool: Tool = {
  id: 'submit-form',
  name: 'Submit Form',
  description: 'Submit a form on the page by clicking the submit button or calling form.submit(). Optionally provide a CSS selector to target a specific form.',
  nameKey: 'tool_submitForm',
  descriptionKey: 'tool_submitForm_desc',
  icon: '📤',
  command: '/submitform',
  urlPattern: undefined,
  isBuiltIn: true,
  systemInstructions: 'Use this tool to submit a form after filling it. You can provide a CSS selector (like #myForm or form.contact-form) to target a specific form, or omit it to submit the first form on the page.',
  
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'Optional CSS selector to find a specific form element (e.g., #myForm, form.contact-form). If not provided, will submit the first form on the page.'
      }
    },
    required: []
  },

  async execute(params: { tabId: number; selector?: string }) {
    try {
      const { executeDOMFunction } = await import('@shared/services/toolExecutor');
      
      const result = await executeDOMFunction('submitForm', params.selector, params.tabId);
      
      if (result) {
        return getTranslation('formSubmitSuccess');
      } else {
        return getTranslation('formNotFound');
      }
    } catch (error) {
      console.error('Error in submit form tool:', error);
      const errorMsg = error instanceof Error ? error.message : getTranslation('unknownError');
      return `${getTranslation('formSubmitError')}: ${errorMsg}`;
    }
  }
};

