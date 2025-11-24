// Field loader overlay for input fields during AI generation

let loaderOverlay: HTMLElement | null = null;
let savedActiveElement: HTMLElement | null = null; // Сохраняем элемент, на котором был loader

export function showFieldLoader(element: HTMLElement) {
  // Remove existing loader if any
  hideFieldLoader();

  // Save the element reference
  savedActiveElement = element;

  // Create overlay
  loaderOverlay = document.createElement('div');
  loaderOverlay.id = 'ailex-field-loader';
  loaderOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483646;
    border-radius: inherit;
    pointer-events: none;
  `;

  // Create spinner
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 20px;
    height: 20px;
    border: 2px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: ailex-spinner-spin 0.6s linear infinite;
  `;

  loaderOverlay.appendChild(spinner);

  // Add spinner animation if not exists
  if (!document.getElementById('ailex-field-loader-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'ailex-field-loader-styles';
    styleSheet.textContent = `
      @keyframes ailex-spinner-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Position overlay relative to element
  const computedStyle = window.getComputedStyle(element);
  const position = computedStyle.position;

  // If element is not positioned, wrap it
  if (position === 'static') {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      width: 100%;
    `;
    
    if (element.parentNode) {
      element.parentNode.insertBefore(wrapper, element);
      wrapper.appendChild(element);
      wrapper.appendChild(loaderOverlay);
    }
  } else {
    // Element is already positioned, append overlay directly
    if (element.parentNode) {
      // Check if we can append to the element itself or need the parent
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        // For input/textarea, create a wrapper
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          position: relative;
          display: inline-block;
          width: 100%;
        `;
        
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(element);
        wrapper.appendChild(loaderOverlay);
      } else {
        // For contenteditable, append to the element
        element.style.position = 'relative';
        element.appendChild(loaderOverlay);
      }
    }
  }
}

export function hideFieldLoader() {
  if (loaderOverlay) {
    const parent = loaderOverlay.parentElement;
    
    // Remove loader
    if (loaderOverlay.parentNode) {
      loaderOverlay.parentNode.removeChild(loaderOverlay);
    }
    
    // Clean up wrapper if we created one
    if (parent && parent.childElementCount === 1 && parent.style.position === 'relative') {
      const child = parent.firstElementChild;
      if (child && parent.parentNode) {
        parent.parentNode.insertBefore(child, parent);
        parent.parentNode.removeChild(parent);
      }
    }
    
    loaderOverlay = null;
  }
  // Don't clear savedActiveElement here - we need it for insertion
}

export function getSavedActiveElement(): HTMLElement | null {
  return savedActiveElement;
}

export function clearSavedActiveElement() {
  savedActiveElement = null;
}

