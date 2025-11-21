// Screenshot capture and image compression utilities

export interface CaptureArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Convert SVG to PNG
export async function convertSvgToPng(svgBase64: string): Promise<{ data: string; mimeType: string }> {
  console.log('[convertSvgToPng] Converting SVG to PNG');
  console.log('[convertSvgToPng] Input base64 length:', svgBase64.length);
  console.log('[convertSvgToPng] First 50 chars:', svgBase64.substring(0, 50));
  
  return new Promise((resolve, reject) => {
    try {
      // Create data URL directly from base64
      const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
      console.log('[convertSvgToPng] Created data URL');
      
      const img = new Image();
      
      img.onload = () => {
        try {
          console.log('[convertSvgToPng] SVG loaded, dimensions:', img.width, 'x', img.height);
          
          // Create canvas with SVG dimensions
          const canvas = document.createElement('canvas');
          // Use natural dimensions if available, otherwise fallback
          canvas.width = img.naturalWidth || img.width || 100;
          canvas.height = img.naturalHeight || img.height || 100;
          
          console.log('[convertSvgToPng] Canvas size:', canvas.width, 'x', canvas.height);
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Fill with white background (SVG might have transparency)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw SVG on canvas
          ctx.drawImage(img, 0, 0);
          
          // Convert to PNG
          const pngDataUrl = canvas.toDataURL('image/png');
          const pngBase64 = pngDataUrl.split(',')[1];
          
          console.log('[convertSvgToPng] Conversion successful, PNG base64 length:', pngBase64.length);
          console.log('[convertSvgToPng] PNG first 50 chars:', pngBase64.substring(0, 50));
          
          resolve({ data: pngBase64, mimeType: 'image/png' });
        } catch (error) {
          console.error('[convertSvgToPng] Error during conversion:', error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.error('[convertSvgToPng] Error loading SVG:', error);
        reject(new Error('Failed to load SVG image'));
      };
      
      // Set cross-origin to anonymous to allow canvas export
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
    } catch (error) {
      console.error('[convertSvgToPng] Error:', error);
      reject(error);
    }
  });
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
// Returns { data: base64, mimeType: string }
export async function compressImage(
  base64: string, 
  maxSizeMB: number, 
  mimeType: string = 'image/png'
): Promise<{ data: string; mimeType: string }> {
  console.log('[compressImage] Input MIME type:', mimeType);
  console.log('[compressImage] Input data length:', base64.length);
  
  // Calculate target size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const currentSizeBytes = (base64.length * 3) / 4; // Approximate base64 to bytes
  
  // For SVG, convert to PNG first
  if (mimeType === 'image/svg+xml') {
    console.log('[compressImage] SVG detected, converting to PNG');
    return await convertSvgToPng(base64);
  }
  
  const dataUrl = `data:${mimeType};base64,${base64}`;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      if (currentSizeBytes <= maxSizeBytes) {
        // No compression needed
        console.log('[compressImage] No compression needed');
        resolve({ data: base64, mimeType });
        return;
      }
      
      console.log('[compressImage] Compression needed, current size:', (currentSizeBytes / 1024 / 1024).toFixed(2), 'MB');
      
      // Reduce dimensions proportionally
      const ratio = Math.sqrt(maxSizeBytes / currentSizeBytes);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
      
      console.log('[compressImage] Resizing to:', width, 'x', height);
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Determine output format
      // Use JPEG for better compression, unless it's PNG with transparency
      let outputFormat = 'image/jpeg';
      if (mimeType === 'image/png' || mimeType === 'image/webp') {
        // Check if image has transparency
        const imageData = ctx.getImageData(0, 0, width, height);
        const hasTransparency = imageData.data.some((_, i) => i % 4 === 3 && imageData.data[i] < 255);
        if (hasTransparency) {
          outputFormat = 'image/png';
          console.log('[compressImage] Image has transparency, keeping PNG format');
        }
      }
      
      // Try different quality levels
      let quality = 0.9;
      let compressedDataUrl: string;
      let compressedBase64: string;
      
      do {
        compressedDataUrl = canvas.toDataURL(outputFormat, quality);
        compressedBase64 = compressedDataUrl.split(',')[1];
        const compressedSize = (compressedBase64.length * 3) / 4;
        
        console.log('[compressImage] Quality:', quality, 'Size:', (compressedSize / 1024 / 1024).toFixed(2), 'MB');
        
        if (compressedSize <= maxSizeBytes || quality <= 0.1) {
          break;
        }
        
        quality -= 0.1;
      } while (quality > 0);
      
      console.log('[compressImage] Final output format:', outputFormat, 'Quality:', quality);
      resolve({ data: compressedBase64, mimeType: outputFormat });
    };
    img.onerror = (error) => {
      console.error('[compressImage] Error loading image:', error);
      reject(error);
    };
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

