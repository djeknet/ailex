let stream = null;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const errorDiv = document.getElementById('error');
const captureBtn = document.getElementById('capture-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Start webcam
async function startWebcam() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    });
    video.srcObject = stream;
    captureBtn.disabled = false;
  } catch (error) {
    console.error('Error accessing webcam:', error);
    showError('Camera permission denied or no camera found');
    captureBtn.disabled = true;
  }
}

// Show error message
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  video.style.display = 'none';
}

// Stop webcam
function stopWebcam() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

// Capture photo
function capturePhoto() {
  if (!stream) return;
  
  // Set canvas size to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Draw current video frame to canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  // Get base64 data
  canvas.toBlob((blob) => {
    if (!blob) {
      showError('Failed to capture photo');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      
      // Send message to extension
      chrome.runtime.sendMessage({
        type: 'WEBCAM_PHOTO_CAPTURED',
        data: { base64 }
      });
      
      // Close window
      stopWebcam();
      window.close();
    };
    reader.readAsDataURL(blob);
  }, 'image/png');
}

// Event listeners
captureBtn.addEventListener('click', capturePhoto);
cancelBtn.addEventListener('click', () => {
  stopWebcam();
  window.close();
});

// Handle Esc key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    stopWebcam();
    window.close();
  }
});

// Clean up on window close
window.addEventListener('beforeunload', stopWebcam);

// Start webcam when page loads
startWebcam();






