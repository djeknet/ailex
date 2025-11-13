import { useEffect, useState } from 'react';
import { Tool } from '@shared/types/tools';
import { cn } from '@shared/utils/cn';
import { useTranslation } from '@shared/i18n/useTranslation';

interface ToolsCommandDropdownProps {
  text: string; // Текст з input
  tools: Tool[]; // Доступные инструменты
  onSelect: (tool: Tool) => void; // Callback при выборе
  visible: boolean; // Или отображать dropdown
}

export default function ToolsCommandDropdown({
  text,
  tools,
  onSelect,
  visible
}: ToolsCommandDropdownProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filtered, setFiltered] = useState<Tool[]>([]);

  // Фильтрация инструментов по команде
  useEffect(() => {
    if (!visible || !text.startsWith('/')) {
      setFiltered([]);
      return;
    }

    const query = text.slice(1).toLowerCase();
    
    // Если текст точно совпадает с командой (например "/summarize"), не показываем dropdown
    const isExactMatch = tools.some(tool => tool.command.toLowerCase() === text.toLowerCase());
    if (isExactMatch) {
      setFiltered([]);
      return;
    }
    
    const matches = tools.filter(tool => {
      if (tool.hiddenFromUI) return false;
      
      const commandMatch = tool.command.slice(1).toLowerCase().startsWith(query);
      const nameMatch = tool.name.toLowerCase().includes(query);
      
      return commandMatch || nameMatch;
    });

    setFiltered(matches);
    setSelectedIndex(0);
  }, [text, tools, visible]);

  // Обработка клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible || filtered.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filtered.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
          break;
        case 'Enter':
        case 'Tab':
          if (filtered[selectedIndex]) {
            e.preventDefault();
            onSelect(filtered[selectedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, filtered, selectedIndex, onSelect]);

  if (!visible || filtered.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg max-h-64 overflow-hidden z-50 flex flex-col">
      {/* Fixed header */}
      <div className="p-2 text-xs text-muted-foreground border-b flex-shrink-0">
        {t('availableTools')}
      </div>
      
      {/* Scrollable tools list */}
      <div className="overflow-y-auto flex-1">
        {filtered.map((tool, index) => {
          // Используем локализованные значения, если есть ключи
          const toolName = tool.nameKey ? t(tool.nameKey) : tool.name;
          const toolDescription = tool.descriptionKey ? t(tool.descriptionKey) : tool.description;
          
          return (
            <button
              key={tool.id}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
              onClick={() => onSelect(tool)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="text-2xl">{tool.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-primary">{tool.command}</span>
                  <span className="font-medium truncate">{toolName}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{toolDescription}</p>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Fixed footer */}
      <div className="p-2 text-xs text-muted-foreground border-t flex items-center justify-between flex-shrink-0">
        <span>{t('toolsNavigation')}</span>
        <span>{t('toolsSelect')}</span>
      </div>
    </div>
  );
}

