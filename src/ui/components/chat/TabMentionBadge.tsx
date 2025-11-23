import { ExternalLink, X } from 'lucide-react';
import { Badge } from '@/ui/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';
import { useTranslation } from '@shared/i18n/useTranslation';
import { TabReference } from '@shared/types/extension';

interface TabMentionBadgeProps {
  tab: TabReference;
  onRemove?: () => void;
  readonly?: boolean;
}

// Helper to truncate title
const truncateTitle = (title: string, maxLength: number = 30): string => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};

export default function TabMentionBadge({ tab, onRemove, readonly = false }: TabMentionBadgeProps) {
  const { t } = useTranslation();
  const isInteractive = !readonly && onRemove;
  
  console.log('[TabMentionBadge] Rendering with tab:', { 
    title: tab.title, 
    url: tab.url, 
    favicon: tab.favicon,
    readonly 
  });
  
  const handleBadgeClick = async (e: React.MouseEvent) => {
    console.log('[TabMentionBadge] Click detected on element:', e.target);
    
    // Check if clicking on X button
    const target = e.target as HTMLElement;
    const isClickingX = target.closest('.remove-button');
    
    if (isClickingX) {
      console.log('[TabMentionBadge] Clicking X button, ignoring badge click');
      return;
    }
    
    // Open URL
    if (tab.url) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[TabMentionBadge] Opening URL:', tab.url);
      try {
        await chrome.tabs.create({ url: tab.url, active: false });
        console.log('[TabMentionBadge] Tab opened successfully');
      } catch (error) {
        console.error('[TabMentionBadge] Error opening tab:', error);
      }
    } else {
      console.log('[TabMentionBadge] No URL to open');
    }
  };
  
  const handleRemoveClick = (e: React.MouseEvent) => {
    console.log('[TabMentionBadge] Remove button clicked');
    e.preventDefault();
    e.stopPropagation();
    onRemove?.();
  };
  
  // Render without Tooltip to avoid event blocking
  return (
    <Badge
      variant="secondary"
      className="inline-flex items-center gap-1 cursor-pointer bg-purple-500 text-white dark:bg-purple-600 hover:bg-purple-600 transition-all"
      onClick={handleBadgeClick}
      title={`${tab.title}\n${tab.url}`}
    >
      {tab.favicon ? (
        <img 
          src={tab.favicon} 
          alt="" 
          className="w-3 h-3"
          onError={(e) => {
            console.log('[TabMentionBadge] Favicon failed to load:', tab.favicon);
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            console.log('[TabMentionBadge] Favicon loaded successfully:', tab.favicon);
          }}
        />
      ) : (
        <ExternalLink className="h-3 w-3" />
      )}
      <span className="text-xs max-w-[150px] truncate">
        {truncateTitle(tab.title)}
      </span>
      {isInteractive && (
        <X 
          className="h-3 w-3 ml-1 hover:text-red-300 transition-colors remove-button" 
          onClick={handleRemoveClick}
        />
      )}
    </Badge>
  );
}

