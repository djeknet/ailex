import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ailex_favorite_models';

interface FavoriteModel {
  operator: string;
  model: string;
}

export function useFavoriteModels() {
  const [favorites, setFavorites] = useState<FavoriteModel[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFavorites(parsed);
      } catch (error) {
        console.error('[useFavoriteModels] Error parsing favorites:', error);
      }
    }
  }, []);

  // Save favorites to localStorage whenever they change
  const saveFavorites = (newFavorites: FavoriteModel[]) => {
    setFavorites(newFavorites);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
  };

  // Check if a model is favorited
  const isFavorite = (operator: string, model: string): boolean => {
    return favorites.some(f => f.operator === operator && f.model === model);
  };

  // Toggle favorite status
  const toggleFavorite = (operator: string, model: string) => {
    const isCurrentlyFavorite = isFavorite(operator, model);
    
    if (isCurrentlyFavorite) {
      // Remove from favorites
      const updated = favorites.filter(f => !(f.operator === operator && f.model === model));
      saveFavorites(updated);
    } else {
      // Add to favorites
      const updated = [...favorites, { operator, model }];
      saveFavorites(updated);
    }
  };

  return {
    favorites,
    isFavorite,
    toggleFavorite
  };
}








