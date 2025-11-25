/**
 * Encryption Utilities for Tele Post
 *
 * Provides client-side encryption for sensitive data
 * Note: For production, consider using server-side encryption with proper key management
 */

/**
 * Encrypt data using AES-GCM
 * @param data - Data to encrypt
 * @param masterKey - Master encryption key (should be derived from user password or stored securely)
 * @returns Encrypted data as base64 string with IV prepended
 */
export const encryptData = async (data: string, masterKey: string): Promise<string> => {
  try {
    // Derive key from master key
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(masterKey),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Use a fixed salt for consistency (in production, use unique salt per user)
    const salt = encoder.encode('tele-post-salt-v1');

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoder.encode(data)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data using AES-GCM
 * @param encryptedData - Base64 encrypted data with IV prepended
 * @param masterKey - Master encryption key
 * @returns Decrypted data as string
 */
export const decryptData = async (encryptedData: string, masterKey: string): Promise<string> => {
  try {
    // Derive key from master key
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(masterKey),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = encoder.encode('tele-post-salt-v1');

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Generate a secure encryption key
 * @param length - Length of the key in bytes (default: 32 for 256-bit)
 * @returns Base64 encoded key
 */
export const generateEncryptionKey = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

/**
 * Hash sensitive data for storage (one-way)
 * Useful for API keys, tokens that need to be verified but not retrieved
 */
export const hashSensitiveData = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Mask sensitive string (e.g., API keys, tokens)
 * Shows only first and last few characters
 */
export const maskSensitiveString = (str: string, visibleChars: number = 4): string => {
  if (!str || str.length <= visibleChars * 2) {
    return '****';
  }

  const start = str.substring(0, visibleChars);
  const end = str.substring(str.length - visibleChars);
  const maskedLength = str.length - (visibleChars * 2);

  return `${start}${'*'.repeat(Math.min(maskedLength, 10))}${end}`;
};

/**
 * Securely store encrypted data in localStorage
 */
export const secureStore = async (key: string, data: string, encryptionKey: string): Promise<void> => {
  try {
    const encrypted = await encryptData(data, encryptionKey);
    localStorage.setItem(`secure_${key}`, encrypted);
  } catch (error) {
    console.error('Secure storage failed:', error);
    throw new Error('Failed to securely store data');
  }
};

/**
 * Retrieve and decrypt data from localStorage
 */
export const secureRetrieve = async (key: string, encryptionKey: string): Promise<string | null> => {
  try {
    const encrypted = localStorage.getItem(`secure_${key}`);
    if (!encrypted) {
      return null;
    }

    return await decryptData(encrypted, encryptionKey);
  } catch (error) {
    console.error('Secure retrieval failed:', error);
    return null;
  }
};

/**
 * Remove securely stored data
 */
export const secureRemove = (key: string): void => {
  localStorage.removeItem(`secure_${key}`);
};

/**
 * Validate encrypted data format
 */
export const isValidEncryptedFormat = (data: string): boolean => {
  try {
    // Check if it's valid base64
    const decoded = atob(data);
    // Check if it has minimum length (IV + some encrypted data)
    return decoded.length >= 12;
  } catch {
    return false;
  }
};

/**
 * Create a fingerprint of sensitive data for comparison without storing the actual data
 */
export const createFingerprint = async (data: string, salt: string = ''): Promise<string> => {
  const encoder = new TextEncoder();
  const combined = encoder.encode(data + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Rotate encryption - decrypt with old key and re-encrypt with new key
 */
export const rotateEncryption = async (
  encryptedData: string,
  oldKey: string,
  newKey: string
): Promise<string> => {
  const decrypted = await decryptData(encryptedData, oldKey);
  return await encryptData(decrypted, newKey);
};

/**
 * Generate a secure session token
 */
export const generateSessionToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Obfuscate sensitive log data
 * Useful for logging without exposing secrets
 */
export const obfuscateForLog = (data: unknown): unknown => {
  if (typeof data === 'string') {
    // If it looks like a token or key, mask it
    if (data.length > 20) {
      return maskSensitiveString(data, 3);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(obfuscateForLog);
  }

  if (typeof data === 'object' && data !== null) {
    const obfuscated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Mask fields that commonly contain sensitive data
      const sensitiveFields = [
        'password',
        'token',
        'secret',
        'key',
        'api_key',
        'apikey',
        'auth',
        'authorization',
        'telegram_bot_token',
        'bot_token',
      ];

      const isSensitive = sensitiveFields.some(field =>
        key.toLowerCase().includes(field)
      );

      if (isSensitive && typeof value === 'string') {
        obfuscated[key] = maskSensitiveString(value, 3);
      } else {
        obfuscated[key] = obfuscateForLog(value);
      }
    }
    return obfuscated;
  }

  return data;
};
