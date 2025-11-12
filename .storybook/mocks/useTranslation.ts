// Mock implementation of useTranslation for Storybook
export const useTranslation = () => {
  const t = (key: string): string => {
    const translations: Record<string, string> = {
      'sources': 'Источники',
      'copy': 'Копировать',
      'copied': 'Скопировано',
      'rewrite': 'Переписать',
      'rewriteAnswer': 'Переписать ответ',
      'makeLonger': 'Сделать длиннее',
      'makeShorter': 'Сделать короче',
      'improveWriting': 'Улучшить текст',
      'fixSpelling': 'Исправить ошибки',
      'changeTone': 'Изменить тон',
      'simplifyLanguage': 'Упростить язык',
      'rephrase': 'Перефразировать',
      'translateTo': 'Перевести на',
      'compareModels': 'Сравнить модели',
      'toneProfessional': 'Профессиональный',
      'toneFriendly': 'Дружелюбный',
      'toneDirect': 'Прямой',
      'toneConfident': 'Уверенный',
      'toneCasual': 'Неформальный',
      'unknownModel': 'Неизвестная модель',
    };
    return translations[key] || key;
  };

  return {
    t,
    language: 'ru' as const,
  };
};





