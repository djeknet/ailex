import { create } from 'zustand';
import type { AIOperator } from '@shared/types/ai';
import { getModelInfo, getContextRange } from '@shared/constants';

const STORAGE_KEY = 'ailex_model_filters';

export interface ModelFilters {
  minContext: number | null;
  inputModalities: string[];
  outputModalities: string[];
  operators: AIOperator[];
}

const DEFAULT_FILTERS: ModelFilters = {
  minContext: null,
  inputModalities: [],
  outputModalities: [],
  operators: []
};

interface ModelFiltersState {
  filters: ModelFilters;
  updateFilters: (updates: Partial<ModelFilters>) => void;
  resetFilters: () => void;
  hasActiveFilters: () => boolean;
  matchesFilters: (model: any, operator: AIOperator) => boolean;
}

export const useModelFiltersStore = create<ModelFiltersState>((set, get) => {
  // Load initial state from localStorage
  let initialFilters = DEFAULT_FILTERS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      initialFilters = JSON.parse(stored);
    }
  } catch (error) {
  }

  return {
    filters: initialFilters,

    updateFilters: (updates: Partial<ModelFilters>) => {
      const currentFilters = get().filters;
      
      const newFilters = { ...currentFilters, ...updates };
      set({ filters: newFilters });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
    },

    resetFilters: () => {
      set({ filters: DEFAULT_FILTERS });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FILTERS));
    },

    hasActiveFilters: () => {
      const { filters } = get();
      const { min: minContext } = getContextRange();
      const isActive = (
        (filters.minContext !== null && filters.minContext > minContext) ||
        filters.inputModalities.length > 0 ||
        filters.outputModalities.length > 0 ||
        filters.operators.length > 0
      );
      return isActive;
    },

    matchesFilters: (model: any, operator: AIOperator): boolean => {
      const { filters } = get();
      const modelInfo = getModelInfo(model.id, operator);

      // Check context length
      const contextLength = modelInfo?.context_length || model.context_length || 0;
      if (filters.minContext !== null && contextLength > 0 && contextLength < filters.minContext) {
        return false;
      }

      // Check input modalities - model should have ALL selected modalities
      if (filters.inputModalities.length > 0) {
        const modelInputModalities = modelInfo?.architecture?.input_modalities || [];
        
        const hasAllInputs = filters.inputModalities.every(modality =>
          modelInputModalities.includes(modality)
        );
        
        if (!hasAllInputs) {
          return false;
        }
      }

      // Check output modalities - model should have ALL selected modalities
      if (filters.outputModalities.length > 0) {
        const modelOutputModalities = modelInfo?.architecture?.output_modalities || [];
        
        const hasAllOutputs = filters.outputModalities.every(modality =>
          modelOutputModalities.includes(modality)
        );
        
        if (!hasAllOutputs) {
          return false;
        }
      }

      // Check operator
      if (filters.operators.length > 0 && !filters.operators.includes(operator)) {
        return false;
      }
      return true;
    }
  };
});


