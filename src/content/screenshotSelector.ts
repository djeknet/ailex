// Screenshot area selector with visual feedback
let isActive = false;
let overlay: HTMLDivElement | null = null;
let selectionBox: HTMLDivElement | null = null;
let startX = 0;
let startY = 0;
let isSelecting = false;
let onSelectCallback: ((area: { x: number; y: number; width: number; height: number }) => void) | null = null;
let onCancelCallback: (() => void) | null = null;

// Start screenshot area selector mode
export function startScreenshotSelector(
  onSelect: (area: { x: number; y: number; width: number; height: number }) => void,
  onCancel: () => void
) {
  if (isActive) return;
  
  isActive = true;
  onSelectCallback = onSelect;
  onCancelCallback = onCancel;
  
  createOverlay();
  createSelectionBox();
  attachEventListeners();
}

// Stop screenshot selector mode
export function stopScreenshotSelector() {
  if (!isActive) return;
  
  isActive = false;
  isSelecting = false;
  removeOverlay();
  removeSelectionBox();
  removeEventListeners();
  
  onSelectCallback = null;
  onCancelCallback = null;
}

// Create darkening overlay
function createOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'ailex-screenshot-selector-overlay';
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
  
  // Add instruction text
  const instruction = document.createElement('div');
  instruction.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 999999;
    pointer-events: none;
  `;
  instruction.textContent = 'Выделите область для скриншота. Нажмите Esc для отмены.';
  
  overlay.appendChild(instruction);
  document.body.appendChild(overlay);
}

// Create selection box
function createSelectionBox() {
  selectionBox = document.createElement('div');
  selectionBox.id = 'ailex-screenshot-selection';
  selectionBox.style.cssText = `
    position: fixed;
    border: 2px solid #3b82f6;
    background: transparent;
    z-index: 999999;
    pointer-events: none;
    display: none;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  `;
  document.body.appendChild(selectionBox);
}

// Remove overlay
function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

// Remove selection box
function removeSelectionBox() {
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

// Handle mouse down - start selection
function handleMouseDown(e: MouseEvent) {
  if (!isActive || !overlay) return;
  
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  
  if (selectionBox) {
    selectionBox.style.display = 'block';
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
  }
}

// Handle mouse move - update selection
function handleMouseMove(e: MouseEvent) {
  if (!isActive || !isSelecting || !selectionBox) return;
  
  const currentX = e.clientX;
  const currentY = e.clientY;
  
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  
  selectionBox.style.left = `${left}px`;
  selectionBox.style.top = `${top}px`;
  selectionBox.style.width = `${width}px`;
  selectionBox.style.height = `${height}px`;
}

// Handle mouse up - complete selection
function handleMouseUp(e: MouseEvent) {
  if (!isActive || !isSelecting) return;
  
  isSelecting = false;
  
  const currentX = e.clientX;
  const currentY = e.clientY;
  
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  
  // Minimum size check (at least 10x10 pixels)
  if (width < 10 || height < 10) {
    if (selectionBox) {
      selectionBox.style.display = 'none';
    }
    return;
  }
  
  if (onSelectCallback) {
    onSelectCallback({
      x: left,
      y: top,
      width,
      height
    });
  }
  
  stopScreenshotSelector();
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
    
    stopScreenshotSelector();
  }
}

// Attach event listeners
function attachEventListeners() {
  document.addEventListener('mousedown', handleMouseDown, true);
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('mouseup', handleMouseUp, true);
  document.addEventListener('keydown', handleKeyDown, true);
}

// Remove event listeners
function removeEventListeners() {
  document.removeEventListener('mousedown', handleMouseDown, true);
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('mouseup', handleMouseUp, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

