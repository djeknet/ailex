import { DEFAULT_DATA } from '@shared/constants';

export type PageContextType = 'text' | 'dom' | 'html';

export interface ExtractedContext {
  content: string;
  originalLength: number;
  truncated: boolean;
  estimatedTokens: number;
}

// Extract page context based on type with token limit
export function extractPageContext(type: PageContextType, maxTokens?: number): ExtractedContext {
  console.log('[PageContext] extractPageContext called:', { type, maxTokens });
  
  let rawContent = '';
  
  switch (type) {
    case 'text':
      rawContent = extractTextContent();
      break;
    case 'dom':
      rawContent = extractDOMContent();
      break;
    case 'html':
      rawContent = extractHTMLContent();
      break;
    default:
      rawContent = extractTextContent();
  }
  
  const originalLength = rawContent.length;
  const estimatedTokens = Math.ceil(originalLength / DEFAULT_DATA.CHARS_PER_TOKEN);
  
  console.log('[PageContext] Extraction complete:', {
    type,
    originalLength,
    estimatedTokens,
    maxTokens
  });
  
  // If no limit or content is within limit, return as is
  if (!maxTokens || estimatedTokens <= maxTokens) {
    return {
      content: rawContent,
      originalLength,
      truncated: false,
      estimatedTokens
    };
  }
  
  // Truncate to fit within token limit
  const maxChars = maxTokens * DEFAULT_DATA.CHARS_PER_TOKEN;
  const truncatedContent = rawContent.substring(0, maxChars) + 
    `\n\n[...Content truncated. Original length: ${originalLength} chars (~${estimatedTokens} tokens). Showing first ~${maxTokens} tokens.]`;
  
  console.log('[PageContext] Content truncated:', {
    originalLength,
    truncatedLength: truncatedContent.length,
    maxTokens
  });
  
  return {
    content: truncatedContent,
    originalLength,
    truncated: true,
    estimatedTokens
  };
}

// Extract only text content from body - with smart filtering
function extractTextContent(): string {
  const body = document.body;
  if (!body) return '';
  
  // Remove script, style, and other non-content elements
  const clone = body.cloneNode(true) as HTMLElement;
  const nonContentSelectors = 'script, style, noscript, nav, footer, header, aside, .ad, .advertisement, [role="navigation"], [role="banner"], [role="contentinfo"]';
  const nonContent = clone.querySelectorAll(nonContentSelectors);
  nonContent.forEach(el => el.remove());
  
  // Try to extract main content first
  const mainContent = clone.querySelector('main, article, [role="main"], .main-content, #content, #main');
  let rawText = '';
  
  if (mainContent) {
    rawText = (mainContent as HTMLElement).innerText || (mainContent as HTMLElement).textContent || '';
  } else {
    rawText = clone.innerText || clone.textContent || '';
  }
  
  // Clean up the text:
  // 1. Remove multiple consecutive blank lines (more than 2 newlines in a row)
  rawText = rawText.replace(/\n{3,}/g, '\n\n');
  
  // 2. Remove lines that contain only whitespace
  rawText = rawText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  // 3. Collapse multiple spaces into single space
  rawText = rawText.replace(/ {2,}/g, ' ');
  
  // 4. Remove excessive newlines again after trimming
  rawText = rawText.replace(/\n{2,}/g, '\n\n');
  
  return rawText.trim();
}

// Extract full DOM structure (simplified)
function extractDOMContent(): string {
  const body = document.body;
  if (!body) return '';
  
  // Clone body and clean up non-essential elements to reduce size
  const clone = body.cloneNode(true) as HTMLElement;
  
  // Remove scripts, styles, and other heavy elements
  const removeSelectors = 'script, style, noscript, svg, canvas, video, audio, iframe, embed, object, .ad, .advertisement';
  const elementsToRemove = clone.querySelectorAll(removeSelectors);
  elementsToRemove.forEach(el => el.remove());
  
  // Remove inline styles and event handlers to reduce size
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    el.removeAttribute('style');
    el.removeAttribute('onclick');
    el.removeAttribute('onload');
    // Remove data attributes that might be very large
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on') || attr.name.startsWith('data-')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  const result = clone.outerHTML;
  console.log('[PageContext] DOM extracted:', {
    originalSize: body.outerHTML.length,
    cleanedSize: result.length,
    reduction: `${Math.round((1 - result.length / body.outerHTML.length) * 100)}%`
  });
  
  return result;
}

// Extract source HTML
function extractHTMLContent(): string {
  return document.documentElement.outerHTML;
}

// Get page metadata
export function getPageMetadata() {
  const title = document.title;
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const url = window.location.href;
  const domain = window.location.hostname;
  const favicon = getFavicon();
  
  return {
    title,
    description,
    url,
    domain,
    favicon
  };
}

// Get site favicon
function getFavicon(): string {
  // Try various favicon sources
  let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (!favicon) {
    favicon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
  }
  
  if (favicon && favicon.href) {
    return favicon.href;
  }
  
  // Default favicon location
  return `${window.location.origin}/favicon.ico`;
}

// Extract specific selectors
export function extractBySelector(selector: string): string {
  try {
    const elements = document.querySelectorAll(selector);
    let content = '';
    
    elements.forEach(el => {
      content += el.textContent + '\n';
    });
    
    return content.trim();
  } catch (error) {
    console.error('Error extracting by selector:', error);
    return '';
  }
}

