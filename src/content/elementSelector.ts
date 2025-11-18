// Element selector with visual feedback
import { getElementXPath, getElementName, getCleanInnerHTML, isElementVisible } from '@shared/utils/domSelector';

// Generate unique CSS selector for an element
function generateUniqueSelector(element: HTMLElement): string {
  // Priority 1: ID
  if (element.id) {
    const selector = `#${CSS.escape(element.id)}`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Priority 2: Unique attributes
  const uniqueAttrs = ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa'];
  for (const attr of uniqueAttrs) {
    const value = element.getAttribute(attr);
    if (value) {
      const selector = `[${attr}="${CSS.escape(value)}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }

  // name attribute
  const name = element.getAttribute('name');
  if (name) {
    const selector = `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // type attribute for inputs/buttons
  const type = element.getAttribute('type');
  if (type && (element.tagName === 'INPUT' || element.tagName === 'BUTTON')) {
    const selector = `${element.tagName.toLowerCase()}[type="${CSS.escape(type)}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Priority 3: Class + nth-child
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c);
    if (classes.length > 0) {
      // Try first class
      const firstClass = classes[0];
      const classSelector = `.${CSS.escape(firstClass)}`;
      const matches = document.querySelectorAll(classSelector);
      
      if (matches.length === 1) {
        return classSelector;
      }
      
      // Try class with nth-child
      const parent = element.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(element) + 1;
        const selector = `${classSelector}:nth-child(${index})`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }
  }

  // Priority 4: Path from parent with ID or unique class
  let current: HTMLElement | null = element;
  const path: string[] = [];
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    // Add nth-child if needed
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const sameTagSiblings = siblings.filter(s => s.tagName === current!.tagName);
      if (sameTagSiblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    
    // Check if parent has ID - we can stop here
    if (current.parentElement?.id) {
      const parentSelector = `#${CSS.escape(current.parentElement.id)}`;
      const fullSelector = `${parentSelector} > ${path.join(' > ')}`;
      if (document.querySelectorAll(fullSelector).length === 1) {
        return fullSelector;
      }
    }
    
    current = current.parentElement;
  }

  // Priority 5: Full path with nth-child
  const fullPath = path.join(' > ');
  const fullSelector = `body > ${fullPath}`;
  
  return fullSelector;
}

let isActive = false;
let overlay: HTMLDivElement | null = null;
let highlightBox: HTMLDivElement | null = null;
let currentElement: HTMLElement | null = null;
let onSelectCallback: ((data: { xpath: string; name: string; innerHTML: string; cssSelector: string }) => void) | null = null;
let onCancelCallback: (() => void) | null = null;

// Start element selector mode
export function startElementSelector(
  onSelect: (data: { xpath: string; name: string; innerHTML: string; cssSelector: string }) => void,
  onCancel: () => void
) {
  if (isActive) return;
  
  isActive = true;
  onSelectCallback = onSelect;
  onCancelCallback = onCancel;
  
  createOverlay();
  createHighlightBox();
  attachEventListeners();
}

// Stop element selector mode
export function stopElementSelector() {
  if (!isActive) return;
  
  isActive = false;
  removeOverlay();
  removeHighlightBox();
  removeEventListeners();
  
  currentElement = null;
  onSelectCallback = null;
  onCancelCallback = null;
}

// Create transparent overlay (no darkening)
function createOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'ailex-element-selector-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    z-index: 999998;
    cursor: crosshair;
  `;
  document.body.appendChild(overlay);
}

// Create highlight box for selected element
function createHighlightBox() {
  highlightBox = document.createElement('div');
  highlightBox.id = 'ailex-element-highlight';
  highlightBox.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 999999;
    border: 2px solid #ef4444;
    background: rgba(239, 68, 68, 0.1);
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
    transition: all 0.1s ease;
  `;
  document.body.appendChild(highlightBox);
}

// Remove overlay
function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

// Remove highlight box
function removeHighlightBox() {
  if (highlightBox) {
    highlightBox.remove();
    highlightBox = null;
  }
}

// Handle mouse move - highlight element under cursor
function handleMouseMove(e: MouseEvent) {
  if (!isActive || !highlightBox) return;
  
  // Get element under cursor (excluding our overlay and highlight box)
  const elements = document.elementsFromPoint(e.clientX, e.clientY);
  const targetElement = elements.find(
    el => el !== overlay && el !== highlightBox && el instanceof HTMLElement
  ) as HTMLElement | undefined;
  
  if (!targetElement || targetElement === document.body || targetElement === document.documentElement) {
    highlightBox.style.display = 'none';
    currentElement = null;
    return;
  }
  
  // Skip if element is not visible
  if (!isElementVisible(targetElement)) {
    highlightBox.style.display = 'none';
    currentElement = null;
    return;
  }
  
  currentElement = targetElement;
  
  // Position highlight box
  const rect = targetElement.getBoundingClientRect();
  highlightBox.style.display = 'block';
  highlightBox.style.top = `${rect.top + window.scrollY}px`;
  highlightBox.style.left = `${rect.left + window.scrollX}px`;
  highlightBox.style.width = `${rect.width}px`;
  highlightBox.style.height = `${rect.height}px`;
}

// Handle click - select element
function handleClick(e: MouseEvent) {
  if (!isActive) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  if (currentElement && onSelectCallback) {
    const xpath = getElementXPath(currentElement);
    const name = getElementName(currentElement);
    const innerHTML = getCleanInnerHTML(currentElement);
    const cssSelector = generateUniqueSelector(currentElement);
    
    onSelectCallback({ xpath, name, innerHTML, cssSelector });
  }
  
  stopElementSelector();
}

// Handle escape key - cancel selection
function handleKeyDown(e: KeyboardEvent) {
  if (!isActive) return;
  
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    
    if (onCancelCallback) {
      onCancelCallback();
    }
    
    stopElementSelector();
  }
}

// Attach event listeners
function attachEventListeners() {
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
}

// Remove event listeners
function removeEventListeners() {
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

