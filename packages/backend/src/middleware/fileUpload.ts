import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logInfo, logWarning, logError } from '../utils/logger';
import { env } from '../config/env';
import { FileValidationService, FileValidationOptions } from '../services/fileValidation';

// Создаем экземпляр сервиса валидации
const fileValidationService = new FileValidationService();

/**
 * Конфигурация multer для безопасной загрузки файлов
 */
const createMulterConfig = (options: FileValidationOptions = {}) => {
  const storage = multer.memoryStorage(); // Используем memory storage для валидации

  const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
      // Базовая проверка
      if (!file.originalname || !file.mimetype) {
        cb(new Error('Файл не предоставлен или имеет неполные данные'));
        return;
      }

      // Проверка расширения
      const extension = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = options.allowedExtensions || ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx'];
      
      if (!allowedExtensions.includes(extension)) {
        cb(new Error(`Расширение '${extension}' не поддерживается`));
        return;
      }

      // Проверка MIME типа
      const allowedMimeTypes = options.allowedMimeTypes || ['image/*', 'application/pdf', 'text/*'];
      const isAllowedMimeType = allowedMimeTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.mimetype.startsWith(type.slice(0, -1));
        }
        return file.mimetype === type;
      });

      if (!isAllowedMimeType) {
        cb(new Error(`MIME тип '${file.mimetype}' не поддерживается`));
        return;
      }

      cb(null, true);
    } catch (error) {
      cb(error as Error);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: options.maxSize || parseInt(env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
      files: options.maxFiles || 5, // Максимум 5 файлов
      fieldSize: 1024 * 1024, // 1MB для полей формы
    },
  });
};

/**
 * Middleware для загрузки одного файла
 */
export const uploadSingleFile = (fieldName: string = 'file', options: FileValidationOptions = {}) => {
  const upload = createMulterConfig(options).single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, async (err) => {
      if (err) {
        logError('Ошибка загрузки файла', {
          error: err.message,
          fieldName,
          url: req.url,
          method: req.method,
        });

        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                error: 'Файл слишком большой',
                details: [{ field: fieldName, message: 'Размер файла превышает максимально допустимый', code: 'file_too_large' }],
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                error: 'Слишком много файлов',
                details: [{ field: fieldName, message: 'Превышен лимит количества файлов', code: 'too_many_files' }],
              });
            default:
              return res.status(400).json({
                error: 'Ошибка загрузки файла',
                details: [{ field: fieldName, message: err.message, code: 'upload_error' }],
              });
          }
        }

        return res.status(400).json({
          error: 'Ошибка загрузки файла',
          details: [{ field: fieldName, message: err.message, code: 'upload_error' }],
        });
      }

      // Расширенная валидация файла
      if (req.file) {
        try {
          const file = req.file as Express.Multer.File;
          const validationResult = await fileValidationService.validateFile(file, options);
          
          if (!validationResult.isValid) {
            logWarning('Файл не прошел валидацию', {
              fileName: file.originalname,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
            });

            return res.status(400).json({
              error: 'Файл не прошел валидацию',
              details: validationResult.errors.map(error => ({
                field: fieldName,
                message: error,
                code: 'validation_error',
              })),
              warnings: validationResult.warnings,
            });
          }

          // Добавляем информацию о валидации в request
          (req as any).fileValidation = validationResult;
          
          if (validationResult.warnings.length > 0) {
            logWarning('Файл загружен с предупреждениями', {
              fileName: file.originalname,
              warnings: validationResult.warnings,
            });
          }

          logInfo('Файл успешно загружен и прошел валидацию', {
            fileName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
          });

        } catch (validationError) {
          const file = req.file as Express.Multer.File;
          logError('Ошибка валидации файла', {
            fileName: file.originalname,
            error: validationError instanceof Error ? validationError.message : 'Unknown error',
          });

          return res.status(500).json({
            error: 'Ошибка валидации файла',
            details: [{ field: fieldName, message: 'Внутренняя ошибка валидации', code: 'validation_internal_error' }],
          });
        }
      }

      next();
    });
  };
};

/**
 * Middleware для загрузки нескольких файлов
 */
export const uploadMultipleFiles = (fieldName: string = 'files', options: FileValidationOptions = {}) => {
  const upload = createMulterConfig(options).array(fieldName, options.maxFiles || 5);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, async (err) => {
      if (err) {
        logError('Ошибка загрузки файлов', {
          error: err.message,
          fieldName,
          url: req.url,
          method: req.method,
        });

        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                error: 'Один из файлов слишком большой',
                details: [{ field: fieldName, message: 'Размер файла превышает максимально допустимый', code: 'file_too_large' }],
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                error: 'Слишком много файлов',
                details: [{ field: fieldName, message: 'Превышен лимит количества файлов', code: 'too_many_files' }],
              });
            default:
              return res.status(400).json({
                error: 'Ошибка загрузки файлов',
                details: [{ field: fieldName, message: err.message, code: 'upload_error' }],
              });
          }
        }

        return res.status(400).json({
          error: 'Ошибка загрузки файлов',
          details: [{ field: fieldName, message: err.message, code: 'upload_error' }],
        });
      }

      // Расширенная валидация всех файлов
      if (req.files && Array.isArray(req.files)) {
        const validationResults = [];
        const allErrors: string[] = [];
        const allWarnings: string[] = [];

        for (const file of req.files) {
          try {
            const fileObj = file as Express.Multer.File;
            const validationResult = await fileValidationService.validateFile(fileObj, options);
            validationResults.push(validationResult);

            if (!validationResult.isValid) {
              allErrors.push(...validationResult.errors);
            }
            allWarnings.push(...validationResult.warnings);
          } catch (validationError) {
            const fileObj = file as Express.Multer.File;
            logError('Ошибка валидации файла', {
              fileName: fileObj.originalname,
              error: validationError instanceof Error ? validationError.message : 'Unknown error',
            });
            allErrors.push('Внутренняя ошибка валидации');
          }
        }

        // Если есть ошибки валидации, возвращаем их
        if (allErrors.length > 0) {
          logWarning('Файлы не прошли валидацию', {
            fileCount: req.files.length,
            errors: allErrors,
            warnings: allWarnings,
          });

          return res.status(400).json({
            error: 'Файлы не прошли валидацию',
            details: allErrors.map(error => ({
              field: fieldName,
              message: error,
              code: 'validation_error',
            })),
            warnings: allWarnings,
          });
        }

        // Добавляем информацию о валидации в request
        (req as any).fileValidation = validationResults;

        if (allWarnings.length > 0) {
          logWarning('Файлы загружены с предупреждениями', {
            fileCount: req.files.length,
            warnings: allWarnings,
          });
        }

        logInfo('Файлы успешно загружены и прошли валидацию', {
          fileCount: req.files.length,
          totalSize: req.files.reduce((sum: number, file) => sum + (file as Express.Multer.File).size, 0),
        });
      }

      next();
    });
  };
};

/**
 * Middleware для загрузки файлов с разными полями
 */
export const uploadFields = (fields: multer.Field[], options: FileValidationOptions = {}) => {
  const upload = createMulterConfig(options).fields(fields);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, async (err) => {
      if (err) {
        logError('Ошибка загрузки файлов', {
          error: err.message,
          fields: fields.map(f => f.name),
          url: req.url,
          method: req.method,
        });

        return res.status(400).json({
          error: 'Ошибка загрузки файлов',
          details: [{ message: err.message, code: 'upload_error' }],
        });
      }

      // Валидация всех загруженных файлов
      const allValidationResults: Record<string, any> = {};
      const allErrors: string[] = [];
      const allWarnings: string[] = [];

      for (const field of fields) {
        const files = req.files?.[field.name];
        if (files && Array.isArray(files)) {
          const fieldValidationResults = [];
          
          for (const file of files) {
            try {
              const validationResult = await fileValidationService.validateFile(file, options);
              fieldValidationResults.push(validationResult);

              if (!validationResult.isValid) {
                allErrors.push(...validationResult.errors);
              }
              allWarnings.push(...validationResult.warnings);
            } catch (validationError) {
              logError('Ошибка валидации файла', {
                fileName: file.originalname,
                fieldName: field.name,
                error: validationError instanceof Error ? validationError.message : 'Unknown error',
              });
              allErrors.push('Внутренняя ошибка валидации');
            }
          }

          allValidationResults[field.name] = fieldValidationResults;
        }
      }

      // Если есть ошибки валидации, возвращаем их
      if (allErrors.length > 0) {
        logWarning('Файлы не прошли валидацию', {
          errors: allErrors,
          warnings: allWarnings,
        });

        return res.status(400).json({
          error: 'Файлы не прошли валидацию',
          details: allErrors.map(error => ({
            message: error,
            code: 'validation_error',
          })),
          warnings: allWarnings,
        });
      }

      // Добавляем информацию о валидации в request
      (req as any).fileValidation = allValidationResults;

      if (allWarnings.length > 0) {
        logWarning('Файлы загружены с предупреждениями', {
          warnings: allWarnings,
        });
      }

      logInfo('Файлы успешно загружены и прошли валидацию', {
        fields: Object.keys(allValidationResults),
        totalFiles: Object.values(allValidationResults).flat().length,
      });

      next();
    });
  };
};

/**
 * Готовые конфигурации для разных типов файлов
 */
export const fileUploadConfigs = {
  // Загрузка изображений
  images: (fieldName: string = 'image') => uploadSingleFile(fieldName, {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    validateContent: true,
    blockExecutableFiles: true,
  }),

  // Загрузка документов
  documents: (fieldName: string = 'document') => uploadSingleFile(fieldName, {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
    validateContent: true,
    blockExecutableFiles: true,
  }),

  // Загрузка архивов
  archives: (fieldName: string = 'archive') => uploadSingleFile(fieldName, {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
    allowedExtensions: ['.zip', '.rar', '.7z'],
    validateContent: false, // Не проверяем содержимое архивов
    blockExecutableFiles: true,
  }),

  // Загрузка медиа файлов
  media: (fieldName: string = 'media') => uploadSingleFile(fieldName, {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'],
    allowedExtensions: ['.mp3', '.wav', '.mp4', '.webm'],
    validateContent: false,
    blockExecutableFiles: true,
  }),
};

/**
 * Middleware для получения статистики валидации файлов
 */
export const getFileValidationStats = (req: Request, res: Response) => {
  try {
    const stats = fileValidationService.getValidationStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logError('Ошибка получения статистики валидации файлов', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Ошибка получения статистики валидации файлов',
    });
  }
};
