let recognition = null;
let isRecording = false;
let finalTranscript = '';

const microphoneIcon = document.getElementById('microphone-icon');
const statusText = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const errorDiv = document.getElementById('error');
const startBtn = document.getElementById('start-btn');
const doneBtn = document.getElementById('done-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Apply theme
function applyTheme() {
  chrome.storage.local.get(['theme'], (result) => {
    const theme = result.theme || 'system';
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
  });
}

// Initialize Speech Recognition
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    showError('Speech Recognition API is not supported in your browser. Please use Chrome or Edge.');
    startBtn.disabled = true;
    return null;
  }
  
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || 'en-US';
  
  recognition.onstart = () => {
    console.log('Speech recognition started');
    isRecording = true;
    microphoneIcon.classList.add('active');
    statusText.textContent = 'Listening...';
    startBtn.innerHTML = `
      <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"/>
      </svg>
      Stop
    `;
    startBtn.classList.add('active');
    doneBtn.disabled = false;
  };
  
  recognition.onresult = (event) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    
    const displayText = finalTranscript + interimTranscript;
    if (displayText.trim()) {
      transcriptDiv.textContent = displayText;
      transcriptDiv.classList.remove('empty');
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    
    if (event.error === 'not-allowed') {
      showError('Microphone access denied. Please allow microphone access and try again.');
    } else if (event.error === 'no-speech') {
      showError('No speech detected. Please try again.');
    } else if (event.error === 'network') {
      showError('Network error. Please check your internet connection.');
    } else {
      showError(`Error: ${event.error}`);
    }
    
    stopRecording();
  };
  
  recognition.onend = () => {
    if (isRecording) {
      // Auto-restart if still in recording mode
      try {
        recognition.start();
      } catch (error) {
        console.warn('Failed to restart recognition:', error);
        stopRecording();
      }
    }
  };
  
  return recognition;
}

function startRecording() {
  if (!recognition) {
    recognition = initSpeechRecognition();
    if (!recognition) return;
  }
  
  try {
    recognition.start();
    hideError();
  } catch (error) {
    console.error('Failed to start recognition:', error);
    showError('Failed to start speech recognition. Please try again.');
  }
}

function stopRecording() {
  if (recognition && isRecording) {
    isRecording = false;
    recognition.stop();
    microphoneIcon.classList.remove('active');
    statusText.textContent = finalTranscript.trim() ? 'Recording stopped' : 'Click Start to begin';
    startBtn.innerHTML = `
      <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
      </svg>
      Start
    `;
    startBtn.classList.remove('active');
  }
}

function sendTranscript() {
  const text = finalTranscript.trim();
  
  if (!text) {
    showError('No text to send. Please record something first.');
    return;
  }
  
  // Stop recording and remove animation
  if (isRecording) {
    stopRecording();
  }
  
  // Send transcript to the extension
  chrome.runtime.sendMessage({
    type: 'VOICE_INPUT_CAPTURED',
    data: { text }
  });
  
  // Close the window after a short delay
  setTimeout(() => {
    window.close();
  }, 100);
}

function closeWindow() {
  // Stop recording before closing
  if (isRecording) {
    stopRecording();
  }
  
  // Notify extension that voice input was cancelled
  chrome.runtime.sendMessage({
    type: 'VOICE_INPUT_CANCELLED'
  });
  
  window.close();
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function hideError() {
  errorDiv.style.display = 'none';
}

// Event listeners
startBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

doneBtn.addEventListener('click', sendTranscript);

cancelBtn.addEventListener('click', closeWindow);

// Handle Esc key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeWindow();
  }
});

// Clean up on window close
window.addEventListener('beforeunload', () => {
  if (isRecording) {
    stopRecording();
  }
});

// Initialize on load
window.addEventListener('load', () => {
  applyTheme();
  recognition = initSpeechRecognition();
  
  // Auto-start recording
  if (recognition) {
    setTimeout(() => {
      startRecording();
    }, 500); // Small delay to ensure everything is initialized
  }
});

