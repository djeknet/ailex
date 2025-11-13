import { Tool } from '@shared/types/tools';
import { PersonalInfo } from '@shared/types/extension';
import { getTranslation } from '@shared/i18n/useTranslation';

/**
 * Инструмент 1: Получить поля формы
 */
export const getFormFieldsTool: Tool = {
  id: 'get-form-fields',
  name: 'Get form fields',
  description: 'Gets a list of all form fields on the page with their metadata (id, name, type, label, placeholder, required). Use this tool FIRST before filling out the form.',
  nameKey: 'tool_getFormFields',
  descriptionKey: 'tool_getFormFields_desc',
  icon: '📋',
  command: '/getfields',
  urlPattern: undefined,
  isBuiltIn: true,
  requiresPersonalInfo: true,
  hiddenFromUI: true, // Скрыт из UI, используется только AI
  systemInstructions: 'After calling get-form-fields, analyze the returned fields and availableUserInfo. Then call fill-form-fields with appropriate mappings.',
  
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },

  async execute(params: { tabId: number; personalInfo?: PersonalInfo }) {
    try {
      const { executeDOMFunction } = await import('@shared/services/toolExecutor');
      const fields = await executeDOMFunction('getFormFields', undefined, params.tabId);
      
      if (!fields || fields.length === 0) {
        return getTranslation('formFieldsNotFound');
      }
      
      // Возвращаем информацию о полях и доступных данных пользователя
      const availableInfo: any = {};
      
      if (params.personalInfo) {
        availableInfo.firstName = params.personalInfo.firstName || '';
        availableInfo.lastName = params.personalInfo.lastName || '';
        availableInfo.email = params.personalInfo.email || '';
        availableInfo.phone = params.personalInfo.phone || '';
        availableInfo.address = params.personalInfo.address || '';
        availableInfo.city = params.personalInfo.city || '';
        availableInfo.country = params.personalInfo.country || '';
        availableInfo.zipCode = params.personalInfo.zipCode || '';
        availableInfo.company = params.personalInfo.company || '';
        availableInfo.position = params.personalInfo.position || '';
      }
      
      const example = `{"email": "${availableInfo.email || 'user@mail.com'}", "name": "${((availableInfo.firstName || '') + ' ' + (availableInfo.lastName || '')).trim()}"}`;
      const instructions = getTranslation('formFieldsNextStep').replace('{example}', example);
      
      return JSON.stringify({
        success: true,
        fields: fields,
        availableUserInfo: availableInfo,
        instructions: instructions
      }, null, 2);
    } catch (error) {
      console.error('Error in get form fields tool:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : getTranslation('unknownError')
      });
    }
  }
};

/**
 * Инструмент 2: Заполнить поля формы
 */
export const fillFormFieldsTool: Tool = {
  id: 'fill-form-fields',
  name: 'Fill in the form fields',
  description: 'Fills specific form fields with provided values. IMPORTANT: fieldsToFill parameter must contain an object where keys are id or name of fields from get-form-fields, and values are data to fill from availableUserInfo.',
  nameKey: 'tool_fillFormFields',
  descriptionKey: 'tool_fillFormFields_desc',
  icon: '✏️',
  command: '/fillfields',
  urlPattern: undefined,
  isBuiltIn: true,
  hiddenFromUI: true, // Скрыт из UI, используется только AI
  systemInstructions: 'IMPORTANT: fieldsToFill parameter MUST contain actual field mappings from the data you received from get-form-fields. Never use empty objects {}.',
  
  parameters: {
    type: 'object',
    properties: {
      fieldsToFill: {
        type: 'object',
        description: 'Mapping object: key = field id/name (from fields), value = user data (from availableUserInfo). Example for fields [{"name":"email"},{"name":"name"}] and data {"email":"user@mail.com","firstName":"John","lastName":"Doe"}: {"email":"user@mail.com", "name":"John Doe"}'
      }
    },
    required: ['fieldsToFill']
  },

  async execute(params: { tabId: number; fieldsToFill: Record<string, string> }) {
    try {
      if (!params.fieldsToFill || Object.keys(params.fieldsToFill).length === 0) {
        return JSON.stringify({
          success: false,
          error: getTranslation('formFieldsNotSpecified')
        });
      }

      // Заполняем указанные поля
      const response = await chrome.tabs.sendMessage(params.tabId, {
        type: 'FILL_FORM_FIELDS',
        data: { fieldsToFill: params.fieldsToFill }
      });

      if (!response.success) {
        throw new Error(response.error || getTranslation('formFillFailed'));
      }

      const message = getTranslation('formFillSuccess')
        .replace('{filled}', response.data.filled.toString())
        .replace('{total}', response.data.total.toString());

      return JSON.stringify({
        success: true,
        filled: response.data.filled,
        total: response.data.total,
        message: message
      }, null, 2);
    } catch (error) {
      console.error('Error in fill form fields tool:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : getTranslation('unknownError')
      });
    }
  }
};

/**
 * Основной инструмент для команды /fillform
 * Возвращает инструкцию AI вызвать get-form-fields
 */
export const fillFormTool: Tool = {
  id: 'fill-form',
  name: 'Fill in the form',
  description: 'IMPORTANT: When user sends /fillform command, you MUST immediately call get-form-fields tool to start the form filling process. This tool serves as entry point for /fillform command.',
  nameKey: 'tool_fillForm',
  descriptionKey: 'tool_fillForm_desc',
  icon: '✏️',
  command: '/fillform',
  urlPattern: undefined,
  isBuiltIn: true,
  requiresPersonalInfo: true,
  systemInstructions: 'User sent /fillform command. You MUST call get-form-fields tool first to get form fields, then call fill-form-fields with the appropriate data mapping.',
  
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },

  async execute(params: { tabId: number; personalInfo?: PersonalInfo }) {
    // Вызываем get-form-fields напрямую чтобы начать процесс
    return await getFormFieldsTool.execute(params);
  }
};



