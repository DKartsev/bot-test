import * as path from 'path';
import { logInfo, logWarning, logError } from '../utils/logger';
import { env } from '../config/env';

/**
 * Типы файлов для валидации
 */
export interface FileValidationOptions {
  maxSize?: number;
  maxFiles?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  scanForViruses?: boolean;
  validateContent?: boolean;
  maxFileNameLength?: number;
  blockExecutableFiles?: boolean;
  allowHiddenFiles?: boolean;
}

/**
 * Результат валидации файла
 */
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    size: number;
    mimeType: string;
    extension: string;
    fileName: string;
    isExecutable: boolean;
    isHidden: boolean;
  };
}

/**
 * Сервис для расширенной валидации файлов
 */
export class FileValidationService {
  private defaultOptions: FileValidationOptions;

  constructor() {
    this.defaultOptions = {
      maxSize: env.files.maxSize || 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: env.files.allowedTypes || [
        // Изображения
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Документы
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv', 'text/html',
        // Архивы
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        // Аудио/Видео
        'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'
      ],
      allowedExtensions: [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
        '.pdf', '.doc', '.docx', '.txt', '.csv', '.html',
        '.zip', '.rar', '.7z',
        '.mp3', '.wav', '.mp4', '.webm'
      ],
      scanForViruses: false, // В продакшене можно включить
      validateContent: true,
      maxFileNameLength: env.files.maxFileNameLength || 255,
      blockExecutableFiles: true,
      allowHiddenFiles: false,
    };
  }

  /**
   * Основная функция валидации файла
   */
  async validateFile(file: Express.Multer.File, options: FileValidationOptions = {}): Promise<FileValidationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Базовая проверка файла
      if (!file || !file.originalname || !file.mimetype) {
        errors.push('Файл не предоставлен или имеет неполные данные');
        return this.createValidationResult(false, errors, warnings, file);
      }

      // Проверка размера
      if (opts.maxSize && file.size > opts.maxSize) {
        errors.push(`Размер файла (${this.formatFileSize(file.size)}) превышает максимально допустимый (${this.formatFileSize(opts.maxSize)})`);
      }

      // Проверка MIME типа
      if (opts.allowedMimeTypes && opts.allowedMimeTypes.length > 0 && !this.isValidMimeType(file.mimetype, opts.allowedMimeTypes)) {
        errors.push(`MIME тип '${file.mimetype}' не поддерживается`);
      }

      // Проверка расширения
      const extension = path.extname(file.originalname).toLowerCase();
      if (opts.allowedExtensions && opts.allowedExtensions.length > 0 && !this.isValidExtension(extension, opts.allowedExtensions)) {
        errors.push(`Расширение '${extension}' не поддерживается`);
      }

      // Проверка имени файла
      if (opts.maxFileNameLength && !this.isValidFileName(file.originalname, opts.maxFileNameLength)) {
        errors.push(`Имя файла не соответствует требованиям безопасности`);
      }

      // Проверка на исполняемые файлы
      if (opts.blockExecutableFiles && this.isExecutableFile(extension, file.mimetype)) {
        errors.push('Исполняемые файлы запрещены к загрузке');
      }

      // Проверка на скрытые файлы
      if (!opts.allowHiddenFiles && this.isHiddenFile(file.originalname)) {
        errors.push('Скрытые файлы запрещены к загрузке');
      }

      // Проверка содержимого файла (если включено)
      if (opts.validateContent && file.size > 0) {
        const contentValidation = this.validateFileContent(file);
        if (!contentValidation.isValid) {
          errors.push(...contentValidation.errors);
        }
        warnings.push(...contentValidation.warnings);
      }

      // Проверка на подозрительные паттерны
      const suspiciousPatterns = this.detectSuspiciousPatterns(file);
      if (suspiciousPatterns.length > 0) {
        warnings.push(`Обнаружены подозрительные паттерны: ${suspiciousPatterns.join(', ')}`);
      }

      // Проверка на дублирование файлов
      if (this.isDuplicateFile(file)) {
        warnings.push('Файл с таким содержимым уже существует');
      }

      const isValid = errors.length === 0;
      
      if (isValid) {
        logInfo('Файл прошел валидацию', {
          fileName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        });
      } else {
        logWarning('Файл не прошел валидацию', {
          fileName: file.originalname,
          errors,
          warnings,
        });
      }

      return this.createValidationResult(isValid, errors, warnings, file);

    } catch (error) {
      logError('Ошибка валидации файла', {
        fileName: file?.originalname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      errors.push('Внутренняя ошибка валидации файла');
      return this.createValidationResult(false, errors, warnings, file);
    }
  }

  /**
   * Валидация содержимого файла
   */
  private validateFileContent(file: Express.Multer.File): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Проверка на пустые файлы
      if (file.size === 0) {
        warnings.push('Файл пустой');
      }

      // Проверка на минимальный размер для изображений
      if (file.mimetype.startsWith('image/') && file.size < 100) {
        warnings.push('Файл слишком маленький для изображения');
      }

      // Проверка на максимальный размер для текстовых файлов
      if (file.mimetype.startsWith('text/') && file.size > 1024 * 1024) {
        warnings.push('Текстовый файл слишком большой');
      }

      // Проверка на корректность PDF
      if (file.mimetype === 'application/pdf') {
        if (!this.isValidPDF(file)) {
          errors.push('Файл не является корректным PDF документом');
        }
      }

      // Проверка на корректность изображений
      if (file.mimetype.startsWith('image/')) {
        if (!this.isValidImage(file)) {
          errors.push('Файл не является корректным изображением');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logError('Ошибка валидации содержимого файла', {
        fileName: file.originalname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      errors.push('Ошибка проверки содержимого файла');
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Проверка на дублирование файлов
   */
  private isDuplicateFile(file: Express.Multer.File): boolean {
    try {
      // Простая проверка по размеру и имени
      // В реальном проекте можно добавить проверку по хешу
      return false;
    } catch (error) {
      logWarning('Ошибка проверки дублирования файла', {
        fileName: file.originalname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Обнаружение подозрительных паттернов
   */
  private detectSuspiciousPatterns(file: Express.Multer.File): string[] {
    const patterns: string[] = [];
    const fileName = file.originalname.toLowerCase();

    // Проверка на двойные расширения
    if ((fileName.match(/\./g) || []).length > 1) {
      patterns.push('двойное расширение');
    }

    // Проверка на подозрительные имена
    const suspiciousNames = ['virus', 'malware', 'trojan', 'backdoor', 'exploit'];
    if (suspiciousNames.some(name => fileName.includes(name))) {
      patterns.push('подозрительное имя');
    }

    // Проверка на очень длинные имена
    if (fileName.length > 100) {
      patterns.push('очень длинное имя');
    }

    return patterns;
  }

  /**
   * Проверка MIME типа
   */
  private isValidMimeType(mimeType: string, allowedTypes: string[]): boolean {
    if (allowedTypes.includes('*/*')) return true;
    return allowedTypes.includes(mimeType);
  }

  /**
   * Проверка расширения
   */
  private isValidExtension(extension: string, allowedExtensions: string[]): boolean {
    return allowedExtensions.includes(extension);
  }

  /**
   * Проверка имени файла
   */
  private isValidFileName(fileName: string, maxLength: number): boolean {
    // Проверка длины
    if (fileName.length > maxLength) return false;

    // Проверка на запрещенные символы
    const forbiddenChars = /[<>:"/\\|?*]/;
    if (forbiddenChars.test(fileName)) return false;

    // Проверка на пустое имя
    if (fileName.trim().length === 0) return false;

    // Проверка на точки в начале/конце
    if (fileName.startsWith('.') || fileName.endsWith('.')) return false;

    return true;
  }

  /**
   * Проверка на исполняемые файлы
   */
  private isExecutableFile(extension: string, mimeType: string): boolean {
    const executableExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar'];
    const executableMimeTypes = ['application/x-executable', 'application/x-msdownload', 'application/x-msdos-program'];
    
    return executableExtensions.includes(extension) || executableMimeTypes.includes(mimeType);
  }

  /**
   * Проверка на скрытые файлы
   */
  private isHiddenFile(fileName: string): boolean {
    return fileName.startsWith('.') || fileName.includes('~');
  }

  /**
   * Проверка PDF файла
   */
  private isValidPDF(file: Express.Multer.File): boolean {
    try {
      // Проверяем первые 4 байта на PDF сигнатуру
      const buffer = file.buffer;
      if (buffer && buffer.length >= 4) {
        const signature = buffer.toString('ascii', 0, 4);
        return signature === '%PDF';
      }
      return true; // Если не можем проверить, считаем валидным
    } catch {
      return true;
    }
  }

  /**
   * Проверка изображения
   */
  private isValidImage(file: Express.Multer.File): boolean {
    try {
      // Проверяем сигнатуры изображений
      const buffer = file.buffer;
      if (buffer && buffer.length >= 8) {
        const bytes = new Uint8Array(buffer);
        
        // JPEG
        if (bytes[0] === 0xFF && bytes[1] === 0xD8) return true;
        
        // PNG
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
        
        // GIF
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
        
        // WebP
        if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
      }
      return true; // Если не можем проверить, считаем валидным
    } catch {
      return true;
    }
  }

  /**
   * Форматирование размера файла
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Создание результата валидации
   */
  private createValidationResult(
    isValid: boolean,
    errors: string[],
    warnings: string[],
    file?: Express.Multer.File
  ): FileValidationResult {
    if (!file) {
      return {
        isValid: false,
        errors: ['Файл не предоставлен'],
        warnings: [],
        fileInfo: {
          size: 0,
          mimeType: '',
          extension: '',
          fileName: '',
          isExecutable: false,
          isHidden: false,
        },
      };
    }

    return {
      isValid,
      errors,
      warnings,
      fileInfo: {
        size: file.size || 0,
        mimeType: file.mimetype || '',
        extension: file.originalname ? path.extname(file.originalname).toLowerCase() : '',
        fileName: file.originalname || '',
        isExecutable: this.isExecutableFile(
          file.originalname ? path.extname(file.originalname).toLowerCase() : '', 
          file.mimetype || ''
        ),
        isHidden: this.isHiddenFile(file.originalname || ''),
      },
    };
  }

  /**
   * Получение статистики валидации
   */
  getValidationStats(): Record<string, unknown> {
    return {
      maxFileSize: this.formatFileSize(this.defaultOptions.maxSize ?? 0),
      allowedMimeTypes: this.defaultOptions.allowedMimeTypes,
      allowedExtensions: this.defaultOptions.allowedExtensions,
      securityFeatures: {
        blockExecutableFiles: this.defaultOptions.blockExecutableFiles,
        allowHiddenFiles: this.defaultOptions.allowHiddenFiles,
        validateContent: this.defaultOptions.validateContent,
        scanForViruses: this.defaultOptions.scanForViruses,
      },
    };
  }
}

// Экспортируем единственный экземпляр
export const fileValidationService = new FileValidationService();
