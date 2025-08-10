import { promises as fs } from 'fs';
import { logger } from './logger';

/**
 * Async wrapper for file operations to prevent blocking the event loop
 */
export class AsyncFileOperations {
  static async readJSON<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      logger.error({ error, filePath }, 'Failed to read JSON file');
      throw error;
    }
  }

  static async writeJSON(filePath: string, data: any): Promise<void> {
    try {
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
      await fs.rename(tempPath, filePath);
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to write JSON file');
      throw error;
    }
  }

  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error({ error, dirPath }, 'Failed to ensure directory');
      throw error;
    }
  }

  static async appendLine(filePath: string, line: string): Promise<void> {
    try {
      await fs.appendFile(filePath, line + '\n');
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to append line');
      throw error;
    }
  }
}

/**
 * Retry mechanism for unreliable operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        logger.error({ error, attempt }, 'Operation failed after all retries');
        throw lastError;
      }

      logger.warn({ error, attempt, maxAttempts }, 'Operation failed, retrying');
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError!;
}

/**
 * Debounce function for high-frequency operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
}

/**
 * Throttle function for rate-limited operations
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limitMs) {
      lastCall = now;
      func(...args);
    }
  };
}