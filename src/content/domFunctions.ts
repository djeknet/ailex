// DOM Functions для выполнения инструментов на странице

// ============================================================================
// 1. Навигация и взаимодействие с DOM
// ============================================================================

export interface GetElementsParams {
  selector: string;
  limit?: number;
  includeHidden?: boolean;
}

export interface ElementInfo {
  xpath: string;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
}

export function getElements(params: GetElementsParams): ElementInfo[] {
  const { selector, limit = 50, includeHidden = false } = params;
  
  try {
    const elements = Array.from(document.querySelectorAll(selector));
    const filtered = includeHidden 
      ? elements 
      : elements.filter(el => {
          const style = window.getComputedStyle(el as HTMLElement);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
    
    return filtered.slice(0, limit).map((el, index) => ({
      xpath: getXPath(el),
      tagName: el.tagName.toLowerCase(),
      text: el.textContent?.trim().substring(0, 100) || '',
      attributes: getElementAttributes(el)
    }));
  } catch (error) {
    console.error('Error in getElements:', error);
    return [];
  }
}

export interface ClickElementParams {
  selector: string;
  index?: number;
}

export function clickElement(params: ClickElementParams): boolean {
  const { selector, index = 0 } = params;
  
  console.log('[domFunctions] clickElement called:', { selector, index });
  
  try {
    const elements = document.querySelectorAll(selector);
    const element = elements[index] as HTMLElement;
    
    console.log('[domFunctions] clickElement - element found:', element);
    
    if (!element) {
      console.error('[domFunctions] clickElement - element NOT found at index:', index);
      throw new Error(`Element not found at index ${index}`);
    }
    
    element.click();
    console.log('[domFunctions] clickElement - SUCCESS');
    return true;
  } catch (error) {
    console.error('[domFunctions] Error in clickElement:', error);
    return false;
  }
}

export interface SetValueParams {
  selector: string;
  value: string;
}

export function setValue(params: SetValueParams): boolean {
  const { selector, value } = params;
  
  console.log('[domFunctions] setValue called:', { selector, value });
  
  try {
    const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    
    console.log('[domFunctions] setValue - element found:', element);
    
    if (!element) {
      console.error('[domFunctions] setValue - element NOT found for selector:', selector);
      throw new Error('Element not found');
    }
    
    // Handle contenteditable
    if (element.hasAttribute('contenteditable')) {
      console.log('[domFunctions] setValue - setting contenteditable');
      element.textContent = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    
    // Handle input/textarea
    console.log('[domFunctions] setValue - setting input/textarea value');
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('[domFunctions] setValue - SUCCESS, new value:', element.value);
    return true;
  } catch (error) {
    console.error('[domFunctions] Error in setValue:', error);
    return false;
  }
}

export function selectOption(selector: string, value: string): boolean {
  try {
    const select = document.querySelector(selector) as HTMLSelectElement;
    
    if (!select || select.tagName !== 'SELECT') {
      throw new Error('Select element not found');
    }
    
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    
    return true;
  } catch (error) {
    console.error('Error in selectOption:', error);
    return false;
  }
}

export function focusElement(selector: string): boolean {
  try {
    const element = document.querySelector(selector) as HTMLElement;
    
    if (!element) {
      throw new Error('Element not found');
    }
    
    element.focus();
    return true;
  } catch (error) {
    console.error('Error in focusElement:', error);
    return false;
  }
}

export function setCheckbox(selector: string, checked: boolean): boolean {
  try {
    const element = document.querySelector(selector) as HTMLInputElement;
    
    if (!element || element.type !== 'checkbox') {
      throw new Error('Checkbox element not found');
    }
    
    if (element.checked !== checked) {
      element.checked = checked;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('click', { bubbles: true }));
    }
    
    return true;
  } catch (error) {
    console.error('Error in setCheckbox:', error);
    return false;
  }
}

export function submitForm(selector?: string): boolean {
  try {
    let form: HTMLFormElement | null = null;
    
    if (selector) {
      form = document.querySelector(selector) as HTMLFormElement;
    } else {
      // Try to find any form on the page
      form = document.querySelector('form') as HTMLFormElement;
    }
    
    if (!form || form.tagName !== 'FORM') {
      throw new Error('Form element not found');
    }
    
    // Try to find and click submit button first (more reliable)
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
    if (submitButton) {
      submitButton.click();
      return true;
    }
    
    // Fallback to form.submit()
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const shouldSubmit = form.dispatchEvent(submitEvent);
    
    if (shouldSubmit) {
      form.submit();
    }
    
    return true;
  } catch (error) {
    console.error('Error in submitForm:', error);
    return false;
  }
}

export function hoverElement(selector: string): boolean {
  try {
    const element = document.querySelector(selector) as HTMLElement;
    
    if (!element) {
      throw new Error('Element not found');
    }
    
    const event = new MouseEvent('mouseover', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    
    element.dispatchEvent(event);
    return true;
  } catch (error) {
    console.error('Error in hoverElement:', error);
    return false;
  }
}

export function scrollToElement(selector: string, smooth: boolean = true): boolean {
  try {
    const element = document.querySelector(selector) as HTMLElement;
    
    if (!element) {
      throw new Error('Element not found');
    }
    
    element.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'center'
    });
    
    return true;
  } catch (error) {
    console.error('Error in scrollToElement:', error);
    return false;
  }
}

export function getCurrentUrl(): string {
  return window.location.href;
}

export function getPageMetadata(): {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string;
  h1: string;
} {
  const getMetaContent = (name: string): string => {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta?.getAttribute('content') || '';
  };
  
  return {
    title: document.title || '',
    description: getMetaContent('description'),
    ogTitle: getMetaContent('og:title'),
    ogDescription: getMetaContent('og:description'),
    keywords: getMetaContent('keywords'),
    h1: document.querySelector('h1')?.textContent?.trim() || ''
  };
}

export function waitForPageLoad(timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve(true);
      return;
    }
    
    const timer = setTimeout(() => {
      resolve(false);
    }, timeout);
    
    window.addEventListener('load', () => {
      clearTimeout(timer);
      resolve(true);
    }, { once: true });
  });
}

export function getSimplifiedHTML(): string {
  try {
    const body = document.body;
    if (!body) return '';
    
    // Клонируем body для обработки
    const clone = body.cloneNode(true) as HTMLElement;
    
    // Удаляем ненужные элементы
    const removeSelectors = [
      'script',
      'style',
      'noscript',
      'iframe',
      'svg',
      'canvas',
      'video',
      'audio',
      'object',
      'embed',
      '.ad',
      '.advertisement',
      '[role="navigation"]',
      '[role="banner"]',
      '[role="contentinfo"]',
      'nav',
      'header',
      'footer',
      'aside'
    ];
    
    removeSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // Удаляем атрибуты style, class (оставляем только id и data-атрибуты)
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      el.removeAttribute('style');
      el.removeAttribute('class');
      // Удаляем event handlers
      const attrs = Array.from(el.attributes);
      attrs.forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });
    
    // Получаем HTML и ограничиваем размер
    let html = clone.innerHTML;
    
    // Удаляем HTML комментарии
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    
    // Сжимаем пробелы
    html = html.replace(/\s+/g, ' ');
    
    // Ограничиваем до 5000 символов
    if (html.length > 5000) {
      html = html.substring(0, 5000) + '...';
    }
    
    return html.trim();
  } catch (error) {
    console.error('Error in getSimplifiedHTML:', error);
    return '';
  }
}

// ============================================================================
// 2. Чтение данных и анализ страницы
// ============================================================================

export interface GetLinksParams {
  includeImages?: boolean;
  domainsFilter?: string[];
}

export function getLinks(params: GetLinksParams = {}): Array<{ href: string; text: string }> {
  const { includeImages = false, domainsFilter = [] } = params;
  
  try {
    const links = Array.from(document.querySelectorAll('a[href]'));
    console.log('[getLinks] Total links found:', links.length);
    
    let filtered = links.filter(link => {
      const href = link.getAttribute('href');
      if (!href) return false;
      
      // Skip anchors and javascript
      if (href.startsWith('#') || href.startsWith('javascript:')) return false;
      
      // Filter by domain if specified
      if (domainsFilter.length > 0) {
        try {
          const url = new URL(href, window.location.href);
          return domainsFilter.some(domain => url.hostname.includes(domain));
        } catch {
          return false;
        }
      }
      
      return true;
    });
    console.log('[getLinks] Filtered links:', filtered.length);
    
    // Преобразовать относительные URL в абсолютные
    const result = filtered.map(link => {
      const href = link.getAttribute('href') || '';
      try {
        const absoluteUrl = new URL(href, window.location.href).href;
        return {
          href: absoluteUrl,
          text: link.textContent?.trim() || ''
        };
      } catch {
        return {
          href: href,
          text: link.textContent?.trim() || ''
        };
      }
    });
    
    console.log('[getLinks] Returning', result.length, 'links with absolute URLs');
    console.log('[getLinks] First 5 links:', result.slice(0, 5).map(l => l.href));
    
    return result;
  } catch (error) {
    console.error('Error in getLinks:', error);
    return [];
  }
}

export function getText(maxLength?: number): string {
  try {
    let text = document.body.innerText || '';
    
    // Очистка текста:
    // 1. Убираем множественные пробелы и табы
    text = text.replace(/[ \t]+/g, ' ');
    
    // 2. Убираем множественные переносы строк (оставляем максимум 2 подряд)
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // 3. Убираем пробелы в начале и конце строк
    text = text.split('\n').map(line => line.trim()).join('\n');
    
    // 4. Убираем пустые строки в начале и конце
    text = text.trim();
    
    return maxLength ? text.substring(0, maxLength) : text;
  } catch (error) {
    console.error('Error in getText:', error);
    return '';
  }
}

export function getHTML(): string {
  try {
    return document.documentElement.outerHTML;
  } catch (error) {
    console.error('Error in getHTML:', error);
    return '';
  }
}

export interface DOMTreeNode {
  tag: string;
  attributes?: Record<string, string>;
  text?: string;
  children?: DOMTreeNode[];
}

export function getDOMTree(depth: number = 3, attributes: string[] = []): DOMTreeNode {
  try {
    return buildDOMTree(document.body, depth, attributes);
  } catch (error) {
    console.error('Error in getDOMTree:', error);
    return { tag: 'body' };
  }
}

function buildDOMTree(element: Element, depth: number, attributes: string[]): DOMTreeNode {
  const node: DOMTreeNode = {
    tag: element.tagName.toLowerCase()
  };
  
  // Add requested attributes
  if (attributes.length > 0) {
    node.attributes = {};
    attributes.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        node.attributes![attr] = value;
      }
    });
  }
  
  // Add text content for leaf nodes
  if (element.children.length === 0) {
    const text = element.textContent?.trim();
    if (text) {
      node.text = text.substring(0, 100);
    }
  }
  
  // Recursively add children
  if (depth > 0 && element.children.length > 0) {
    node.children = Array.from(element.children)
      .slice(0, 10) // Limit children
      .map(child => buildDOMTree(child, depth - 1, attributes));
  }
  
  return node;
}

export function getMeta(): Record<string, string> {
  try {
    const meta: Record<string, string> = {
      title: document.title,
      url: window.location.href
    };
    
    // Get meta tags
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      
      if (name && content) {
        meta[name] = content;
      }
    });
    
    return meta;
  } catch (error) {
    console.error('Error in getMeta:', error);
    return {};
  }
}

export function getSelection(): string {
  try {
    return window.getSelection()?.toString() || '';
  } catch (error) {
    console.error('Error in getSelection:', error);
    return '';
  }
}

export function getTableData(selector: string): Array<Record<string, string>> {
  try {
    const table = document.querySelector(selector) as HTMLTableElement;
    
    if (!table || table.tagName !== 'TABLE') {
      throw new Error('Table not found');
    }
    
    const headers: string[] = [];
    const rows: Array<Record<string, string>> = [];
    
    // Get headers
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (headerRow) {
      headerRow.querySelectorAll('th, td').forEach(cell => {
        headers.push(cell.textContent?.trim() || '');
      });
    }
    
    // Get data rows
    const dataRows = table.querySelectorAll('tbody tr, tr');
    dataRows.forEach((row, index) => {
      if (index === 0 && !table.querySelector('thead')) return; // Skip header row
      
      const rowData: Record<string, string> = {};
      row.querySelectorAll('td').forEach((cell, cellIndex) => {
        const header = headers[cellIndex] || `column_${cellIndex}`;
        rowData[header] = cell.textContent?.trim() || '';
      });
      
      rows.push(rowData);
    });
    
    return rows;
  } catch (error) {
    console.error('Error in getTableData:', error);
    return [];
  }
}

export function getFormData(selector: string): Record<string, string> {
  try {
    const form = document.querySelector(selector) as HTMLFormElement;
    
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData: Record<string, string> = {};
    
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const element = input as HTMLInputElement;
      const name = element.name || element.id;
      
      if (name && element.type !== 'submit' && element.type !== 'button') {
        formData[name] = element.value || '';
      }
    });
    
    return formData;
  } catch (error) {
    console.error('Error in getFormData:', error);
    return {};
  }
}

/**
 * Получить все поля форм на странице с их метаданными
 */
export function getFormFields(): Array<{
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  value: string;
}> {
  try {
    const fields: Array<any> = [];
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach((input, index) => {
      const element = input as HTMLInputElement;
      
      // Пропускаем кнопки и скрытые поля
      if (element.type === 'submit' || element.type === 'button' || element.type === 'hidden') {
        return;
      }
      
      // Получаем label
      let label = '';
      const id = element.id || element.name;
      if (id) {
        const labelElement = document.querySelector(`label[for="${id}"]`);
        if (labelElement) {
          label = labelElement.textContent?.trim() || '';
        }
      }
      
      // Если label не найден, ищем родительский label
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) {
          label = parentLabel.textContent?.trim() || '';
        }
      }
      
      // Если label всё ещё пустой, используем placeholder или name
      if (!label) {
        label = element.placeholder || element.name || `field_${index}`;
      }
      
      fields.push({
        id: element.id || `input_${index}`,
        name: element.name || element.id || `input_${index}`,
        type: element.type || 'text',
        label: label,
        placeholder: element.placeholder || '',
        required: element.required,
        value: element.value || ''
      });
    });
    
    return fields;
  } catch (error) {
    console.error('Error in getFormFields:', error);
    return [];
  }
}

// ============================================================================
// 3. Модификация контента и стиля
// ============================================================================

export function hideElements(selector: string): boolean {
  try {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    return true;
  } catch (error) {
    console.error('Error in hideElements:', error);
    return false;
  }
}

export function addStyles(selector: string, css: string): boolean {
  try {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      (el as HTMLElement).style.cssText += css;
    });
    return true;
  } catch (error) {
    console.error('Error in addStyles:', error);
    return false;
  }
}

export function replaceStyles(selector: string, css: string): boolean {
  try {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      (el as HTMLElement).style.cssText = css;
    });
    return true;
  } catch (error) {
    console.error('Error in replaceStyles:', error);
    return false;
  }
}

export function injectHTML(selector: string, html: string): boolean {
  try {
    const element = document.querySelector(selector);
    
    if (!element) {
      throw new Error('Element not found');
    }
    
    element.innerHTML = html;
    return true;
  } catch (error) {
    console.error('Error in injectHTML:', error);
    return false;
  }
}

export function removeElements(selector: string): boolean {
  try {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => el.remove());
    return true;
  } catch (error) {
    console.error('Error in removeElements:', error);
    return false;
  }
}

export function highlightElements(selector: string, color: string = '#22c55e'): boolean {
  try {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.outline = `2px solid ${color}`;
      htmlEl.style.outlineOffset = '2px';
    });
    return true;
  } catch (error) {
    console.error('Error in highlightElements:', error);
    return false;
  }
}

export function replaceText(oldText: string, newText: string, matchCase: boolean = true): boolean {
  try {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes: Text[] = [];
    let node;
    
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }
    
    textNodes.forEach(textNode => {
      const content = textNode.textContent || '';
      const regex = new RegExp(oldText, matchCase ? 'g' : 'gi');
      
      if (regex.test(content)) {
        textNode.textContent = content.replace(regex, newText);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error in replaceText:', error);
    return false;
  }
}

// ============================================================================
// 4. Прокрутка и видимость
// ============================================================================

export function scrollDown(pixels: number): boolean {
  try {
    window.scrollBy({ top: pixels, behavior: 'smooth' });
    return true;
  } catch (error) {
    console.error('Error in scrollDown:', error);
    return false;
  }
}

export function scrollUp(pixels: number): boolean {
  try {
    window.scrollBy({ top: -pixels, behavior: 'smooth' });
    return true;
  } catch (error) {
    console.error('Error in scrollUp:', error);
    return false;
  }
}

export function scrollToTop(): boolean {
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  } catch (error) {
    console.error('Error in scrollToTop:', error);
    return false;
  }
}

export function scrollToBottom(): boolean {
  try {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    return true;
  } catch (error) {
    console.error('Error in scrollToBottom:', error);
    return false;
  }
}

export function isElementVisible(selector: string): boolean {
  try {
    const element = document.querySelector(selector) as HTMLElement;
    
    if (!element) {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  } catch (error) {
    console.error('Error in isElementVisible:', error);
    return false;
  }
}

// ============================================================================
// 5. Взаимодействие с контентом и сетью
// ============================================================================

export async function fetchResource(url: string, headers?: Record<string, string>): Promise<string> {
  try {
    const response = await fetch(url, { headers });
    return await response.text();
  } catch (error) {
    console.error('Error in fetchResource:', error);
    throw error;
  }
}

export function downloadFile(url: string, filename?: string): boolean {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (error) {
    console.error('Error in downloadFile:', error);
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error in copyToClipboard:', error);
    return false;
  }
}

export function getImages(includeDataUri: boolean = false): Array<{ src: string; alt: string }> {
  try {
    const images = Array.from(document.querySelectorAll('img'));
    
    return images
      .filter(img => {
        const src = img.src;
        if (!includeDataUri && src.startsWith('data:')) return false;
        return !!src;
      })
      .map(img => ({
        src: img.src,
        alt: img.alt || ''
      }));
  } catch (error) {
    console.error('Error in getImages:', error);
    return [];
  }
}

// ============================================================================
// 6. Структурные и утилитарные функции
// ============================================================================

export function getElementCode(selector: string, includeChildren: boolean = false): { html: string; css: string } {
  try {
    const element = document.querySelector(selector);
    
    if (!element) {
      throw new Error('Element not found');
    }
    
    const html = includeChildren ? element.outerHTML : element.outerHTML.replace(element.innerHTML, '');
    const styles = window.getComputedStyle(element);
    const css = Array.from(styles).map(prop => `${prop}: ${styles.getPropertyValue(prop)};`).join('\n');
    
    return { html, css };
  } catch (error) {
    console.error('Error in getElementCode:', error);
    return { html: '', css: '' };
  }
}

export function getElementPosition(selector: string): { x: number; y: number; width: number; height: number } | null {
  try {
    const element = document.querySelector(selector);
    
    if (!element) {
      throw new Error('Element not found');
    }
    
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  } catch (error) {
    console.error('Error in getElementPosition:', error);
    return null;
  }
}

export function waitForElement(selector: string, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      resolve(true);
      return;
    }
    
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(true);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      resolve(false);
    }, timeout);
  });
}

export function executeJS(script: string): any {
  try {
    return eval(script);
  } catch (error) {
    console.error('Error in executeJS:', error);
    throw error;
  }
}

export function getViewportInfo(): { width: number; height: number; scrollX: number; scrollY: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
}

// ============================================================================
// 7. Утилиты
// ============================================================================

function getXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  if (element === document.body) {
    return '/html/body';
  }
  
  let ix = 0;
  const siblings = element.parentNode?.children;
  
  if (siblings) {
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        return getXPath(element.parentNode as Element) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      }
      if (sibling.tagName === element.tagName) {
        ix++;
      }
    }
  }
  
  return '';
}

function getElementAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attrs[attr.name] = attr.value;
  }
  
  return attrs;
}

