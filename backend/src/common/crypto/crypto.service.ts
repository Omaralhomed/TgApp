import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly masterKey: Buffer;

  constructor() {
    const rawKey = process.env.SESSION_ENCRYPTION_KEY || 'antigravity-tg-secret-32-bytes-key!';
    // Derive a fixed 32-byte key for AES-256-GCM using SHA-256
    this.masterKey = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Hashes passwords using Argon2id with automatic bcrypt fallback verification
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1,
      });
    } catch (err: any) {
      this.logger.warn(`Argon2 hashing fallback to bcrypt: ${err.message}`);
      return await bcrypt.hash(password, 12);
    }
  }

  /**
   * Verifies password against Argon2 or legacy Bcrypt hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!hash || !password) return false;
    try {
      if (hash.startsWith('$argon2')) {
        return await argon2.verify(hash, password);
      }
      return await bcrypt.compare(password, hash);
    } catch (err: any) {
      this.logger.error(`Password verification error: ${err.message}`);
      return false;
    }
  }

  /**
   * AES-256-GCM authenticated encryption for sensitive sessions and secrets
   * Format: iv_hex:auth_tag_hex:ciphertext_hex
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    try {
      const iv = crypto.randomBytes(16); // 128-bit IV
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err: any) {
      this.logger.error(`Encryption error: ${err.message}`);
      throw new Error('Encryption failed');
    }
  }

  /**
   * AES-256-GCM authenticated decryption (with legacy CBC fallback)
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';
    try {
      const parts = encryptedData.split(':');
      
      // Modern AES-256-GCM: iv:authTag:ciphertext
      if (parts.length === 3) {
        const [ivHex, authTagHex, cipherHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }

      // Legacy AES-256-CBC: iv:ciphertext
      if (parts.length === 2) {
        const [ivHex, cipherHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.masterKey, iv);
        let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }

      return encryptedData; // Unencrypted fallback
    } catch (err: any) {
      this.logger.warn(`Decryption fallback: ${err.message}`);
      return encryptedData;
    }
  }

  /**
   * Generates secure random tokens
   */
  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Redacts sensitive fields from objects for safe serialization
   */
  sanitizeData<T>(data: T): T {
    if (!data) return data;
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item)) as unknown as T;
    }
    if (typeof data === 'object') {
      const sanitized: any = { ...data };
      const sensitiveKeys = [
        'password',
        'passwordHash',
        'sessionString',
        'apiHash',
        'refreshToken',
        'secret',
      ];
      for (const key of sensitiveKeys) {
        if (key in sanitized) {
          delete sanitized[key];
        }
      }
      return sanitized;
    }
    return data;
  }
}
