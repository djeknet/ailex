// Toast notification system for content script
// Lightweight and isolated from the page's styles

let toastContainer: HTMLElement | null = null;

export type ToastType = 'success' | 'error';

export function showToast(message: string, type: ToastType = 'success', duration: number = 3000) {
  // Create container if not exists
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'ailex-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'ailex-toast';
  
  const bgColor = type === 'success' ? '#10b981' : '#ef4444';
  const icon = type === 'success' ? '✓' : '✕';
  
  toast.style.cssText = `
    background: ${bgColor};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    pointer-events: auto;
    animation: ailex-toast-slide-in 0.3s ease-out;
    max-width: 350px;
    word-wrap: break-word;
  `;

  // Add animation keyframes if not already added
  if (!document.getElementById('ailex-toast-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'ailex-toast-styles';
    styleSheet.textContent = `
      @keyframes ailex-toast-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes ailex-toast-slide-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  toast.innerHTML = `
    <span style="font-size: 16px; line-height: 1;">${icon}</span>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Auto remove after duration
  setTimeout(() => {
    toast.style.animation = 'ailex-toast-slide-out 0.3s ease-in forwards';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
      
      // Remove container if empty
      if (toastContainer && toastContainer.children.length === 0) {
        toastContainer.remove();
        toastContainer = null;
      }
    }, 300);
  }, duration);
}

