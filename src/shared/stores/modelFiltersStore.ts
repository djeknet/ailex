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
      console.log('[modelFiltersStore] 📂 Loaded filters from localStorage:', initialFilters);
    }
  } catch (error) {
    console.error('[modelFiltersStore] Error loading filters:', error);
  }

  return {
    filters: initialFilters,

    updateFilters: (updates: Partial<ModelFilters>) => {
      const currentFilters = get().filters;
      console.log('[modelFiltersStore] 🔄 Updating filters with:', updates);
      console.log('[modelFiltersStore] 📋 Current filters:', currentFilters);
      
      const newFilters = { ...currentFilters, ...updates };
      console.log('[modelFiltersStore] ✨ New filters:', newFilters);
      
      set({ filters: newFilters });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
      console.log('[modelFiltersStore] 💾 Saved to localStorage');
    },

    resetFilters: () => {
      const currentFilters = get().filters;
      console.log('[modelFiltersStore] 🔄 RESET filters to default:', DEFAULT_FILTERS);
      console.log('[modelFiltersStore] 📋 Current filters before reset:', currentFilters);
      
      set({ filters: DEFAULT_FILTERS });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FILTERS));
      console.log('[modelFiltersStore] 💾 Reset saved to localStorage');
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
      console.log('[modelFiltersStore] 🔍 hasActiveFilters called, result:', isActive, 'filters:', filters);
      return isActive;
    },

    matchesFilters: (model: any, operator: AIOperator): boolean => {
      const { filters } = get();
      const modelInfo = getModelInfo(model.id, operator);

      console.log(`[modelFiltersStore] 🔍 Checking model ${model.name} (${operator}) against filters:`, filters);

      // Check context length
      const contextLength = modelInfo?.context_length || model.context_length || 0;
      if (filters.minContext !== null && contextLength > 0 && contextLength < filters.minContext) {
        console.log(`[modelFiltersStore] ❌ ${model.name}: Context too small:`, contextLength, '<', filters.minContext);
        return false;
      }

      // Check input modalities - model should have ALL selected modalities
      if (filters.inputModalities.length > 0) {
        const modelInputModalities = modelInfo?.architecture?.input_modalities || [];
        
        const hasAllInputs = filters.inputModalities.every(modality =>
          modelInputModalities.includes(modality)
        );
        
        if (!hasAllInputs) {
          console.log(`[modelFiltersStore] ❌ ${model.name}: Missing required input modalities. Required:`, filters.inputModalities, 'Has:', modelInputModalities);
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
          console.log(`[modelFiltersStore] ❌ ${model.name}: Missing required output modalities. Required:`, filters.outputModalities, 'Has:', modelOutputModalities);
          return false;
        }
      }

      // Check operator
      if (filters.operators.length > 0 && !filters.operators.includes(operator)) {
        console.log(`[modelFiltersStore] ❌ ${model.name}: Operator not in filter list. Required:`, filters.operators, 'Has:', operator);
        return false;
      }

      console.log(`[modelFiltersStore] ✅ ${model.name}: Matches all filters`);
      return true;
    }
  };
});

