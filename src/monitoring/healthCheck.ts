import { db } from '../database/connection';
import { logger } from '../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: boolean;
    memory: boolean;
    disk: boolean;
  };
  details?: {
    memoryUsage: NodeJS.MemoryUsage;
    loadAverage: number[];
  };
}

export class HealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    
    const checks = {
      database: await this.checkDatabase(),
      memory: this.checkMemory(),
      disk: await this.checkDisk(),
    };

    const allHealthy = Object.values(checks).every(Boolean);
    const status: HealthStatus['status'] = allHealthy ? 'healthy' : 'unhealthy';

    const result: HealthStatus = {
      status,
      timestamp,
      uptime,
      checks,
    };

    if (status !== 'healthy') {
      result.details = {
        memoryUsage: process.memoryUsage(),
        loadAverage: require('os').loadavg(),
      };
    }

    return result;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      return await db.healthCheck();
    } catch (error) {
      logger.error({ error }, 'Database health check failed');
      return false;
    }
  }

  private checkMemory(): boolean {
    const usage = process.memoryUsage();
    const maxHeapMB = 512; // 512MB threshold
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > maxHeapMB) {
      logger.warn({ heapUsedMB, maxHeapMB }, 'High memory usage detected');
      return false;
    }
    
    return true;
  }

  private async checkDisk(): Promise<boolean> {
    try {
      const { promises: fs } = require('fs');
      const stats = await fs.statfs('./data');
      const freeSpaceGB = (stats.bavail * stats.bsize) / (1024 ** 3);
      
      if (freeSpaceGB < 1) { // Less than 1GB free
        logger.warn({ freeSpaceGB }, 'Low disk space detected');
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error({ error }, 'Disk check failed');
      return false;
    }
  }
}

export const healthChecker = new HealthChecker();