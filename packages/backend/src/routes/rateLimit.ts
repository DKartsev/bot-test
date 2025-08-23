import express from 'express';
import { requireOperator } from '../middleware/auth';
import { rateLimiterService } from '../services/rateLimiter';
import { logError, logInfo, logWarning } from '../utils/logger';

const router = express.Router();

// Helper функция для обертывания async handlers
const asyncHandler = (fn: (req: express.Request, res: express.Response) => Promise<void>) => 
  (req: express.Request, res: express.Response) => { void fn(req, res); };

/**
 * Получение статистики rate limiting
 */
router.get('/stats', requireOperator, asyncHandler(async (req, res) => {
  try {
    const configName = req.query.config as string;
    
    if (configName) {
      const stats = rateLimiterService.getStats(configName);
      if (!stats) {
        res.status(404).json({
          error: 'Конфигурация не найдена',
          code: 'CONFIG_NOT_FOUND',
        });
        return;
      }
      
      res.json({
        success: true,
        data: {
          configName,
          stats,
        },
      });
    } else {
      const allStats = rateLimiterService.getAllStats();
      res.json({
        success: true,
        data: allStats,
      });
    }
  } catch (error) {
    logError('Ошибка получения статистики rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
      configName: req.query.config,
    });
    res.status(500).json({ error: 'Не удалось получить статистику' });
  }
}));

/**
 * Получение текущих конфигураций rate limiting
 */
router.get('/configs', requireOperator, asyncHandler(async (req, res) => {
  try {
    const configs = rateLimiterService.getCurrentLimits();
    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    logError('Ошибка получения конфигураций rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось получить конфигурации' });
  }
}));

/**
 * Получение конфигурации по имени
 */
router.get('/config/:name', requireOperator, asyncHandler(async (req, res) => {
  try {
    const configName = req.params.name;
    const config = rateLimiterService.getConfig(configName);
    
    if (!config) {
      res.status(404).json({
        error: 'Конфигурация не найдена',
        code: 'CONFIG_NOT_FOUND',
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        name: configName,
        config,
      },
    });
  } catch (error) {
    logError('Ошибка получения конфигурации rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
      configName: req.params.name,
    });
    res.status(500).json({ error: 'Не удалось получить конфигурацию' });
  }
}));

/**
 * Добавление новой конфигурации
 */
router.post('/config', requireOperator, asyncHandler(async (req, res) => {
  try {
    const { name, config } = req.body;
    
    if (!name || !config) {
      res.status(400).json({
        error: 'Необходимо указать имя и конфигурацию',
        code: 'MISSING_PARAMETERS',
      });
      return;
    }
    
    // Проверяем обязательные поля
    if (!config.windowMs || !config.maxRequests) {
      res.status(400).json({
        error: 'Необходимо указать windowMs и maxRequests',
        code: 'INVALID_CONFIG',
      });
      return;
    }
    
    // Проверяем, что конфигурация с таким именем не существует
    const existingConfig = rateLimiterService.getConfig(name);
    if (existingConfig) {
      res.status(409).json({
        error: 'Конфигурация с таким именем уже существует',
        code: 'CONFIG_EXISTS',
      });
      return;
    }
    
    rateLimiterService.addConfig(name, config);
    
    logInfo('Добавлена новая конфигурация rate limiting', {
      name,
      config,
      operator: (req as any).operator?.id,
    });
    
    res.status(201).json({
      success: true,
      message: 'Конфигурация успешно добавлена',
      data: {
        name,
        config,
      },
    });
  } catch (error) {
    logError('Ошибка добавления конфигурации rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });
    res.status(500).json({ error: 'Не удалось добавить конфигурацию' });
  }
}));

/**
 * Обновление существующей конфигурации
 */
router.put('/config/:name', requireOperator, asyncHandler(async (req, res) => {
  try {
    const configName = req.params.name;
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      res.status(400).json({
        error: 'Необходимо указать параметры для обновления',
        code: 'MISSING_UPDATES',
      });
      return;
    }
    
    // Проверяем, что конфигурация существует
    const existingConfig = rateLimiterService.getConfig(configName);
    if (!existingConfig) {
      res.status(404).json({
        error: 'Конфигурация не найдена',
        code: 'CONFIG_NOT_FOUND',
      });
      return;
    }
    
    // Обновляем конфигурацию
    const success = rateLimiterService.updateConfig(configName, updates);
    
    if (!success) {
      res.status(500).json({
        error: 'Не удалось обновить конфигурацию',
        code: 'UPDATE_FAILED',
      });
      return;
    }
    
    logInfo('Обновлена конфигурация rate limiting', {
      name: configName,
      updates,
      operator: (req as any).operator?.id,
    });
    
    res.json({
      success: true,
      message: 'Конфигурация успешно обновлена',
      data: {
        name: configName,
        updates,
      },
    });
  } catch (error) {
    logError('Ошибка обновления конфигурации rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
      configName: req.params.name,
      updates: req.body,
    });
    res.status(500).json({ error: 'Не удалось обновить конфигурацию' });
  }
}));

/**
 * Удаление конфигурации
 */
router.delete('/config/:name', requireOperator, asyncHandler(async (req, res) => {
  try {
    const configName = req.params.name;
    
    // Проверяем, что конфигурация существует
    const existingConfig = rateLimiterService.getConfig(configName);
    if (!existingConfig) {
      res.status(404).json({
        error: 'Конфигурация не найдена',
        code: 'CONFIG_NOT_FOUND',
      });
      return;
    }
    
    // Проверяем, что это не системная конфигурация
    const systemConfigs = ['global', 'auth', 'fileUpload', 'search', 'websocket'];
    if (systemConfigs.includes(configName)) {
      res.status(403).json({
        error: 'Нельзя удалить системную конфигурацию',
        code: 'SYSTEM_CONFIG',
      });
      return;
    }
    
    // Удаляем конфигурацию
    const success = rateLimiterService.removeConfig(configName);
    
    if (!success) {
      res.status(500).json({
        error: 'Не удалось удалить конфигурацию',
        code: 'DELETE_FAILED',
      });
      return;
    }
    
    logInfo('Удалена конфигурация rate limiting', {
      name: configName,
      operator: (req as any).operator?.id,
    });
    
    res.json({
      success: true,
      message: 'Конфигурация успешно удалена',
      data: {
        name: configName,
      },
    });
  } catch (error) {
    logError('Ошибка удаления конфигурации rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
      configName: req.params.name,
    });
    res.status(500).json({ error: 'Не удалось удалить конфигурацию' });
  }
}));

/**
 * Сброс статистики
 */
router.post('/stats/reset', requireOperator, asyncHandler(async (req, res) => {
  try {
    const { configName } = req.body;
    
    if (configName) {
      // Сбрасываем статистику для конкретной конфигурации
      const config = rateLimiterService.getConfig(configName);
      if (!config) {
        res.status(404).json({
          error: 'Конфигурация не найдена',
          code: 'CONFIG_NOT_FOUND',
        });
        return;
      }
      
      rateLimiterService.resetStats(configName);
      
      logInfo('Сброшена статистика rate limiting', {
        configName,
        operator: (req as any).operator?.id,
      });
      
      res.json({
        success: true,
        message: `Статистика для конфигурации '${configName}' сброшена`,
        data: {
          configName,
        },
      });
    } else {
      // Сбрасываем всю статистику
      rateLimiterService.resetStats();
      
      logInfo('Сброшена вся статистика rate limiting', {
        operator: (req as any).operator?.id,
      });
      
      res.json({
        success: true,
        message: 'Вся статистика rate limiting сброшена',
      });
    }
  } catch (error) {
    logError('Ошибка сброса статистики rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });
    res.status(500).json({ error: 'Не удалось сбросить статистику' });
  }
}));

/**
 * Получение информации о текущем состоянии rate limiting для IP
 */
router.get('/status/:ip', requireOperator, asyncHandler(async (req, res) => {
  try {
    const ip = req.params.ip;
    
    if (!ip || ip === 'unknown') {
      res.status(400).json({
        error: 'Недействительный IP адрес',
        code: 'INVALID_IP',
      });
      return;
    }
    
    // Получаем все конфигурации
    const configs = rateLimiterService.getCurrentLimits();
    const status: Record<string, any> = {};
    
    // Для каждой конфигурации проверяем статус IP
    for (const [configName, config] of Object.entries(configs)) {
      try {
        // Здесь можно добавить логику для получения текущего статуса IP
        // Пока возвращаем базовую информацию
        status[configName] = {
          limit: config.maxRequests,
          windowMs: config.windowMs,
          message: config.message,
        };
      } catch (error) {
        logWarning('Ошибка получения статуса для конфигурации', {
          configName,
          ip,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        status[configName] = {
          error: 'Не удалось получить статус',
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        ip,
        status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logError('Ошибка получения статуса rate limiting для IP', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.params.ip,
    });
    res.status(500).json({ error: 'Не удалось получить статус' });
  }
}));

/**
 * Тестирование rate limiting
 */
router.post('/test', requireOperator, asyncHandler(async (req, res) => {
  try {
    const { configName, testKey } = req.body;
    
    if (!configName || !testKey) {
      res.status(400).json({
        error: 'Необходимо указать configName и testKey',
        code: 'MISSING_PARAMETERS',
      });
      return;
    }
    
    // Проверяем, что конфигурация существует
    const config = rateLimiterService.getConfig(configName);
    if (!config) {
      res.status(404).json({
        error: 'Конфигурация не найдена',
        code: 'CONFIG_NOT_FOUND',
      });
      return;
    }
    
    // Создаем тестовый middleware
    const testMiddleware = rateLimiterService.createMiddleware(configName);
    
    // Создаем mock request и response для тестирования
    const mockReq = {
      ip: testKey,
      url: '/test',
      method: 'POST',
    } as any;
    
    const mockRes = {
      status: (code: number) => mockRes,
      json: (data: any) => mockRes,
      set: (key: string, value: string) => mockRes,
      headersSent: false,
    } as any;
    
    let middlewareCalled = false;
    let nextCalled = false;
    
    const mockNext = () => {
      nextCalled = true;
    };
    
    // Вызываем middleware
    testMiddleware(mockReq, mockRes, mockNext);
    
    // Ждем немного для асинхронных операций
    setTimeout(() => {
      res.json({
        success: true,
        data: {
          configName,
          testKey,
          middlewareCalled,
          nextCalled,
          config,
        },
      });
    }, 100);
    
  } catch (error) {
    logError('Ошибка тестирования rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });
    res.status(500).json({ error: 'Не удалось протестировать rate limiting' });
  }
}));

export default router;
