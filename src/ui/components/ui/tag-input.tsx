import { useState, KeyboardEvent } from 'react';
import { Badge } from '@/ui/components/ui/badge';
import { Input } from '@/ui/components/ui/input';
import { X, CornerDownLeft } from 'lucide-react';
import { cn } from '@shared/utils/cn';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TagInput({ tags, onChange, placeholder, disabled, className }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      
      // Avoid duplicates
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag on backspace when input is empty
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={cn("flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[42px] relative", className)}>
      {tags.map((tag, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="gap-1 pr-1 h-6"
        >
          <span className="text-xs">{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(tag)}
            disabled={disabled}
            className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
      />
      <div className="flex items-center pr-1">
        <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
    </div>
  );
}

