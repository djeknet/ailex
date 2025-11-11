/**
 * Simple encryption utility for API keys storage
 * Uses browser's Web Crypto API with a static key derived from extension ID
 */

// Static salt for key derivation (you can change this to a random value during build)
const ENCRYPTION_SALT = 'ailex-extension-v1';

/**
 * Derives a crypto key from the extension's identity
 */
async function getDerivedKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_SALT),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(chrome.runtime.id),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an API key
 * @param apiKey - Plain text API key
 * @returns Base64 encoded encrypted string
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    return '';
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Get derived key
    const key = await getDerivedKey();
    
    // Encrypt
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[encryption] Error encrypting API key:', error);
    // Fallback to plain text if encryption fails
    return apiKey;
  }
}

/**
 * Decrypts an API key
 * @param encryptedKey - Base64 encoded encrypted string
 * @returns Plain text API key
 */
export async function decryptApiKey(encryptedKey: string): Promise<string> {
  if (!encryptedKey || encryptedKey.trim() === '') {
    return '';
  }

  try {
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    // Get derived key
    const key = await getDerivedKey();
    
    // Decrypt
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('[encryption] Error decrypting API key:', error);
    // If decryption fails, assume it's plain text (backward compatibility)
    return encryptedKey;
  }
}

/**
 * Checks if a string is encrypted (base64 format with sufficient length)
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.trim() === '') {
    return false;
  }
  
  try {
    // Check if it's valid base64 and has minimum length for encrypted data
    const decoded = atob(value);
    return decoded.length >= 12; // IV is 12 bytes minimum
  } catch {
    return false;
  }
}

