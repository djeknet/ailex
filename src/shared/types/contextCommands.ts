export interface ContextCommand {
  id: string;
  category: string;
  titleKey: string;        // ключ локализации для названия
  descriptionKey: string;  // ключ локализации для описания
  promptKey: string;       // ключ локализации для промпта
  requires?: string[];     // ['web_search'] - требуемые функции
  flags?: Record<string, any>; // дополнительные флаги
}

export interface ContextCommandCategory {
  id: string;
  titleKey: string;
  commands: ContextCommand[];
}

