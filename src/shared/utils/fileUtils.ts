export function createFileDownload(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function generateFilename(prefix: string, extension: string): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '_');
  const domain = window.location.hostname.replace(/\./g, '_');
  
  return `${domain}-${prefix}-${dateStr}.${extension}`;
}

// Read file as base64 string
export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Read text file content
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Check if file is a text file based on extension
export function isTextFile(filename: string): boolean {
  const textExtensions = [
    'txt', 'md', 'json', 'xml', 'csv', 'html', 'htm', 'css', 'js', 'ts', 
    'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 
    'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh', 'bash', 'yml', 'yaml',
    'toml', 'ini', 'conf', 'log', 'sql', 'r', 'tex', 'rtf'
  ];
  
  const ext = getFileExtension(filename);
  return textExtensions.includes(ext);
}

// Validate file size
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

// Get file extension
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

