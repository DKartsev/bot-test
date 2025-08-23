import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { logError } from '../utils/logger';

// Расширяем типы Express для поддержки файлов
declare module 'express-serve-static-core' {
  interface Request {
    file?: unknown;
    files?: unknown[] | { [fieldname: string]: unknown[] };
  }
}

// Тип для схемы валидации
type ValidationSchema = z.ZodSchema<any, any, any>;

// Middleware для валидации тела запроса
export const validateBody = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError<unknown>;
        logError('Ошибка валидации тела запроса', {
          errors: zodError.issues,
          body: req.body,
          url: req.url,
          method: req.method,
        });

        res.status(400).json({
          error: 'Ошибка валидации данных',
          details: zodError.issues.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
        return;
      }

      logError('Неожиданная ошибка валидации', { error, body: req.body });
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      return;
    }
  };
};

// Middleware для валидации параметров запроса
export const validateParams = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError<unknown>;
        logError('Ошибка валидации параметров запроса', {
          errors: zodError.issues,
          params: req.params,
          url: req.url,
          method: req.method,
        });

        res.status(400).json({
          error: 'Ошибка валидации параметров',
          details: zodError.issues.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
        return;
      }

      logError('Неожиданная ошибка валидации параметров', { error, params: req.params });
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      return;
    }
  };
};

// Middleware для валидации query параметров
export const validateQuery = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError<unknown>;
        logError('Ошибка валидации query параметров', {
          errors: zodError.issues,
          query: req.query,
          url: req.url,
          method: req.method,
        });

        res.status(400).json({
          error: 'Ошибка валидации query параметров',
          details: zodError.issues.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
        return;
      }

      logError('Неожиданная ошибка валидации query', { error, query: req.query });
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      return;
    }
  };
};

// Middleware для валидации файлов
export const validateFile = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
} = {}) => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = ['*/*'], required = false } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (required && (!req.file && !req.files)) {
        res.status(400).json({
          error: 'Файл обязателен',
          details: [{ field: 'file', message: 'Файл не предоставлен', code: 'missing_file' }],
        });
        return;
      }

      if (req.file) {
        validateSingleFile(req.file, maxSize, allowedTypes);
      } else if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => validateSingleFile(file, maxSize, allowedTypes));
      }

      next();
    } catch (error) {
      if (error instanceof Error) {
        logError('Ошибка валидации файла', {
          error: error.message,
          file: req.file || req.files,
          url: req.url,
          method: req.method,
        });

        res.status(400).json({
          error: 'Ошибка валидации файла',
          details: [{ field: 'file', message: error.message, code: 'file_validation_error' }],
        });
        return;
      }

      logError('Неожиданная ошибка валидации файла', { error });
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      return;
    }
  };
};

// Функция валидации одного файла
function validateSingleFile(file: any, maxSize: number, allowedTypes: string[]) {
  if (!file) return;

  // Проверка размера
  if (file.size > maxSize) {
    throw new Error(`Размер файла превышает максимально допустимый: ${maxSize / (1024 * 1024)}MB`);
  }

  // Проверка типа
  if (allowedTypes.length > 0 && !allowedTypes.includes('*/*')) {
      const fileType = String(file.mimetype || file.type);
  if (!allowedTypes.includes(fileType)) {
      throw new Error(`Тип файла не поддерживается. Разрешенные типы: ${allowedTypes.join(', ')}`);
    }
  }

  // Проверка имени файла
  if (!file.originalname || file.originalname.trim().length === 0) {
    throw new Error('Имя файла не может быть пустым');
  }

  // Проверка расширения файла
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx'];
  const fileExtension = String(file.originalname).toLowerCase().substring(String(file.originalname).lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) {
    throw new Error(`Расширение файла не поддерживается. Разрешенные расширения: ${allowedExtensions.join(', ')}`);
  }
}

// Middleware для валидации заголовков
export const validateHeaders = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.headers);
      req.headers = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError<unknown>;
        logError('Ошибка валидации заголовков', {
          errors: zodError.issues,
          headers: req.headers,
          url: req.url,
          method: req.method,
        });

        res.status(400).json({
          error: 'Ошибка валидации заголовков',
          details: zodError.issues.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
        return;
      }

      logError('Неожиданная ошибка валидации заголовков', { error, headers: req.headers });
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      return;
    }
  };
};

// Универсальный middleware для валидации
export const validate = (schemas: {
  body?: ValidationSchema;
  params?: ValidationSchema;
  query?: ValidationSchema;
  headers?: ValidationSchema;
  file?: {
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
  };
}) => {
  const middlewares: unknown[] = [];

  if (schemas.body) {
    middlewares.push(validateBody(schemas.body));
  }

  if (schemas.params) {
    middlewares.push(validateParams(schemas.params));
  }

  if (schemas.query) {
    middlewares.push(validateQuery(schemas.query));
  }

  if (schemas.headers) {
    middlewares.push(validateHeaders(schemas.headers));
  }

  if (schemas.file) {
    middlewares.push(validateFile(schemas.file));
  }

  return middlewares;
};
