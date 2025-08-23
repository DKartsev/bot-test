import { jest } from '@jest/globals';
import { ErrorHandlerService, ErrorType, ErrorCode } from '../services/errorHandler';

// Мокаем logger
jest.mock('../utils/logger', () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
  logInfo: jest.fn(),
}));

// Мокаем env
jest.mock('../config/env', () => ({
  env: {
    errorHandling: {
      maxErrorDetailsLength: 1000,
      errorSamplingRate: 1.0,
    },
    isDevelopment: true,
    NODE_ENV: 'development',
  },
}));

describe('Error Handler Service', () => {
  let service: ErrorHandlerService;
  let mockRequest: any;

  beforeEach(() => {
    service = new ErrorHandlerService();
    mockRequest = {
      id: 'req-123',
      user: { id: 1 },
      operator: { id: 2 },
      path: '/api/test',
      method: 'POST',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
  });

  describe('Создание экземпляра', () => {
    it('должен экспортировать ErrorHandlerService', () => {
      expect(ErrorHandlerService).toBeDefined();
      expect(typeof ErrorHandlerService).toBe('function');
    });

    it('должен создавать экземпляр сервиса', () => {
      expect(service).toBeInstanceOf(ErrorHandlerService);
    });

    it('должен иметь метод createError', () => {
      expect(service.createError).toBeDefined();
      expect(typeof service.createError).toBe('function');
    });

    it('должен иметь метод getErrorStats', () => {
      expect(service.getErrorStats).toBeDefined();
      expect(typeof service.getErrorStats).toBe('function');
    });

    it('должен иметь метод createValidationError', () => {
      expect(service.createValidationError).toBeDefined();
      expect(typeof service.createValidationError).toBe('function');
    });

    it('должен иметь метод createAuthError', () => {
      expect(service.createAuthError).toBeDefined();
      expect(typeof service.createAuthError).toBe('function');
    });
  });

  describe('Создание ошибок', () => {
    it('должен корректно обрабатывать ошибки', () => {
      const error = service.createError(
        ErrorType.VALIDATION,
        ErrorCode.INVALID_INPUT,
        'Тестовая ошибка',
        { field: 'test' },
        mockRequest
      );

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.message).toBe('Тестовая ошибка');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.requestId).toBe('req-123');
      expect(error.userId).toBe(1);
      expect(error.operatorId).toBe(2);
      expect(error.path).toBe('/api/test');
      expect(error.method).toBe('POST');
      expect(error.ip).toBe('127.0.0.1');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('должен корректно обрабатывать ошибки с контекстом', () => {
      const error = service.createError(
        ErrorType.DATABASE,
        ErrorCode.DATABASE_CONNECTION_ERROR,
        'Ошибка БД',
        { table: 'users' },
        mockRequest
      );

      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.code).toBe(ErrorCode.DATABASE_CONNECTION_ERROR);
      expect(error.details).toEqual({ table: 'users' });
    });

    it('должен создавать ошибки валидации', () => {
      const error = service.createValidationError(
        'email',
        'invalid-email',
        'Должен быть валидный email',
        mockRequest
      );

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.message).toContain('email');
      expect(error.details?.field).toBe('email');
      expect(error.details?.value).toBe('invalid-email');
      expect(error.details?.constraint).toBe('Должен быть валидный email');
    });

    it('должен создавать ошибки аутентификации', () => {
      const error = service.createAuthError(
        ErrorCode.INVALID_TOKEN,
        'Неверный токен',
        mockRequest
      );

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.code).toBe(ErrorCode.INVALID_TOKEN);
      expect(error.message).toBe('Неверный токен');
      expect(error.details?.authMethod).toBe('bearer');
    });
  });

  describe('Статистика ошибок', () => {
    it('должен возвращать статистику ошибок', () => {
      // Создаем несколько ошибок
      service.createError(ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, 'Ошибка 1');
      service.createError(ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, 'Ошибка 2');
      service.createError(ErrorType.AUTHENTICATION, ErrorCode.INVALID_TOKEN, 'Ошибка 3');

      const stats = service.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorCounts[ErrorCode.INVALID_INPUT]).toBe(2);
      expect(stats.errorCounts[ErrorCode.INVALID_TOKEN]).toBe(1);
      expect(stats.criticalErrorsCount).toBe(0);
      expect(stats.topErrors).toBeDefined();
    });

    it('должен возвращать детали ошибок', () => {
      service.createError(ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, 'Ошибка');
      
      const stats = service.getErrorStats();
      expect(stats.errorCounts).toBeDefined();
      expect(typeof stats.errorCounts).toBe('object');
    });

    it('должен очищать ошибки', () => {
      service.createError(ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, 'Ошибка');
      
      const statsBefore = service.getErrorStats();
      expect(statsBefore.totalErrors).toBe(1);

      service.resetErrorStats();
      
      const statsAfter = service.getErrorStats();
      expect(statsAfter.totalErrors).toBe(0);
    });
  });

  describe('Обработка различных типов ошибок', () => {
    it('должен работать с различными типами ошибок', () => {
      const validationError = service.createError(ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, 'Валидация');
      const authError = service.createError(ErrorType.AUTHENTICATION, ErrorCode.INVALID_TOKEN, 'Аутентификация');
      const dbError = service.createError(ErrorType.DATABASE, ErrorCode.DATABASE_CONNECTION_ERROR, 'База данных');

      expect(validationError.type).toBe(ErrorType.VALIDATION);
      expect(authError.type).toBe(ErrorType.AUTHENTICATION);
      expect(dbError.type).toBe(ErrorType.DATABASE);
    });

    it('должен работать с ошибками без стека', () => {
      const error = service.createError(
        ErrorType.VALIDATION,
        ErrorCode.INVALID_INPUT,
        'Ошибка без стека'
      );

      expect(error.stack).toBeUndefined();
    });

    it('должен работать с ошибками без сообщения', () => {
      const error = service.createError(
        ErrorType.VALIDATION,
        ErrorCode.INVALID_INPUT,
        '',
        undefined,
        mockRequest
      );

      expect(error.message).toBe('');
      expect(error.type).toBe(ErrorType.VALIDATION);
    });

    it('должен работать с undefined ошибкой', () => {
      const error = service.createError(
        ErrorType.VALIDATION,
        ErrorCode.INVALID_INPUT,
        'Ошибка',
        undefined,
        mockRequest
      );

      expect(error.details).toBeUndefined();
      expect(error.type).toBe(ErrorType.VALIDATION);
    });

    it('должен работать с undefined запросом', () => {
      const error = service.createError(
        ErrorType.VALIDATION,
        ErrorCode.INVALID_INPUT,
        'Ошибка'
      );

      expect(error.requestId).toBeUndefined();
      expect(error.userId).toBeUndefined();
      expect(error.operatorId).toBeUndefined();
      expect(error.path).toBeUndefined();
      expect(error.method).toBeUndefined();
      expect(error.ip).toBeUndefined();
    });
  });

  describe('HTTP статус коды', () => {
    it('должен возвращать правильные HTTP статус коды', () => {
      const validationError = service.createError(ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, 'Ошибка');
      const authError = service.createError(ErrorType.AUTHENTICATION, ErrorCode.INVALID_TOKEN, 'Ошибка');
      const notFoundError = service.createError(ErrorType.NOT_FOUND, ErrorCode.CHAT_NOT_FOUND, 'Ошибка');
      const internalError = service.createError(ErrorType.INTERNAL, ErrorCode.INTERNAL_SERVER_ERROR, 'Ошибка');

      expect(service.getHttpStatusCode(validationError)).toBe(400);
      expect(service.getHttpStatusCode(authError)).toBe(401);
      expect(service.getHttpStatusCode(notFoundError)).toBe(404);
      expect(service.getHttpStatusCode(internalError)).toBe(500);
    });
  });

  describe('Форматирование ошибок', () => {
    it('должен форматировать ошибки для клиента', () => {
      const error = service.createError(
        ErrorType.VALIDATION,
        ErrorCode.INVALID_INPUT,
        'Тестовая ошибка',
        { field: 'test' },
        mockRequest
      );

      const formatted = service.formatErrorForClient(error);

      expect(formatted.error.type).toBe(ErrorType.VALIDATION);
      expect(formatted.error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(formatted.error.message).toBe('Тестовая ошибка');
      expect(formatted.error.timestamp).toBeDefined();
      expect(formatted.error.requestId).toBe('req-123');
      expect(formatted.error.details).toEqual({ field: 'test' });
      expect(formatted.error.path).toBe('/api/test');
      expect(formatted.error.method).toBe('POST');
    });
  });
});
