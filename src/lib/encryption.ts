import crypto from 'crypto';
import { env } from './env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * AES-256-GCM Encryption Key Requirements:
 * - Must be exactly 32 bytes (256 bits), represented as a 64-character hex string
 * - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
 * - Set via the ENCRYPTION_KEY environment variable
 * - If missing or malformed, the module will throw at load time to prevent
 *   silent data corruption or exposure
 */

/**
 * Validates that the encryption key meets AES-256 requirements.
 * @param key - The hex-encoded encryption key string
 * @throws If the key is empty, not valid hex, or not exactly 32 bytes
 */
export function validateEncryptionKey(key: string): void {
  if (!key || key.trim().length === 0) {
    throw new Error(
      'ENCRYPTION_KEY is not set. A 32-byte hex-encoded key (64 characters) is required for AES-256-GCM encryption. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (!/^[0-9a-fA-F]+$/.test(key)) {
    throw new Error(
      `ENCRYPTION_KEY contains invalid characters. It must be a hex-encoded string (0-9, a-f). Got ${key.length} characters.`
    );
  }

  if (key.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes) for AES-256. Got ${key.length} characters.`
    );
  }
}

// Validate at module load — fail fast before any encrypt/decrypt calls
validateEncryptionKey(env.ENCRYPTION_KEY);

const KEY: Buffer = Buffer.from(env.ENCRYPTION_KEY, 'hex');

/**
 * Encrypts data using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return as iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts data encrypted with encrypt()
 * @param encryptedData - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generates a random 32-byte encryption key (for setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
