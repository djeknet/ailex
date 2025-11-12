import { useEffect, useState } from 'react';
import { Tool } from '@shared/types/tools';
import { cn } from '@/lib/utils';

interface ToolsCommandDropdownProps {
  text: string; // Текст з input
  tools: Tool[]; // Доступні інструменти
  onSelect: (tool: Tool) => void; // Callback при виборі
  visible: boolean; // Чи відображати dropdown
}

export default function ToolsCommandDropdown({
  text,
  tools,
  onSelect,
  visible
}: ToolsCommandDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filtered, setFiltered] = useState<Tool[]>([]);

  // Фільтрація інструментів по команді
  useEffect(() => {
    if (!visible || !text.startsWith('/')) {
      setFiltered([]);
      return;
    }

    const query = text.slice(1).toLowerCase(); // Видалити "/"
    const matches = tools.filter(tool =>
      tool.command.toLowerCase().includes(`/${query}`) ||
      tool.name.toLowerCase().includes(query)
    );

    setFiltered(matches);
    setSelectedIndex(0);
  }, [text, tools, visible]);

  // Обробка клавіш
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
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
      <div className="p-2 text-xs text-muted-foreground border-b">
        Доступні інструменти
      </div>
      {filtered.map((tool, index) => (
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
              <span className="font-medium truncate">{tool.name}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
          </div>
        </button>
      ))}
      <div className="p-2 text-xs text-muted-foreground border-t flex items-center justify-between">
        <span>↑↓ Навігація</span>
        <span>Enter/Tab Вибрати</span>
      </div>
    </div>
  );
}

