import { Request, Response, NextFunction } from 'express';
import { errorHandlerService, ErrorType, ErrorCode } from '../services/errorHandler';
import { logError, logWarning } from '../utils/logger';

/**
 * Middleware для генерации уникального ID запроса
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.id = generateRequestId();
  res.set('X-Request-ID', req.id);
  next();
};

/**
 * Middleware для обработки ошибок валидации
 */
export const validationErrorHandler = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const originalJson = res.json;

  // Перехватываем ответы для анализа ошибок валидации
  res.send = function(data: any) {
    if (res.statusCode >= 400) {
      handleValidationError(req, res, data);
    }
    return originalSend.call(this, data);
  };

  res.json = function(data: any) {
    if (res.statusCode >= 400) {
      handleValidationError(req, res, data);
    }
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware для обработки ошибок аутентификации
 */
export const authErrorHandler = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function(data: any) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      handleAuthError(req, res, data);
    }
    return originalSend.call(this, data);
  };

  res.json = function(data: any) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      handleAuthError(req, res, data);
    }
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Основной middleware для обработки ошибок
 */
export const errorHandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Генерируем уникальный ID для запроса если его нет
  if (!req.id) {
    req.id = generateRequestId();
  }

  // Определяем тип ошибки
  let errorType = ErrorType.INTERNAL;
  let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let statusCode = 500;

  // Анализируем ошибку и определяем тип
  if (err.name === 'ValidationError') {
    errorType = ErrorType.VALIDATION;
    errorCode = ErrorCode.INVALID_INPUT;
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError') {
    errorType = ErrorType.AUTHENTICATION;
    errorCode = ErrorCode.INVALID_TOKEN;
    statusCode = 401;
  } else if (err.name === 'ForbiddenError') {
    errorType = ErrorType.AUTHORIZATION;
    errorCode = ErrorCode.ACCESS_DENIED;
    statusCode = 403;
  } else if (err.name === 'NotFoundError') {
    errorType = ErrorType.NOT_FOUND;
    errorCode = ErrorCode.CHAT_NOT_FOUND;
    statusCode = 404;
  } else if (err.name === 'ConflictError') {
    errorType = ErrorType.CONFLICT;
    errorCode = ErrorCode.DUPLICATE_ENTRY;
    statusCode = 409;
  } else if (err.name === 'RateLimitError') {
    errorType = ErrorType.RATE_LIMIT;
    errorCode = ErrorCode.RATE_LIMIT_EXCEEDED;
    statusCode = 429;
  } else if (err.name === 'DatabaseError') {
    errorType = ErrorType.DATABASE;
    errorCode = ErrorCode.DATABASE_CONNECTION_ERROR;
    statusCode = 500;
  } else if (err.name === 'FileUploadError') {
    errorType = ErrorType.FILE_UPLOAD;
    errorCode = ErrorCode.FILE_UPLOAD_FAILED;
    statusCode = 400;
  }

  // Создаем структурированную ошибку
  const appError = errorHandlerService.createError(
    errorType,
    errorCode,
    err.message || 'Внутренняя ошибка сервера',
    {
      originalError: err.name,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: sanitizeRequestBody(req.body),
      query: req.query,
      params: req.params,
    },
    req
  );

  // Логируем ошибку
  logError('Ошибка приложения', {
    requestId: req.id,
    error: appError,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Форматируем ошибку для клиента
  const errorResponse = errorHandlerService.formatErrorForClient(appError);

  // Устанавливаем заголовки
  res.set('X-Request-ID', req.id);
  res.set('X-Error-Type', appError.type);
  res.set('X-Error-Code', appError.code);

  // Отправляем ответ
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware для обработки 404 ошибок
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const appError = errorHandlerService.createError(
    ErrorType.NOT_FOUND,
    ErrorCode.CHAT_NOT_FOUND,
    `Маршрут ${req.method} ${req.originalUrl} не найден`,
    {
      path: req.path,
      method: req.method,
      availableRoutes: getAvailableRoutes(),
    },
    req
  );

  const errorResponse = errorHandlerService.formatErrorForClient(appError);

  res.set('X-Request-ID', req.id);
  res.set('X-Error-Type', appError.type);
  res.set('X-Error-Code', appError.code);

  res.status(404).json(errorResponse);
};

/**
 * Middleware для обработки необработанных ошибок
 */
export const unhandledErrorHandler = (req: Request, res: Response, next: NextFunction) => {
  process.on('uncaughtException', (error: Error) => {
    const appError = errorHandlerService.createError(
      ErrorType.INTERNAL,
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Необработанная ошибка приложения',
      {
        originalError: error.name,
        message: error.message,
        stack: error.stack,
      },
      req
    );

    logError('Необработанная ошибка', {
      requestId: req.id,
      error: appError,
    });

    // Отправляем уведомление администратору
    notifyAdminAboutCriticalError(appError);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const appError = errorHandlerService.createError(
      ErrorType.INTERNAL,
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Необработанное отклонение промиса',
      {
        reason: reason?.message || reason,
        promise: promise.toString(),
      },
      req
    );

    logError('Необработанное отклонение промиса', {
      requestId: req.id,
      error: appError,
    });
  });

  next();
};

/**
 * Middleware для мониторинга производительности
 */
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Логируем медленные запросы
    if (duration > 1000) {
      logWarning('Медленный запрос', {
        requestId: req.id,
        path: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }

    // Добавляем заголовки с метриками
    res.set('X-Response-Time', `${duration}ms`);
    res.set('X-Request-ID', req.id);
  });

  next();
};

/**
 * Вспомогательные функции
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function handleValidationError(req: Request, res: Response, data: any): void {
  try {
    const appError = errorHandlerService.createValidationError(
      'request_body',
      data,
      'validation_failed',
      req
    );

    logWarning('Ошибка валидации', {
      requestId: req.id,
      error: appError,
      path: req.path,
      method: req.method,
    });
  } catch (error) {
    logError('Ошибка обработки ошибки валидации', { error, requestId: req.id });
  }
}

function handleAuthError(req: Request, res: Response, data: any): void {
  try {
    const appError = errorHandlerService.createAuthError(
      ErrorCode.INVALID_TOKEN,
      'Ошибка аутентификации',
      req
    );

    logWarning('Ошибка аутентификации', {
      requestId: req.id,
      error: appError,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  } catch (error) {
    logError('Ошибка обработки ошибки аутентификации', { error, requestId: req.id });
  }
}

function sanitizeRequestBody(body: any): any {
  if (!body) return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[SENSITIVE_DATA]';
    }
  }

  return sanitized;
}

function getAvailableRoutes(): string[] {
  // Возвращаем список доступных маршрутов
  return [
    'GET /api/chats',
    'GET /api/chats/:id',
    'POST /api/chats/:id/messages',
    'GET /telegram/bot-info',
    'POST /upload/image',
    'GET /health',
  ];
}

function notifyAdminAboutCriticalError(error: any): void {
  // Здесь можно добавить логику уведомления администратора
  // например, отправка email, Slack уведомление и т.д.
  logError('Уведомление администратора о критической ошибке', { error });
}

/**
 * Middleware для обработки ошибок WebSocket
 */
export const websocketErrorHandler = (error: Error, connectionInfo: any) => {
  const appError = errorHandlerService.createWebSocketError(
    ErrorCode.WEBSOCKET_CONNECTION_FAILED,
    'Ошибка WebSocket соединения',
    connectionInfo
  );

  logError('WebSocket ошибка', { error: appError, connectionInfo });
};

/**
 * Middleware для обработки ошибок кэша
 */
export const cacheErrorHandler = (operation: string, key: string, error: any, req?: Request) => {
  const appError = errorHandlerService.createCacheError(operation, key, error, req);

  logWarning('Ошибка кэша', { error: appError, operation, key });
};

/**
 * Middleware для обработки ошибок загрузки файлов
 */
export const fileUploadErrorHandler = (code: ErrorCode, message: string, fileInfo: any, req?: Request) => {
  const appError = errorHandlerService.createFileUploadError(code, message, fileInfo, req);

  logWarning('Ошибка загрузки файла', { error: appError, fileInfo });
};
