let isActive = false;
let overlay: HTMLDivElement | null = null;
let stopButton: HTMLButtonElement | null = null;
let progressContainer: HTMLDivElement | null = null;
let currentType: 'tool' | 'parsing' = 'tool';
let currentSessionId: string | null = null;

// Apply visual effect when interacting with page
export function startVisualEffect(type: 'tool' | 'parsing' = 'tool', sessionId?: string) {
  console.log('[visualEffects] startVisualEffect called:', { type, sessionId, isActive, currentSessionId });
  
  // Проверяем, действительно ли эффект активен (элементы существуют в DOM)
  const overlayExists = overlay && document.body.contains(overlay);
  const stopButtonExists = stopButton && document.body.contains(stopButton);
  
  console.log('[visualEffects] Elements check:', { overlayExists, stopButtonExists });
  
  // Синхронизируем isActive с реальным состоянием DOM
  if (isActive && (!overlayExists || !stopButtonExists)) {
    console.log('[visualEffects] State mismatch: isActive=true but elements missing. Resetting.');
    isActive = false;
    overlay = null;
    stopButton = null;
    progressContainer = null;
  }
  
  // Для парсинга: если уже активен с тем же sessionId и элементы существуют, ничего не делаем
  if (isActive && type === 'parsing' && currentSessionId === sessionId && overlayExists && stopButtonExists) {
    console.log('[visualEffects] Parsing effect already active for session:', sessionId);
    return;
  }
  
  // Если уже активен другой эффект, останавливаем его
  if (isActive) {
    console.log('[visualEffects] Stopping previous effect');
    stopVisualEffect();
  }
  
  console.log('[visualEffects] Creating new visual effect:', { type, sessionId });
  
  isActive = true;
  currentType = type;
  currentSessionId = sessionId || null;
  
  // Determine border color based on type
  const borderColor = type === 'parsing' 
    ? 'rgba(59, 130, 246, 0.8)'  // Blue for parsing
    : 'rgba(34, 197, 94, 0.8)';   // Green for tools
    
  const borderColorLight = type === 'parsing'
    ? 'rgba(59, 130, 246, 0.4)'
    : 'rgba(34, 197, 94, 0.4)';
  
  // Create overlay with colored border
  overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 999999;
    box-shadow: inset 0 0 0 4px ${borderColor};
    animation: ailex-pulse 2s ease-in-out infinite;
  `;
  
  // Add keyframe animation
  if (!document.getElementById('ailex-styles')) {
    const style = document.createElement('style');
    style.id = 'ailex-styles';
    style.textContent = `
      @keyframes ailex-pulse {
        0%, 100% { box-shadow: inset 0 0 0 4px ${borderColor}; }
        50% { box-shadow: inset 0 0 0 4px ${borderColorLight}; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(overlay);
  
  // Create progress bar for parsing
  if (type === 'parsing') {
    createProgressBar();
  }
  
  // Create stop button
  stopButton = document.createElement('button');
  stopButton.textContent = type === 'parsing' ? 'Остановить парсинг' : 'Stop Processing';
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
    
    // Send appropriate stop message
    if (type === 'parsing' && currentSessionId) {
      chrome.runtime.sendMessage({ type: 'STOP_PARSING', sessionId: currentSessionId });
    } else {
      chrome.runtime.sendMessage({ type: 'STOP_PROCESSING' });
    }
  });
  
  document.body.appendChild(stopButton);
}

// Create progress bar for parsing
function createProgressBar() {
  progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000000;
    background: white;
    border-radius: 12px;
    padding: 16px 24px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    min-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  `;
  
  progressContainer.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: 600; font-size: 16px; color: #111;">Парсинг данных</div>
    <div id="parsing-progress-text" style="font-size: 14px; color: #666; margin-bottom: 12px;">
      Страница 0/0
    </div>
    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
      <div id="parsing-progress-bar" style="background: #3b82f6; height: 100%; width: 0%; transition: width 0.3s;"></div>
    </div>
    <div id="parsing-status" style="font-size: 12px; color: #999; margin-top: 8px;"></div>
  `;
  
  document.body.appendChild(progressContainer);
}

// Update parsing progress
export function updateParsingProgress(current: number, total: number, status: string, sessionId?: string) {
  if (sessionId) {
    currentSessionId = sessionId;
  }
  
  if (!progressContainer) {
    return;
  }
  
  const progressText = progressContainer.querySelector('#parsing-progress-text');
  const progressBar = progressContainer.querySelector('#parsing-progress-bar') as HTMLElement;
  const statusText = progressContainer.querySelector('#parsing-status');
  
  if (progressText) {
    progressText.textContent = `Страница ${current}/${total}`;
  }
  
  if (progressBar) {
    const percentage = (current / total) * 100;
    progressBar.style.width = `${percentage}%`;
  }
  
  if (statusText) {
    statusText.textContent = status || '';
  }
}

// Remove visual effect
export function stopVisualEffect() {
  isActive = false;
  currentType = 'tool';
  currentSessionId = null;
  
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  
  if (stopButton) {
    stopButton.remove();
    stopButton = null;
  }
  
  if (progressContainer) {
    progressContainer.remove();
    progressContainer = null;
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
