import { Tool } from '@shared/types/tools';
import { PersonalInfo } from '@shared/types/extension';

/**
 * Инструмент 1: Получить поля формы
 */
export const getFormFieldsTool: Tool = {
  id: 'get-form-fields',
  name: 'Получить поля формы',
  description: 'Получает список всех полей формы на странице с их метаданными (id, name, type, label, placeholder, required). Используй этот инструмент ПЕРВЫМ перед заполнением формы.',
  icon: '📋',
  command: '/getfields',
  urlPattern: undefined,
  isBuiltIn: true,
  requiresPersonalInfo: true,
  
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
        return 'На странице не найдено полей формы.';
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
      
      return JSON.stringify({
        success: true,
        fields: fields,
        availableUserInfo: availableInfo,
        instructions: 'СЛЕДУЮЩИЙ ШАГ: Вызови fill-form-fields с параметром fieldsToFill. Создай объект сопоставления полей и данных пользователя. Например: {"email": "' + (availableInfo.email || 'user@mail.com') + '", "name": "' + ((availableInfo.firstName || '') + ' ' + (availableInfo.lastName || '')).trim() + '"}'
      }, null, 2);
    } catch (error) {
      console.error('Error in get form fields tool:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

/**
 * Инструмент 2: Заполнить поля формы
 */
export const fillFormFieldsTool: Tool = {
  id: 'fill-form-fields',
  name: 'Заполнить поля формы',
  description: 'Заполняет конкретные поля формы указанными значениями. ВАЖНО: Параметр fieldsToFill должен содержать объект где ключи - это id или name полей из get-form-fields, а значения - данные для заполнения из availableUserInfo.',
  icon: '✏️',
  command: '/fillfields',
  urlPattern: undefined,
  isBuiltIn: true,
  
  parameters: {
    type: 'object',
    properties: {
      fieldsToFill: {
        type: 'object',
        description: 'Объект сопоставления: ключ = id/name поля (из fields), значение = данные пользователя (из availableUserInfo). Пример для полей [{"name":"email"},{"name":"name"}] и данных {"email":"user@mail.com","firstName":"John","lastName":"Doe"}: {"email":"user@mail.com", "name":"John Doe"}'
      }
    },
    required: ['fieldsToFill']
  },

  async execute(params: { tabId: number; fieldsToFill: Record<string, string> }) {
    try {
      if (!params.fieldsToFill || Object.keys(params.fieldsToFill).length === 0) {
        return JSON.stringify({
          success: false,
          error: 'Не указаны поля для заполнения'
        });
      }

      // Заполняем указанные поля
      const response = await chrome.tabs.sendMessage(params.tabId, {
        type: 'FILL_FORM_FIELDS',
        data: { fieldsToFill: params.fieldsToFill }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fill form');
      }

      return JSON.stringify({
        success: true,
        filled: response.data.filled,
        total: response.data.total,
        message: `Форма успешно заполнена. Заполнено полей: ${response.data.filled} из ${response.data.total}`
      }, null, 2);
    } catch (error) {
      console.error('Error in fill form fields tool:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
  name: 'Заполнить форму',
  description: 'Автоматически заполняет форму на странице. Этот инструмент служит точкой входа для команды /fillform.',
  icon: '✏️',
  command: '/fillform',
  urlPattern: undefined,
  isBuiltIn: true,
  requiresPersonalInfo: true,
  
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



