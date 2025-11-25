/**
 * Utility functions for working with web pages
 */

/**
 * Check if a URL is a system/browser page that cannot be accessed by extensions
 * 
 * @param url - The URL to check
 * @returns true if the URL is a system page
 */
export function isSystemPage(url: string): boolean {
  if (!url) return true;
  
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:') ||
    url.startsWith('data:') ||
    url.startsWith('file://') ||
    url === 'about:blank'
  );
}

/**
 * Check if a tab is accessible for content script injection
 * 
 * @param tab - Chrome tab object
 * @returns true if the tab is accessible
 */
export function isTabAccessible(tab: chrome.tabs.Tab | undefined): boolean {
  if (!tab || !tab.url) return false;
  return !isSystemPage(tab.url);
}

