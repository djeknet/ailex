let isActive = false;
let overlay: HTMLDivElement | null = null;
let stopButton: HTMLButtonElement | null = null;

// Apply green border effect when interacting with page
export function startVisualEffect() {
  if (isActive) return;
  isActive = true;
  
  // Create overlay with green border
  overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 999999;
    box-shadow: inset 0 0 0 4px rgba(34, 197, 94, 0.8);
    animation: ailex-pulse 2s ease-in-out infinite;
  `;
  
  // Add keyframe animation
  if (!document.getElementById('ailex-styles')) {
    const style = document.createElement('style');
    style.id = 'ailex-styles';
    style.textContent = `
      @keyframes ailex-pulse {
        0%, 100% { box-shadow: inset 0 0 0 4px rgba(34, 197, 94, 0.8); }
        50% { box-shadow: inset 0 0 0 4px rgba(34, 197, 94, 0.4); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(overlay);
  
  // Create stop button
  stopButton = document.createElement('button');
  stopButton.textContent = 'Stop Processing';
  stopButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000000;
    padding: 12px 24px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: background 0.2s;
  `;
  
  stopButton.addEventListener('mouseenter', () => {
    stopButton!.style.background = '#dc2626';
  });
  
  stopButton.addEventListener('mouseleave', () => {
    stopButton!.style.background = '#ef4444';
  });
  
  stopButton.addEventListener('click', () => {
    stopVisualEffect();
    // Send message to background to stop processing
    chrome.runtime.sendMessage({ type: 'STOP_PROCESSING' });
  });
  
  document.body.appendChild(stopButton);
}

// Remove visual effect
export function stopVisualEffect() {
  isActive = false;
  
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  
  if (stopButton) {
    stopButton.remove();
    stopButton = null;
  }
}

// Highlight elements temporarily
export function highlightElements(selector: string, duration: number = 2000) {
  try {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const originalOutline = htmlEl.style.outline;
      
      htmlEl.style.outline = '2px solid #3b82f6';
      htmlEl.style.outlineOffset = '2px';
      
      setTimeout(() => {
        htmlEl.style.outline = originalOutline;
        htmlEl.style.outlineOffset = '';
      }, duration);
    });
  } catch (error) {
    console.error('Error highlighting elements:', error);
  }
}

