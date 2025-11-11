import { ExternalLink } from 'lucide-react';

interface PageContextBadgeProps {
  pageTitle?: string;
  pageIcon?: string;
  pageUrl?: string;
}

export default function PageContextBadge({ pageTitle, pageIcon, pageUrl }: PageContextBadgeProps) {
  if (!pageTitle || !pageUrl) {
    return null;
  }

  const handleClick = async () => {
    try {
      // Open page in current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.update(tab.id, { url: pageUrl });
      }
    } catch (error) {
      console.error('[PageContextBadge] Error opening page:', error);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-3 mb-2 bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors text-sm text-foreground"
      style={{ paddingTop: '5px', paddingBottom: '5px' }}
      title={pageUrl}
    >
      {pageIcon ? (
        <img src={pageIcon} alt="" className="w-4 h-4" />
      ) : (
        <ExternalLink className="w-4 h-4" />
      )}
      <span className="font-medium">{pageTitle}</span>
      <ExternalLink className="w-3 h-3 opacity-50" />
    </button>
  );
}

