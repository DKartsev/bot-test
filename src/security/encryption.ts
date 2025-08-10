import crypto from 'crypto';
import { z } from 'zod';

const encryptionConfigSchema = z.object({
  ENCRYPTION_KEY: z.string().min(32),
  ENCRYPTION_ALGORITHM: z.string().default('aes-256-gcm'),
});

const config = encryptionConfigSchema.parse({
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
  ENCRYPTION_ALGORITHM: process.env.ENCRYPTION_ALGORITHM,
});

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export class EncryptionService {
  private readonly algorithm = config.ENCRYPTION_ALGORITHM;
  private readonly key = Buffer.from(config.ENCRYPTION_KEY, 'hex');

  encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  decrypt(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipherGCM(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  generateApiKey(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
}

export const encryptionService = new EncryptionService();