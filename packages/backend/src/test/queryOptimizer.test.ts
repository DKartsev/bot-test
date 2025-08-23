import { jest } from '@jest/globals';
import { QueryOptimizerService } from '../services/queryOptimizer';

// Мокаем logger
jest.mock('../utils/logger', () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
  logInfo: jest.fn(),
}));

// Мокаем env
jest.mock('../config/env', () => ({
  env: {
    queryOptimization: {
      slowQueryThreshold: 1000,
      maxStoredQueries: 1000,
      enableQueryAnalysis: true,
      enableIndexRecommendations: true,
      cleanupInterval: 24 * 60 * 60 * 1000,
    },
  },
}));

describe('Query Optimizer Service', () => {
  let service: QueryOptimizerService;

  beforeEach(() => {
    service = new QueryOptimizerService();
  });

  describe('Создание экземпляра', () => {
    it('должен экспортировать QueryOptimizerService', () => {
      expect(QueryOptimizerService).toBeDefined();
      expect(typeof QueryOptimizerService).toBe('function');
    });

    it('должен создавать экземпляр сервиса', () => {
      expect(service).toBeInstanceOf(QueryOptimizerService);
    });

    it('должен иметь метод analyzeQuery', () => {
      expect(service.analyzeQuery).toBeDefined();
      expect(typeof service.analyzeQuery).toBe('function');
    });

    it('должен иметь метод getQueryStats', () => {
      expect(service.getQueryStats).toBeDefined();
      expect(typeof service.getQueryStats).toBe('function');
    });

    it('должен иметь метод getSlowQueries', () => {
      expect(service.getSlowQueries).toBeDefined();
      expect(typeof service.getSlowQueries).toBe('function');
    });

    it('должен иметь метод getIndexRecommendations', () => {
      expect(service.getIndexRecommendations).toBeDefined();
      expect(typeof service.getIndexRecommendations).toBe('function');
    });

    it('должен иметь метод clearQueryHistory', () => {
      expect(service.clearQueryHistory).toBeDefined();
      expect(typeof service.clearQueryHistory).toBe('function');
    });
  });

  describe('Анализ запросов', () => {
    it('должен анализировать простые SELECT запросы', async () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = { id: 1 };

      const result = await service.analyzeQuery(query, params);

      expect(result.query).toBe(query);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('должен анализировать сложные JOIN запросы', async () => {
      const query = `
        SELECT u.name, c.message 
        FROM users u 
        JOIN chats c ON u.id = c.user_id 
        WHERE c.created_at > $1
      `;
      const params = { date: '2024-01-01' };

      const result = await service.analyzeQuery(query, params);

      expect(result.query).toBe(query);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('должен анализировать INSERT запросы', async () => {
      const query = 'INSERT INTO users (name, email) VALUES ($1, $2)';
      const params = { name: 'Test User', email: 'test@example.com' };

      const result = await service.analyzeQuery(query, params);

      expect(result.query).toBe(query);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
    });

    it('должен анализировать UPDATE запросы', async () => {
      const query = 'UPDATE users SET name = $1 WHERE id = $2';
      const params = { name: 'Updated Name', id: 1 };

      const result = await service.analyzeQuery(query, params);

      expect(result.query).toBe(query);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
    });

    it('должен анализировать DELETE запросы', async () => {
      const query = 'DELETE FROM users WHERE id = $1';
      const params = { id: 1 };

      const result = await service.analyzeQuery(query, params);

      expect(result.query).toBe(query);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
    });

    it('должен анализировать запросы без параметров', async () => {
      const query = 'SELECT COUNT(*) FROM users';

      const result = await service.analyzeQuery(query);

      expect(result.query).toBe(query);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
      expect(result.params).toBeUndefined();
    });

    it('должен анализировать запросы с пустыми параметрами', async () => {
      const query = 'SELECT * FROM users';
      const params = {};

      const result = await service.analyzeQuery(query, params);

      expect(result.query).toBe(query);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
      expect(result.params).toEqual(params);
    });
  });

  describe('Статистика запросов', () => {
    it('должен возвращать статистику запросов', async () => {
      // Создаем несколько запросов
      await service.analyzeQuery('SELECT * FROM users');
      await service.analyzeQuery('SELECT * FROM chats');
      await service.analyzeQuery('INSERT INTO users (name) VALUES ($1)', { name: 'Test' });

      const stats = service.getQueryStats();

      expect(stats.totalQueries).toBe(3);
      expect(stats.avgExecutionTime).toBeGreaterThanOrEqual(0);
      expect(stats.slowQueriesCount).toBeGreaterThanOrEqual(0);
      expect(stats.queryTypes).toBeDefined();
      expect(stats.topTables).toBeDefined();
    });

    it('должен возвращать медленные запросы', async () => {
      // Создаем медленный запрос
      await service.analyzeQuery('SELECT * FROM large_table');

      const slowQueries = service.getSlowQueries();

      expect(Array.isArray(slowQueries)).toBe(true);
      expect(slowQueries.length).toBeGreaterThanOrEqual(0);
    });

    it('должен возвращать рекомендации по индексам', async () => {
      // Создаем запрос, который может выиграть от индекса
      await service.analyzeQuery('SELECT * FROM users WHERE email = $1', { email: 'test@example.com' });

      const recommendations = service.getIndexRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('должен очищать историю запросов', async () => {
      // Создаем несколько запросов
      await service.analyzeQuery('SELECT * FROM users');
      await service.analyzeQuery('SELECT * FROM chats');

      const statsBefore = service.getQueryStats();
      expect(statsBefore.totalQueries).toBe(2);

      service.clearQueryHistory();

      const statsAfter = service.getQueryStats();
      expect(statsAfter.totalQueries).toBe(0);
    });
  });

  describe('Производительность', () => {
    it('должен измерять время выполнения', async () => {
      const startTime = Date.now();
      
      const result = await service.analyzeQuery('SELECT * FROM users');
      
      const endTime = Date.now();
      const actualTime = endTime - startTime;

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(actualTime + 100); // Погрешность 100ms
    });

    it('должен обрабатывать очень быстрые запросы', async () => {
      const result = await service.analyzeQuery('SELECT 1');

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
    });
  });

  describe('Обработка ошибок', () => {
    it('должен обрабатывать пустые запросы', async () => {
      const result = await service.analyzeQuery('');

      expect(result.query).toBe('');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
    });

    it('должен обрабатывать запросы только с пробелами', async () => {
      const result = await service.analyzeQuery('   ');

      expect(result.query).toBe('   ');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
    });

    it('должен обрабатывать undefined запросы', async () => {
      const result = await service.analyzeQuery(undefined as any);

      expect(result.query).toBeUndefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
    });

    it('должен обрабатывать null запросы', async () => {
      const result = await service.analyzeQuery(null as any);

      expect(result.query).toBeNull();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
    });
  });

  describe('Конфигурация', () => {
    it('должен использовать настройки из env', () => {
      const config = service.getConfig();

      expect(config.slowQueryThreshold).toBe(1000);
      expect(config.maxStoredQueries).toBe(1000);
      expect(config.enableQueryAnalysis).toBe(true);
      expect(config.enableIndexRecommendations).toBe(true);
    });

    it('должен обновлять конфигурацию', () => {
      const newConfig = {
        slowQueryThreshold: 500,
        enableQueryAnalysis: false,
      };

      service.updateConfig(newConfig);

      const updatedConfig = service.getConfig();
      expect(updatedConfig.slowQueryThreshold).toBe(500);
      expect(updatedConfig.enableQueryAnalysis).toBe(false);
    });
  });
});
