// Screenshot capture and image compression utilities

export interface CaptureArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Capture screenshot of current tab
export async function captureScreenshot(area?: CaptureArea): Promise<string> {
  try {
    // Call background script to capture (it has required permissions)
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT'
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    const dataUrl = response.dataUrl;
    
    // If area is specified, crop the image
    if (area) {
      return await cropImage(dataUrl, area);
    }
    
    // Return base64 without data URL prefix
    return dataUrl.split(',')[1];
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw error;
  }
}

// Crop image to specified area
async function cropImage(dataUrl: string, area: CaptureArea): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = area.width;
      canvas.height = area.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw cropped portion
      ctx.drawImage(
        img,
        area.x, area.y, area.width, area.height,
        0, 0, area.width, area.height
      );
      
      // Get base64 without data URL prefix
      const croppedDataUrl = canvas.toDataURL('image/png');
      resolve(croppedDataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Compress image to target size
export async function compressImage(base64: string, maxSizeMB: number): Promise<string> {
  const dataUrl = `data:image/png;base64,${base64}`;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // Calculate target size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const currentSizeBytes = (base64.length * 3) / 4; // Approximate base64 to bytes
      
      if (currentSizeBytes <= maxSizeBytes) {
        // No compression needed
        resolve(base64);
        return;
      }
      
      // Reduce dimensions proportionally
      const ratio = Math.sqrt(maxSizeBytes / currentSizeBytes);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try different quality levels
      let quality = 0.9;
      let compressedDataUrl: string;
      let compressedBase64: string;
      
      do {
        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        compressedBase64 = compressedDataUrl.split(',')[1];
        const compressedSize = (compressedBase64.length * 3) / 4;
        
        if (compressedSize <= maxSizeBytes || quality <= 0.1) {
          break;
        }
        
        quality -= 0.1;
      } while (quality > 0);
      
      resolve(compressedBase64);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Get image dimensions from base64
export async function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

