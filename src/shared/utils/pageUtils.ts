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

/**
 * Check if the current page is a PDF document
 * 
 * @param url - The URL to check
 * @param mimeType - Optional MIME type from tab
 * @returns true if the page is a PDF
 */
export function isPdfPage(url?: string, mimeType?: string): boolean {
  if (!url) return false;
  
  // Check MIME type if provided
  if (mimeType === 'application/pdf') return true;
  
  // Check URL extension
  const urlLower = url.toLowerCase();
  if (urlLower.endsWith('.pdf')) return true;
  
  // Check if it's a PDF viewer URL pattern
  if (urlLower.includes('.pdf?') || urlLower.includes('.pdf#')) return true;
  
  return false;
}

/**
 * Get PDF URL from the current page (for embedded PDFs)
 * 
 * @returns PDF URL if found, null otherwise
 */
export function getPdfUrlFromPage(): string | null {
  // This function should be called from content script context
  if (typeof document === 'undefined') return null;
  
  // Check for embed tag
  const embed = document.querySelector('embed[type="application/pdf"]') as HTMLEmbedElement;
  if (embed?.src) return embed.src;
  
  // Check for object tag
  const object = document.querySelector('object[type="application/pdf"]') as HTMLObjectElement;
  if (object?.data) return object.data;
  
  // Check for iframe with PDF
  const iframe = document.querySelector('iframe[src*=".pdf"]') as HTMLIFrameElement;
  if (iframe?.src) return iframe.src;
  
  // Return current URL if it looks like a PDF
  if (window.location.href.toLowerCase().includes('.pdf')) {
    return window.location.href;
  }
  
  return null;
}

/**
 * Extract filename from URL
 * 
 * @param url - The URL to extract filename from
 * @returns Filename or null
 */
export function extractFilenameFromUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    // Remove query parameters and hash
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Extract filename from path
    const parts = cleanUrl.split('/');
    const filename = parts[parts.length - 1];
    
    // Decode URL encoding
    const decoded = decodeURIComponent(filename);
    
    // Return only if it's not empty and looks like a filename
    if (decoded && decoded.length > 0 && decoded !== '/') {
      return decoded;
    }
  } catch (error) {
    console.error('[pageUtils] Error extracting filename:', error);
  }
  
  return null;
}


