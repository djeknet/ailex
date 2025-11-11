// DOM element selection utilities

// Get XPath for an element
export function getElementXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  if (element === document.body) {
    return '/html/body';
  }
  
  let position = 0;
  let sibling = element.previousSibling;
  
  while (sibling) {
    if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
      position++;
    }
    sibling = sibling.previousSibling;
  }
  
  const tagName = element.nodeName.toLowerCase();
  const index = position > 0 ? `[${position + 1}]` : '';
  
  if (element.parentElement) {
    return `${getElementXPath(element.parentElement)}/${tagName}${index}`;
  }
  
  return `/${tagName}${index}`;
}

// Get element by XPath
export function getElementByXPath(xpath: string): HTMLElement | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  
  return result.singleNodeValue as HTMLElement | null;
}

// Get a human-readable name for an element
export function getElementName(element: HTMLElement): string {
  // Try to get meaningful name
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      return `.${classes[0]}`;
    }
  }
  
  // Use tag name with role or aria-label
  const role = element.getAttribute('role');
  const ariaLabel = element.getAttribute('aria-label');
  
  if (ariaLabel) {
    return `${element.tagName.toLowerCase()}[${ariaLabel.substring(0, 20)}]`;
  }
  
  if (role) {
    return `${element.tagName.toLowerCase()}[${role}]`;
  }
  
  // Get text content (first 20 chars)
  const text = element.textContent?.trim().substring(0, 20);
  if (text) {
    return `${element.tagName.toLowerCase()}[${text}]`;
  }
  
  return element.tagName.toLowerCase();
}

// Get clean innerHTML (remove scripts and dangerous elements)
export function getCleanInnerHTML(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Remove scripts
  clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
  
  // Get innerHTML
  let html = clone.innerHTML;
  
  // Trim whitespace
  html = html.trim();
  
  // Limit size (max 50KB)
  const maxLength = 50000;
  if (html.length > maxLength) {
    html = html.substring(0, maxLength) + '\n... (truncated)';
  }
  
  return html;
}

// Check if element is visible
export function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 0 &&
    rect.height > 0
  );
}

