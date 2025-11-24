import { useState, useEffect, useCallback } from 'react';
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

export function useModelFilters() {
  const [filters, setFilters] = useState<ModelFilters>(DEFAULT_FILTERS);

  // Load filters from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFilters(parsed);
      } catch (error) {
        console.error('[useModelFilters] Error parsing filters:', error);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  const saveFilters = (newFilters: ModelFilters) => {
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
  };

  // Update specific filter fields
  const updateFilters = (updates: Partial<ModelFilters>) => {
    const newFilters = { ...filters, ...updates };
    saveFilters(newFilters);
  };

  // Reset filters to default
  const resetFilters = () => {
    saveFilters(DEFAULT_FILTERS);
  };

  // Check if filters are active (not default)
  const hasActiveFilters = () => {
    const { min: minContext } = getContextRange();
    return (
      (filters.minContext !== null && filters.minContext > minContext) ||
      filters.inputModalities.length > 0 ||
      filters.outputModalities.length > 0 ||
      filters.operators.length > 0
    );
  };

  // Apply filters to a model
  const matchesFilters = useCallback((model: any, operator: AIOperator): boolean => {
    // Get model info from database to have architecture details
    const modelInfo = getModelInfo(model.id, operator);


    // Check context length
    const contextLength = modelInfo?.context_length || model.context_length || 0;
    if (filters.minContext !== null && contextLength > 0 && contextLength < filters.minContext) {
      // console.log('[useModelFilters] ❌ Context too small:', contextLength, '<', filters.minContext);
      return false;
    }

    // Check input modalities - model should have ALL selected modalities
    if (filters.inputModalities.length > 0) {
      const modelInputModalities = modelInfo?.architecture?.input_modalities || [];
      
      const hasAllInputs = filters.inputModalities.every(modality =>
        modelInputModalities.includes(modality)
      );
      
      if (!hasAllInputs) {
        // console.log('[useModelFilters] ❌ Missing required input modalities');
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
        // console.log('[useModelFilters] ❌ Missing required output modalities');
        return false;
      }
    }

    // Check operator
    if (filters.operators.length > 0 && !filters.operators.includes(operator)) {
      // console.log('[useModelFilters] ❌ Operator not in filter list');
      return false;
    }

    // console.log('[useModelFilters] ✅ Model matches all filters');
    return true;
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    matchesFilters
  };
}

