import { create } from 'zustand';
import { Tool, CustomTool, ToolExecution } from '@shared/types/tools';
import * as toolsService from '@shared/services/toolsService';
import { i18nService } from '@shared/i18n/i18nService';

interface ToolsStore {
  // Состояние
  availableTools: Tool[];
  customTools: CustomTool[];
  currentExecutions: Record<string, ToolExecution>; // executions by ID
  isLoading: boolean;
  error: string | null;
  currentUrl: string | null;
  
  // Actions
  loadTools: () => Promise<void>;
  loadCustomTools: () => Promise<void>;
  getFilteredTools: () => Tool[];
  addExecution: (execution: ToolExecution) => void;
  updateExecution: (id: string, updates: Partial<ToolExecution>) => void;
  removeExecution: (id: string) => void;
  createCustomTool: (tool: Omit<CustomTool, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCustomTool: (id: string, updates: Partial<CustomTool>) => Promise<void>;
  deleteCustomTool: (id: string) => Promise<void>;
  setCurrentUrl: (url: string | null) => void;
  clearError: () => void;
}

export const useToolsStore = create<ToolsStore>((set, get) => ({
  // Initial state
  availableTools: [],
  customTools: [],
  currentExecutions: {},
  isLoading: false,
  error: null,
  currentUrl: null,
  
  // Load all available tools
  loadTools: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Загружаем ВСЕ инструменты БЕЗ фильтрации по URL
      // Фильтрация по URL будет в getFilteredTools()
      const tools = await toolsService.getAllAvailableTools();
      set({ availableTools: tools, isLoading: false });
    } catch (error) {
      console.error('Error loading tools:', error);
      set({ 
        error: error instanceof Error ? error.message : i18nService.getMessage('errorLoadingTools'),
        isLoading: false 
      });
    }
  },
  
  // Load custom tools
  loadCustomTools: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const customTools = await toolsService.getCustomTools();
      set({ customTools, isLoading: false });
    } catch (error) {
      console.error('Error loading custom tools:', error);
      set({ 
        error: error instanceof Error ? error.message : i18nService.getMessage('errorLoadingCustomTools'),
        isLoading: false 
      });
    }
  },
  
  // Get filtered tools based on current URL
  getFilteredTools: () => {
    const { availableTools, currentUrl } = get();
    
    // Фильтруем скрытые инструменты для UI
    let filtered = availableTools.filter(tool => !tool.hiddenFromUI);
    
    // Убрали избыточное логирование - теперь логируется только когда URL меняется
    
    if (!currentUrl) {
      return filtered;
    }
    
    // Фильтруем по URL паттерну
    const result = toolsService.filterToolsByUrl(filtered, currentUrl);
    
    return result;
  },
  
  // Add execution
  addExecution: (execution: ToolExecution) => {
    set(state => ({
      currentExecutions: {
        ...state.currentExecutions,
        [execution.id]: execution
      }
    }));
  },
  
  // Update execution
  updateExecution: (id: string, updates: Partial<ToolExecution>) => {
    set(state => {
      const existing = state.currentExecutions[id];
      if (!existing) return state;
      
      return {
        currentExecutions: {
          ...state.currentExecutions,
          [id]: { ...existing, ...updates }
        }
      };
    });
  },
  
  // Remove execution
  removeExecution: (id: string) => {
    set(state => {
      const { [id]: removed, ...rest } = state.currentExecutions;
      return { currentExecutions: rest };
    });
  },
  
  // Create custom tool
  createCustomTool: async (tool: Omit<CustomTool, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ isLoading: true, error: null });
    
    try {
      // Validate command
      if (!toolsService.validateCommand(tool.command)) {
        throw new Error(i18nService.getMessage('errorInvalidCommandFormat'));
      }
      
      // Check uniqueness
      const isUnique = await toolsService.isCommandUnique(tool.command);
      if (!isUnique) {
        throw new Error(i18nService.getMessage('errorCommandExists').replace('{command}', tool.command));
      }
      
      const newTool = await toolsService.createCustomTool(tool);
      
      set(state => ({
        customTools: [newTool, ...state.customTools],
        isLoading: false
      }));
      
      // Reload all tools
      await get().loadTools();
      
    } catch (error) {
      console.error('Error creating custom tool:', error);
      set({ 
        error: error instanceof Error ? error.message : i18nService.getMessage('errorCreatingCustomTool'),
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update custom tool
  updateCustomTool: async (id: string, updates: Partial<CustomTool>) => {
    set({ isLoading: true, error: null });
    
    try {
      // If updating command, validate it
      if (updates.command) {
        if (!toolsService.validateCommand(updates.command)) {
          throw new Error(i18nService.getMessage('errorInvalidCommandFormat'));
        }
        
        const isUnique = await toolsService.isCommandUnique(updates.command, id);
        if (!isUnique) {
          throw new Error(i18nService.getMessage('errorCommandExists').replace('{command}', updates.command));
        }
      }
      
      await toolsService.updateCustomTool(id, updates);
      
      set(state => ({
        customTools: state.customTools.map(tool => 
          tool.id === id ? { ...tool, ...updates, updatedAt: Date.now() } : tool
        ),
        isLoading: false
      }));
      
      // Reload all tools
      await get().loadTools();
      
    } catch (error) {
      console.error('Error updating custom tool:', error);
      set({ 
        error: error instanceof Error ? error.message : i18nService.getMessage('errorUpdatingCustomTool'),
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Delete custom tool
  deleteCustomTool: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await toolsService.deleteCustomTool(id);
      
      set(state => ({
        customTools: state.customTools.filter(tool => tool.id !== id),
        isLoading: false
      }));
      
      // Reload all tools
      await get().loadTools();
      
    } catch (error) {
      console.error('Error deleting custom tool:', error);
      set({ 
        error: error instanceof Error ? error.message : i18nService.getMessage('errorDeletingCustomTool'),
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Set current URL for filtering
  setCurrentUrl: (url: string | null) => {
    set({ currentUrl: url });
  },
  
  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

