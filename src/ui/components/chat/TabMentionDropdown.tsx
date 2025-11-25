import { useEffect, useState } from 'react';
import * as React from 'react';
import { TabReference } from '@shared/types/extension';
import { cn } from '@shared/utils/cn';
import { isSystemPage } from '@shared/utils/pageUtils';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Check } from 'lucide-react';
import { Checkbox } from '@/ui/components/ui/checkbox';
import { Button } from '@/ui/components/ui/button';

interface TabMentionDropdownProps {
  text: string; // Текст из input
  onSelect: (tabs: TabReference[]) => void; // Callback при выборе
  visible: boolean; // Показывать ли dropdown
  maxTabs?: number; // Максимальное количество вкладок (default: 5)
}

const MAX_TABS_DEFAULT = 5;

// Helper to truncate title
const truncateTitle = (title: string, maxLength: number = 40): string => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};

// Helper to extract domain from URL
const getDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
};

export default function TabMentionDropdown({
  text,
  onSelect,
  visible,
  maxTabs = MAX_TABS_DEFAULT
}: TabMentionDropdownProps) {
  const { t } = useTranslation();
  const [allTabs, setAllTabs] = useState<TabReference[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [activeDomain, setActiveDomain] = useState<string>('');

  // Extract search query from text after "@"
  const getSearchQuery = () => {
    const atIndex = text.lastIndexOf('@');
    if (atIndex === -1) return '';
    return text.substring(atIndex + 1).toLowerCase().trim();
  };

  // Filter tabs based on search query
  const availableTabs = React.useMemo(() => {
    const query = getSearchQuery();
    let tabs = query 
      ? allTabs.filter(tab => 
          tab.title.toLowerCase().includes(query) || 
          tab.url.toLowerCase().includes(query)
        )
      : allTabs;
    
    // Sort: same domain first, then others
    if (activeDomain) {
      tabs = [...tabs].sort((a, b) => {
        const aDomain = getDomain(a.url);
        const bDomain = getDomain(b.url);
        const aIsSameDomain = aDomain === activeDomain;
        const bIsSameDomain = bDomain === activeDomain;
        
        if (aIsSameDomain && !bIsSameDomain) return -1;
        if (!aIsSameDomain && bIsSameDomain) return 1;
        return 0;
      });
    }
    
    return tabs;
  }, [allTabs, text, activeDomain]);

  // Load available tabs
  useEffect(() => {
    if (!visible || !text.includes('@')) {
      setAllTabs([]);
      setSelectedTabs(new Set());
      setActiveDomain('');
      return;
    }

    const loadTabs = async () => {
      try {
        // Get current active tab to exclude it
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTabId = currentTab?.id;
        const currentDomain = currentTab?.url ? getDomain(currentTab.url) : '';
        
        // Get all tabs in current window
        const tabs = await chrome.tabs.query({ currentWindow: true });
        
        // Filter out system pages, tabs without URL, and current active tab
        const filtered = tabs
          .filter(tab => 
            tab.url && 
            !isSystemPage(tab.url) && 
            tab.id && 
            tab.id !== currentTabId // Exclude current tab
          )
          .map(tab => ({
            id: tab.id!,
            title: tab.title || tab.url || 'Unknown',
            url: tab.url!,
            favicon: tab.favIconUrl
          }));
        
        setAllTabs(filtered);
        setActiveDomain(currentDomain);
        setHighlightedIndex(0);
      } catch (error) {
        console.error('[TabMentionDropdown] Error loading tabs:', error);
      }
    };

    loadTabs();
  }, [visible]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible || availableTabs.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => (prev + 1) % availableTabs.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => (prev - 1 + availableTabs.length) % availableTabs.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          // Submit selected tabs with confirmation
          const tabs = availableTabs.filter(tab => selectedTabs.has(tab.id));
          if (tabs.length > 0) {
            onSelect(tabs);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onSelect([]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, availableTabs, selectedTabs, highlightedIndex, onSelect]);

  // Toggle tab selection
  const toggleTab = (tabId: number) => {
    setSelectedTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabId)) {
        newSet.delete(tabId);
      } else {
        // Check max tabs limit
        if (newSet.size >= maxTabs) {
          return prev; // Don't add if limit reached
        }
        newSet.add(tabId);
      }
      return newSet;
    });
  };

  // Select all tabs (respecting max limit)
  const selectAll = () => {
    const allIds = availableTabs.slice(0, maxTabs).map(tab => tab.id);
    setSelectedTabs(new Set(allIds));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedTabs(new Set());
  };

  if (!visible || availableTabs.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg max-h-80 overflow-hidden z-50 flex flex-col">
      {/* Fixed header */}
      <div className="p-2 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t('selectTabs')}
          </span>
          {selectedTabs.size > 0 && (
            <span className="text-xs text-primary font-medium">
              {t('tabsSelected').replace('{count}', selectedTabs.size.toString())}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {selectedTabs.size === 0 ? (
            <button
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              {t('selectAll')}
            </button>
          ) : (
            <button
              onClick={deselectAll}
              className="text-xs text-muted-foreground hover:underline"
            >
              {t('deselectAll')}
            </button>
          )}
        </div>
      </div>
      
      {/* Scrollable tabs list */}
      <div className="overflow-y-auto flex-1">
        {availableTabs.map((tab, index) => {
          const isSelected = selectedTabs.has(tab.id);
          const isHighlighted = index === highlightedIndex;
          const isDisabled = !isSelected && selectedTabs.size >= maxTabs;
          
          return (
            <div
              key={tab.id}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer',
                isHighlighted && 'bg-accent',
                !isHighlighted && 'hover:bg-accent',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={(e) => {
                // Only toggle if clicked outside checkbox
                if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                  if (!isDisabled) toggleTab(tab.id);
                }
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => !isDisabled && toggleTab(tab.id)}
                disabled={isDisabled}
                className="flex-shrink-0"
              />
              
              {tab.favicon ? (
                <img 
                  src={tab.favicon} 
                  alt="" 
                  className="w-4 h-4 flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-4 h-4 flex-shrink-0 bg-muted rounded" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {truncateTitle(tab.title)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {tab.url}
                </p>
              </div>
              
              {isSelected && (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Fixed footer */}
      <div className="p-2 border-t flex items-center justify-between flex-shrink-0 gap-2">
        <span className="text-xs text-muted-foreground">
          {t('tabsNavigation')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t('tabsMaxLimit').replace('{max}', maxTabs.toString())}
          </span>
          <Button
            size="sm"
            onClick={() => {
              const tabs = availableTabs.filter(tab => selectedTabs.has(tab.id));
              onSelect(tabs);
            }}
            disabled={selectedTabs.size === 0}
            className="h-7"
          >
            {t('confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}

