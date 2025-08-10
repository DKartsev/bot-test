import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../security/encryption';

describe('EncryptionService', () => {
  const service = new EncryptionService();

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'sensitive data';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
      expect(encrypted.encrypted).not.toBe(plaintext);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
    });

    it('should produce different encrypted values for same input', () => {
      const plaintext = 'test data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });

  describe('hashApiKey', () => {
    it('should produce consistent hash for same input', () => {
      const key = 'test-api-key';
      const hash1 = service.hashApiKey(key);
      const hash2 = service.hashApiKey(key);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = service.hashApiKey('key1');
      const hash2 = service.hashApiKey('key2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateApiKey', () => {
    it('should generate unique API keys', () => {
      const key1 = service.generateApiKey();
      const key2 = service.generateApiKey();
      
      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(40);
      expect(key2.length).toBeGreaterThan(40);
    });
  });
});