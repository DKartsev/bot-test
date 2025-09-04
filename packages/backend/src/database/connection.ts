import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { Pool } from 'pg';
import { logError, logInfo } from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Интерфейс для подключения к базе данных
export interface DatabaseConnection {
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  getClient(): Promise<PoolClient>;
  close(): Promise<void>;
  isConnected(): boolean;
}

// Класс подключения к PostgreSQL
export class PostgreSQLConnection implements DatabaseConnection {
  private pool: Pool;
  private isConnectedFlag: boolean = false;

  constructor() {
    // Получаем параметры подключения из переменных окружения
    const connectionString = process.env.DATABASE_URL ||
      `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'support_db'}`;

    this.pool = new Pool({
      connectionString,
      max: 20, // максимальное количество соединений в пуле
      idleTimeoutMillis: 30000, // время простоя соединения
      connectionTimeoutMillis: 2000, // время ожидания соединения
      ssl: process.env.DATABASE_URL?.includes('supabase.com') ? { rejectUnauthorized: false } : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false),
    });

    // Обработчики событий пула
    this.pool.on('connect', (_client) => {
      logInfo('Новое подключение к базе данных', {
        database: process.env.DB_NAME || 'support_db',
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
      });
    });

    this.pool.on('error', (err) => {
      logError('Ошибка пула подключений к базе данных', {
        error: err.message,
        code: (err as any).code || 'UNKNOWN_ERROR',
      });
      this.isConnectedFlag = false;
    });

    // Проверяем подключение при инициализации
    // Используем setTimeout чтобы не блокировать основной поток
    setTimeout(() => {
      void this.testConnection().catch(error => {
        logError('Критическая ошибка при тестировании подключения к БД', {
          error: error instanceof Error ? error.message : 'Unknown error',
          note: 'Сервер продолжит работу без БД'
        });
      });
    }, 1000);
  }

  // Тестирование подключения
  private async testConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      this.isConnectedFlag = true;
      logInfo('Подключение к базе данных установлено', {
        timestamp: result.rows[0].now,
        database: process.env.DB_NAME || 'support_db',
      });
    } catch (error) {
      logError('Ошибка подключения к базе данных', {
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionString: process.env.DATABASE_URL ? 'DATABASE_URL' : 'individual params',
        note: 'Сервер продолжит работу без БД'
      });
      this.isConnectedFlag = false;
      // НЕ выбрасываем ошибку - сервер должен продолжать работать
    }
  }

  // Выполнение запроса
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      // Логируем медленные запросы (>100ms)
      if (duration > 100) {
        logInfo('Медленный SQL запрос', {
          query: `${text.substring(0, 100)}...`,
          duration: `${duration}ms`,
          rowCount: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      logError('Ошибка выполнения SQL запроса', {
        query: text,
        params,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Получение клиента для транзакций
  async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      logError('Ошибка получения клиента базы данных', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Закрытие всех соединений
  async close(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnectedFlag = false;
      logInfo('Все соединения с базой данных закрыты');
    } catch (error) {
      logError('Ошибка закрытия соединений с базой данных', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Проверка статуса подключения
  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  // Получение статистики пула
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Создаем и экспортируем экземпляр подключения
export const db = new PostgreSQLConnection();

// Graceful shutdown для базы данных
process.on('SIGINT', async () => {
  logInfo('Получен SIGINT, закрываем соединения с базой данных...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logInfo('Получен SIGTERM, закрываем соединения с базой данных...');
  await db.close();
  process.exit(0);
});

export default db;
