import type { Flashcard } from '@shared/types/flashcard';

/**
 * Парсит текст и пытается извлечь флеш-карточки в формате JSON
 * @param text - текст для парсинга
 * @returns массив флеш-карточек или null, если парсинг не удался
 */
export function parseFlashcards(text: string): Flashcard[] | null {
  const trimmed = text.trim();
  
  // Проверяем, что текст похож на JSON массив
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(trimmed);
    
    // Проверяем, что это массив
    if (!Array.isArray(parsed)) {
      return null;
    }
    
    // Проверяем, что все элементы имеют структуру флеш-карточки
    const isValid = parsed.every(item => 
      item && 
      typeof item === 'object' && 
      'term' in item && 
      'definition' in item &&
      typeof item.term === 'string' &&
      typeof item.definition === 'string'
    );
    
    if (!isValid) {
      return null;
    }
    
    return parsed as Flashcard[];
  } catch (error) {
    // JSON парсинг не удался
    return null;
  }
}



