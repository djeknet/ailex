import { Copy, Check } from 'lucide-react';
import { Response } from '@/components/ai-elements/response';
import { Button } from '@/ui/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/components/ui/popover';
import { useState } from 'react';

interface QuotedMessageProps {
  text: string;
  maxLength?: number;
}

export default function QuotedMessage({ text, maxLength = 100 }: QuotedMessageProps) {
  const [copied, setCopied] = useState(false);
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  const isTruncated = text.length > maxLength;

  const handleCopy = async () => {
    try {
      // Remove markdown formatting
      const plainText = text.replace(/[*_~`#]/g, '');
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isTruncated) {
    return (
      <div className="border-l-4 border-primary/50 pl-3 py-2 bg-muted/30 rounded-r text-sm text-muted-foreground italic">
        {text}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="border-l-4 border-primary/50 pl-3 py-2 bg-muted/30 rounded-r text-sm text-muted-foreground italic hover:bg-muted/50 transition-colors cursor-pointer text-left w-full">
          {truncatedText}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[500px] max-h-[400px] overflow-y-auto p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-border/80"
        align="start"
        side="top"
      >
        <div className="sticky top-0 bg-background border-b p-2 flex justify-end z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="p-4 text-sm">
          <Response>{text}</Response>
        </div>
      </PopoverContent>
    </Popover>
  );
}

