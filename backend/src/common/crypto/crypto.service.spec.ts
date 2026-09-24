import { CryptoService } from './crypto.service';
import * as crypto from 'crypto';

describe('CryptoService', () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
  });

  describe('Password Hashing (Argon2id)', () => {
    it('should hash a password and return a valid argon2id string', async () => {
      const password = 'SuperSecurePassword!2026';
      const hash = await cryptoService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toContain('$argon2');
    });

    it('should verify correct password against generated hash', async () => {
      const password = 'CorrectPassword@123';
      const hash = await cryptoService.hashPassword(password);
      const isValid = await cryptoService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword@123';
      const wrongPassword = 'WrongPassword@123';
      const hash = await cryptoService.hashPassword(password);
      const isValid = await cryptoService.verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });
  });

  describe('AES-256-GCM Authenticated Encryption', () => {
    it('should encrypt and decrypt plaintext accurately', () => {
      const sensitiveSession = '1B0AAAEAAAAcAAAA...long-telegram-session-data...';
      const encrypted = cryptoService.encrypt(sensitiveSession);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toEqual(sensitiveSession);
      
      // Should have iv:authTag:ciphertext structure
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);

      const decrypted = cryptoService.decrypt(encrypted);
      expect(decrypted).toBe(sensitiveSession);
    });

    it('should handle empty or null strings gracefully', () => {
      expect(cryptoService.encrypt('')).toBe('');
      expect(cryptoService.decrypt('')).toBe('');
    });

    it('should support legacy AES-256-CBC decryption fallback', () => {
      const rawKey = process.env.SESSION_ENCRYPTION_KEY || 'antigravity-tg-secret-32-bytes-key!';
      const masterKey = crypto.createHash('sha256').update(rawKey).digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', masterKey, iv);
      const secret = 'legacy-session-data';
      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const legacyFormat = `${iv.toString('hex')}:${encrypted}`;

      const decrypted = cryptoService.decrypt(legacyFormat);
      expect(decrypted).toBe(secret);
    });
  });
});
