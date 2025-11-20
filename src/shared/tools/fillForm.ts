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
  hiddenFromUI: true, // Hidden from UI, used only by AI
  systemInstructions: 'After calling get-form-fields, analyze the returned fields and availableUserInfo. Then call fill-form-fields with appropriate mappings. IMPORTANT: Map ALL fields that have matching data in availableUserInfo - do not skip any fields that can be filled. For select elements, use the full text value (e.g., "United States" not "USA"). DO NOT submit the form unless user explicitly asks.',
  
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
      
      // Return information about fields and available user data
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
      
      const example = `{"firstName": "${availableInfo.firstName || 'John'}", "lastName": "${availableInfo.lastName || 'Doe'}", "email": "${availableInfo.email || 'user@mail.com'}", "phone": "${availableInfo.phone || '+1234567890'}", "address": "${availableInfo.address || '123 Main St'}", "city": "${availableInfo.city || 'New York'}", "zipCode": "${availableInfo.zipCode || '10001'}", "country": "${availableInfo.country || 'United States'}", "company": "${availableInfo.company || 'Acme Inc'}", "position": "${availableInfo.position || 'Developer'}"}`;
      
      return JSON.stringify({
        success: true,
        fields: fields,
        totalFields: fields.length,
        availableUserInfo: availableInfo,
        _instructions: `CRITICAL: You must map ALL ${fields.length} fields to availableUserInfo. Create fieldsToFill object with complete mappings for every field that has data. Do not skip any fields! Full example: ${example}`,
        message: getTranslation('formFieldsFound').replace('{count}', fields.length.toString())
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
  hiddenFromUI: true, // Hidden from UI, used only by AI
  systemInstructions: 'IMPORTANT: fieldsToFill parameter MUST contain actual field mappings from the data you received from get-form-fields. Never use empty objects {}. DO NOT submit the form after filling. CRITICAL: Ensure valid JSON syntax with commas between all properties.',
  
  parameters: {
    type: 'object',
    properties: {
      fieldsToFill: {
        type: 'object',
        description: 'Mapping object: key = field id/name (from fields), value = user data (from availableUserInfo). IMPORTANT: Must be valid JSON with proper commas between all key-value pairs. Example for fields [{"name":"email"},{"name":"name"}] and data {"email":"user@mail.com","firstName":"John","lastName":"Doe"}: {"email":"user@mail.com","name":"John Doe"}'
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

      // Fill the specified fields
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
 * Main tool for /fillform command
 * Returns instruction for AI to call get-form-fields
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
  systemInstructions: 'User sent /fillform command. You MUST call get-form-fields tool first to get form fields, then call fill-form-fields with the appropriate data mapping. DO NOT call submit-form unless user explicitly asks to submit.',
  
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },

  async execute(params: { tabId: number; personalInfo?: PersonalInfo }) {
    // Call get-form-fields directly to start the process
    return await getFormFieldsTool.execute(params);
  }
};



