import { Tool } from '@shared/types/tools';
import { PersonalInfo } from '@shared/types/extension';

export const fillFormTool: Tool = {
  id: 'fill-form',
  name: 'Заполнить форму',
  description: 'Автоматически заполняет форму на странице',
  icon: '✏️',
  requiresPersonalInfo: true,

  async execute(params: { tabId: number; personalInfo: PersonalInfo }) {
    try {
      if (!params.personalInfo) {
        return {
          success: false,
          error: 'Personal information is required'
        };
      }

      // Start visual effect
      await chrome.tabs.sendMessage(params.tabId, {
        type: 'START_VISUAL_EFFECT'
      });

      // Fill form
      const response = await chrome.tabs.sendMessage(params.tabId, {
        type: 'FILL_FORM',
        data: { personalInfo: params.personalInfo }
      });

      // Stop visual effect
      await chrome.tabs.sendMessage(params.tabId, {
        type: 'STOP_VISUAL_EFFECT'
      });

      if (!response.success) {
        throw new Error('Failed to fill form');
      }

      return {
        success: true,
        filled: response.data.filled,
        total: response.data.total
      };
    } catch (error) {
      console.error('Error in fill form tool:', error);
      
      // Try to stop visual effect even on error
      try {
        await chrome.tabs.sendMessage(params.tabId, {
          type: 'STOP_VISUAL_EFFECT'
        });
      } catch (e) {
        // Ignore
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

