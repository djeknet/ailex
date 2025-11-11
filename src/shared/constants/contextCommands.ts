import type { ContextCommand, ContextCommandCategory } from '@shared/types/contextCommands';

// Команды анализа
const analysisCommands: ContextCommand[] = [
  {
    id: 'check_facts',
    category: 'analysis',
    titleKey: 'contextMenu_checkFacts',
    descriptionKey: 'contextMenu_checkFacts_desc',
    promptKey: 'contextMenu_checkFacts_prompt',
    requires: ['web_search'],
    flags: { useWebSearch: true }
  },
  {
    id: 'explain_text',
    category: 'analysis',
    titleKey: 'contextMenu_explainText',
    descriptionKey: 'contextMenu_explainText_desc',
    promptKey: 'contextMenu_explainText_prompt',
    flags: {}
  },
  {
    id: 'find_context',
    category: 'analysis',
    titleKey: 'contextMenu_findContext',
    descriptionKey: 'contextMenu_findContext_desc',
    promptKey: 'contextMenu_findContext_prompt',
    requires: ['web_search'],
    flags: { useWebSearch: true }
  },
  {
    id: 'analyze_tone',
    category: 'analysis',
    titleKey: 'contextMenu_analyzeTone',
    descriptionKey: 'contextMenu_analyzeTone_desc',
    promptKey: 'contextMenu_analyzeTone_prompt',
    flags: {}
  },
  {
    id: 'check_plagiarism',
    category: 'analysis',
    titleKey: 'contextMenu_checkPlagiarism',
    descriptionKey: 'contextMenu_checkPlagiarism_desc',
    promptKey: 'contextMenu_checkPlagiarism_prompt',
    requires: ['web_search'],
    flags: { useWebSearch: true }
  }
];

// Команды редактирования
const editingCommands: ContextCommand[] = [
  {
    id: 'rewrite_text',
    category: 'editing',
    titleKey: 'contextMenu_rewriteText',
    descriptionKey: 'contextMenu_rewriteText_desc',
    promptKey: 'contextMenu_rewriteText_prompt',
    flags: {}
  },
  {
    id: 'simplify_text',
    category: 'editing',
    titleKey: 'contextMenu_simplifyText',
    descriptionKey: 'contextMenu_simplifyText_desc',
    promptKey: 'contextMenu_simplifyText_prompt',
    flags: { level: 'beginner' }
  },
  {
    id: 'improve_persuasion',
    category: 'editing',
    titleKey: 'contextMenu_improvePersuasion',
    descriptionKey: 'contextMenu_improvePersuasion_desc',
    promptKey: 'contextMenu_improvePersuasion_prompt',
    flags: {}
  },
  {
    id: 'fix_errors',
    category: 'editing',
    titleKey: 'contextMenu_fixErrors',
    descriptionKey: 'contextMenu_fixErrors_desc',
    promptKey: 'contextMenu_fixErrors_prompt',
    flags: {}
  },
  {
    id: 'summarize_text',
    category: 'editing',
    titleKey: 'contextMenu_summarizeText',
    descriptionKey: 'contextMenu_summarizeText_desc',
    promptKey: 'contextMenu_summarizeText_prompt',
    flags: {}
  },
  {
    id: 'expand_text',
    category: 'editing',
    titleKey: 'contextMenu_expandText',
    descriptionKey: 'contextMenu_expandText_desc',
    promptKey: 'contextMenu_expandText_prompt',
    flags: { expandFactor: 2 }
  }
];

// Команды исследования
const researchCommands: ContextCommand[] = [
  {
    id: 'find_similar',
    category: 'research',
    titleKey: 'contextMenu_findSimilar',
    descriptionKey: 'contextMenu_findSimilar_desc',
    promptKey: 'contextMenu_findSimilar_prompt',
    requires: ['web_search'],
    flags: { useWebSearch: true }
  },
  {
    id: 'check_relevance',
    category: 'research',
    titleKey: 'contextMenu_checkRelevance',
    descriptionKey: 'contextMenu_checkRelevance_desc',
    promptKey: 'contextMenu_checkRelevance_prompt',
    requires: ['web_search'],
    flags: { useWebSearch: true }
  },
  {
    id: 'update_stats',
    category: 'research',
    titleKey: 'contextMenu_updateStats',
    descriptionKey: 'contextMenu_updateStats_desc',
    promptKey: 'contextMenu_updateStats_prompt',
    requires: ['web_search'],
    flags: { useWebSearch: true }
  }
];

// Команды образования
const educationCommands: ContextCommand[] = [
  {
    id: 'make_outline',
    category: 'education',
    titleKey: 'contextMenu_makeOutline',
    descriptionKey: 'contextMenu_makeOutline_desc',
    promptKey: 'contextMenu_makeOutline_prompt',
    flags: {}
  },
  {
    id: 'generate_questions',
    category: 'education',
    titleKey: 'contextMenu_generateQuestions',
    descriptionKey: 'contextMenu_generateQuestions_desc',
    promptKey: 'contextMenu_generateQuestions_prompt',
    flags: {}
  },
  {
    id: 'explain_as_teacher',
    category: 'education',
    titleKey: 'contextMenu_explainAsTeacher',
    descriptionKey: 'contextMenu_explainAsTeacher_desc',
    promptKey: 'contextMenu_explainAsTeacher_prompt',
    flags: { role: 'teacher' }
  },
  {
    id: 'make_flashcards',
    category: 'education',
    titleKey: 'contextMenu_makeFlashcards',
    descriptionKey: 'contextMenu_makeFlashcards_desc',
    promptKey: 'contextMenu_makeFlashcards_prompt',
    flags: { returnJSON: true }
  }
];

// Команды перевода
const translationCommands: ContextCommand[] = [
  {
    id: 'translate_text',
    category: 'translation',
    titleKey: 'contextMenu_translateText',
    descriptionKey: 'contextMenu_translateText_desc',
    promptKey: 'contextMenu_translateText_prompt',
    flags: { targetLang: 'auto' }
  }
];

// Комбинированные команды
const combinedCommands: ContextCommand[] = [
  {
    id: 'compare_versions',
    category: 'combined',
    titleKey: 'contextMenu_compareVersions',
    descriptionKey: 'contextMenu_compareVersions_desc',
    promptKey: 'contextMenu_compareVersions_prompt',
    requires: ['web_search'],
    flags: { useWebSearch: true }
  },
  {
    id: 'continue_text',
    category: 'combined',
    titleKey: 'contextMenu_continueText',
    descriptionKey: 'contextMenu_continueText_desc',
    promptKey: 'contextMenu_continueText_prompt',
    flags: { autoContinue: true }
  },
  {
    id: 'find_quote_source',
    category: 'combined',
    titleKey: 'contextMenu_findQuoteSource',
    descriptionKey: 'contextMenu_findQuoteSource_desc',
    promptKey: 'contextMenu_findQuoteSource_prompt',
    requires: ['web_search'],
    flags: { useWebSearch: true }
  }
];

// Категории команд
export const contextCommandCategories: ContextCommandCategory[] = [
  {
    id: 'analysis',
    titleKey: 'contextMenu_category_analysis',
    commands: analysisCommands
  },
  {
    id: 'editing',
    titleKey: 'contextMenu_category_editing',
    commands: editingCommands
  },
  {
    id: 'research',
    titleKey: 'contextMenu_category_research',
    commands: researchCommands
  },
  {
    id: 'education',
    titleKey: 'contextMenu_category_education',
    commands: educationCommands
  },
  {
    id: 'translation',
    titleKey: 'contextMenu_category_translation',
    commands: translationCommands
  },
  {
    id: 'combined',
    titleKey: 'contextMenu_category_combined',
    commands: combinedCommands
  }
];

// Все команды в виде плоского списка для быстрого поиска
export const allContextCommands: ContextCommand[] = [
  ...analysisCommands,
  ...editingCommands,
  ...researchCommands,
  ...educationCommands,
  ...translationCommands,
  ...combinedCommands
];

// Получить команду по ID
export function getContextCommand(id: string): ContextCommand | undefined {
  return allContextCommands.find(cmd => cmd.id === id);
}

