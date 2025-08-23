import { logError, logWarning, logInfo } from '../utils/logger';
import { env } from '../config/env';

/**
 * Типы ошибок приложения
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  FILE_UPLOAD = 'FILE_UPLOAD',
  CACHE = 'CACHE',
  WEBSOCKET = 'WEBSOCKET',
  INTERNAL = 'INTERNAL',
}

/**
 * Коды ошибок
 */
export enum ErrorCode {
  // Валидация
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // Аутентификация
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // Авторизация
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED = 'ACCESS_DENIED',
  OPERATOR_NOT_ASSIGNED = 'OPERATOR_NOT_ASSIGNED',
  
  // Не найдено
  CHAT_NOT_FOUND = 'CHAT_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  OPERATOR_NOT_FOUND = 'OPERATOR_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ATTACHMENT_NOT_FOUND = 'ATTACHMENT_NOT_FOUND',
  
  // Конфликты
  CHAT_ALREADY_ASSIGNED = 'CHAT_ALREADY_ASSIGNED',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  OPERATION_IN_PROGRESS = 'OPERATION_IN_PROGRESS',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // База данных
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Внешние сервисы
  TELEGRAM_API_ERROR = 'TELEGRAM_API_ERROR',
  REDIS_CONNECTION_ERROR = 'REDIS_CONNECTION_ERROR',
  EXTERNAL_API_TIMEOUT = 'EXTERNAL_API_TIMEOUT',
  
  // Загрузка файлов
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_VALIDATION_FAILED = 'FILE_VALIDATION_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  
  // Кэш
  CACHE_OPERATION_FAILED = 'CACHE_OPERATION_FAILED',
  CACHE_KEY_NOT_FOUND = 'CACHE_KEY_NOT_FOUND',
  
  // WebSocket
  WEBSOCKET_CONNECTION_FAILED = 'WEBSOCKET_CONNECTION_FAILED',
  WEBSOCKET_MESSAGE_INVALID = 'WEBSOCKET_MESSAGE_INVALID',
  
  // Внутренние ошибки
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Интерфейс ошибки приложения
 */
export interface AppError {
  type: ErrorType;
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  userId?: number;
  operatorId?: number;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  stack?: string;
}

/**
 * Конфигурация обработки ошибок
 */
export interface ErrorHandlerConfig {
  enableDetailedErrors: boolean;
  enableStackTraces: boolean;
  enableRequestLogging: boolean;
  enableErrorReporting: boolean;
  maxErrorDetailsLength: number;
  errorSamplingRate: number;
  ignoredErrorCodes: ErrorCode[];
  criticalErrorCodes: ErrorCode[];
}

/**
 * Сервис для централизованной обработки ошибок
 */
export class ErrorHandlerService {
  private config: ErrorHandlerConfig;
  private errorStats: Map<ErrorCode, number> = new Map();
  private criticalErrors: AppError[] = [];
  private maxCriticalErrors = 100;

  constructor() {
    this.config = {
      maxErrorDetailsLength: env.errorHandling.maxErrorDetailsLength,
      errorSamplingRate: env.errorHandling.errorSamplingRate,
      enableDetailedErrors: env.isDevelopment,
      enableStackTraces: env.isDevelopment,
      enableRequestLogging: env.isDevelopment,
      enableErrorReporting: !env.isDevelopment,
      ignoredErrorCodes: [],
      criticalErrorCodes: [ErrorCode.DATABASE_CONNECTION_ERROR, ErrorCode.INTERNAL_SERVER_ERROR, ErrorCode.TRANSACTION_FAILED]
    } as ErrorHandlerConfig;
    
    // Дополнительные свойства, не входящие в интерфейс
    (this.config as any).enablePerformanceMonitoring = true;
    (this.config as any).maxStoredErrors = 1000;
    (this.config as any).cleanupInterval = 24 * 60 * 60 * 1000; // 24 часа
  }

  /**
   * Создание ошибки приложения
   */
  createError(
    type: ErrorType,
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    request?: any
  ): AppError {
    const error: AppError = {
      type,
      code,
      message,
      details: this.sanitizeDetails(details),
      timestamp: new Date(),
      requestId: request?.id,
      userId: request?.user?.id,
      operatorId: request?.operator?.id,
      path: request?.path,
      method: request?.method,
      userAgent: request?.get('User-Agent'),
      ip: request?.ip || request?.connection?.remoteAddress,
      stack: this.config.enableStackTraces ? new Error().stack : undefined,
    };

    // Обновляем статистику
    this.updateErrorStats(error);

    // Логируем ошибку
    this.logError(error);

    // Проверяем критичность
    if (this.config.criticalErrorCodes.includes(code)) {
      this.addCriticalError(error);
    }

    return error;
  }

  /**
   * Обработка ошибки валидации
   */
  createValidationError(
    field: string,
    value: any,
    constraint: string,
    request?: any
  ): AppError {
    return this.createError(
      ErrorType.VALIDATION,
      ErrorCode.INVALID_INPUT,
      `Ошибка валидации поля '${field}'`,
      {
        field,
        value: this.sanitizeValue(value),
        constraint,
        receivedType: typeof value,
      },
      request
    );
  }

  /**
   * Обработка ошибки аутентификации
   */
  createAuthError(
    code: ErrorCode,
    message: string,
    request?: any
  ): AppError {
    return this.createError(
      ErrorType.AUTHENTICATION,
      code,
      message,
      { authMethod: 'bearer' },
      request
    );
  }

  /**
   * Обработка ошибки авторизации
   */
  createAuthorizationError(
    resource: string,
    action: string,
    request?: any
  ): AppError {
    return this.createError(
      ErrorType.AUTHORIZATION,
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      `Недостаточно прав для ${action} ресурса ${resource}`,
      { resource, action, requiredPermission: `${resource}:${action}` },
      request
    );
  }

  /**
   * Обработка ошибки "не найдено"
   */
  createNotFoundError(
    resource: string,
    identifier: string | number,
    request?: any
  ): AppError {
    return this.createError(
      ErrorType.NOT_FOUND,
      ErrorCode.CHAT_NOT_FOUND,
      `${resource} с идентификатором '${identifier}' не найден`,
      { resource, identifier, searchType: typeof identifier },
      request
    );
  }

  /**
   * Обработка ошибки базы данных
   */
  createDatabaseError(
    operation: string,
    table: string,
    originalError: any,
    request?: any
  ): AppError {
    return this.createError(
      ErrorType.DATABASE,
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Ошибка базы данных при выполнении ${operation}`,
      {
        operation,
        table,
        originalError: this.sanitizeError(originalError),
        databaseType: 'postgresql',
      },
      request
    );
  }

  /**
   * Обработка ошибки внешнего сервиса
   */
  createExternalServiceError(
    service: string,
    operation: string,
    originalError: any,
    request?: any
  ): AppError {
    return this.createError(
      ErrorType.EXTERNAL_SERVICE,
      ErrorCode.EXTERNAL_API_TIMEOUT,
      `Ошибка внешнего сервиса ${service} при выполнении ${operation}`,
      {
        service,
        operation,
        originalError: this.sanitizeError(originalError),
        timestamp: new Date().toISOString(),
      },
      request
    );
  }

  /**
   * Обработка ошибки загрузки файла
   */
  createFileUploadError(
    code: ErrorCode,
    message: string,
    fileInfo: any,
    request?: any
  ): AppError {
    return this.createError(
      ErrorType.FILE_UPLOAD,
      code,
      message,
      {
        fileName: fileInfo.originalname,
        fileSize: fileInfo.size,
        mimeType: fileInfo.mimetype,
        uploadPath: fileInfo.path,
      },
      request
    );
  }

  /**
   * Обработка ошибки кэша
   */
  createCacheError(
    operation: string,
    key: string,
    originalError: any,
    request?: any
  ): AppError {
    return this.createError(
      ErrorType.CACHE,
      ErrorCode.CACHE_OPERATION_FAILED,
      `Ошибка кэша при выполнении ${operation}`,
      {
        operation,
        key: this.sanitizeKey(key),
        originalError: this.sanitizeError(originalError),
        cacheType: 'redis',
      },
      request
    );
  }

  /**
   * Обработка ошибки WebSocket
   */
  createWebSocketError(
    code: ErrorCode,
    message: string,
    connectionInfo: any,
    request?: any
  ): AppError {
    return this.createError(
      ErrorType.WEBSOCKET,
      code,
      message,
      {
        connectionId: connectionInfo.id,
        clientIp: connectionInfo.ip,
        userAgent: connectionInfo.userAgent,
        connectionTime: connectionInfo.connectedAt,
      },
      request
    );
  }

  /**
   * Получение HTTP статус кода для ошибки
   */
  getHttpStatusCode(error: AppError): number {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return 400;
      case ErrorType.AUTHENTICATION:
        return 401;
      case ErrorType.AUTHORIZATION:
        return 403;
      case ErrorType.NOT_FOUND:
        return 404;
      case ErrorType.CONFLICT:
        return 409;
      case ErrorType.RATE_LIMIT:
        return 429;
      case ErrorType.DATABASE:
      case ErrorType.EXTERNAL_SERVICE:
      case ErrorType.FILE_UPLOAD:
      case ErrorType.CACHE:
      case ErrorType.WEBSOCKET:
      case ErrorType.INTERNAL:
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Форматирование ошибки для ответа клиенту
   */
  formatErrorForClient(error: AppError): Record<string, any> {
    const baseResponse: any = {
      error: {
        type: error.type,
        code: error.code,
        message: error.message,
        timestamp: error.timestamp.toISOString(),
        requestId: error.requestId,
      },
    };

    if (this.config.enableDetailedErrors) {
      baseResponse.error.details = (error as any).details;
      baseResponse.error.path = (error as any).path;
      baseResponse.error.method = (error as any).method;
    }

    if (env.NODE_ENV === 'development' && this.config.enableStackTraces) {
      baseResponse.error.stack = (error as any).stack;
    }

    return baseResponse;
  }

  /**
   * Получение статистики ошибок
   */
  getErrorStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [code, count] of this.errorStats) {
      stats[code] = count;
    }

    return {
      totalErrors: Array.from(this.errorStats.values()).reduce((a, b) => a + b, 0),
      errorCounts: stats,
      criticalErrorsCount: this.criticalErrors.length,
      topErrors: this.getTopErrors(5),
    };
  }

  /**
   * Получение критических ошибок
   */
  getCriticalErrors(limit: number = 20): AppError[] {
    return this.criticalErrors
      .slice(0, limit)
      .map(error => ({
        ...error,
        details: this.config.enableDetailedErrors ? error.details : undefined,
        stack: this.config.enableStackTraces ? error.stack : undefined,
      }));
  }

  /**
   * Сброс статистики ошибок
   */
  resetErrorStats(): void {
    this.errorStats.clear();
    this.criticalErrors = [];
    logInfo('Статистика ошибок сброшена');
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(updates: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...updates };
    logInfo('Конфигурация ErrorHandler обновлена', updates);
  }

  /**
   * Получение текущей конфигурации
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }

  /**
   * Приватные методы
   */
  private sanitizeDetails(details?: Record<string, any>): Record<string, any> | undefined {
    if (!details) return undefined;

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(details)) {
      sanitized[key] = this.sanitizeValue(value);
    }

    return sanitized;
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return value.length > this.config.maxErrorDetailsLength
        ? value.substring(0, this.config.maxErrorDetailsLength) + '...'
        : value;
    }
    
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value).length > this.config.maxErrorDetailsLength
        ? '[Object too large]'
        : value;
    }

    return value;
  }

  private sanitizeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: this.config.enableStackTraces ? error.stack : undefined,
      };
    }
    return error;
  }

  private sanitizeKey(key: string): string {
    if (key.includes('password') || key.includes('token') || key.includes('secret')) {
      return '[SENSITIVE_DATA]';
    }
    return key;
  }

  private updateErrorStats(error: AppError): void {
    const currentCount = this.errorStats.get(error.code) || 0;
    this.errorStats.set(error.code, currentCount + 1);
  }

  private addCriticalError(error: AppError): void {
    this.criticalErrors.unshift(error);
    
    if (this.criticalErrors.length > this.maxCriticalErrors) {
      this.criticalErrors = this.criticalErrors.slice(0, this.maxCriticalErrors);
    }
  }

  private getTopErrors(limit: number): Array<{ code: ErrorCode; count: number }> {
    return Array.from(this.errorStats.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private logError(error: AppError): void {
    if (Math.random() > this.config.errorSamplingRate) {
      return; // Пропускаем ошибку согласно sampling rate
    }

    const logData = {
      type: error.type,
      code: error.code,
      message: error.message,
      path: error.path,
      method: error.method,
      userId: error.userId,
      operatorId: error.operatorId,
      requestId: error.requestId,
    };

    if (this.config.criticalErrorCodes.includes(error.code)) {
      logError('КРИТИЧЕСКАЯ ОШИБКА', logData);
    } else if (error.type === ErrorType.VALIDATION || error.type === ErrorType.AUTHENTICATION) {
      logWarning('Ошибка валидации/аутентификации', logData);
    } else {
      logError('Ошибка приложения', logData);
    }
  }
}

// Экспортируем единственный экземпляр
export const errorHandlerService = new ErrorHandlerService();
