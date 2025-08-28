import express from 'express';
import { requireOperator } from '../middleware/auth';
import { 
  uploadSingleFile, 
  uploadMultipleFiles, 
  uploadFields, 
  fileUploadConfigs,
  getFileValidationStats 
} from '../middleware/fileUpload';
import { rateLimitMiddleware } from '../services/rateLimiter';
import { AttachmentService } from '../services/attachment';
import { logError, logInfo } from '../utils/logger';

const router = express.Router();
const attachmentService = new AttachmentService();

// Helper функция для обертывания async handlers
const asyncHandler = (fn: (req: express.Request, res: express.Response) => Promise<void>) => 
  (req: express.Request, res: express.Response) => { void fn(req, res); };

/**
 * Загрузка одного изображения
 */
router.post('/image', requireOperator, rateLimitMiddleware.fileUpload(), fileUploadConfigs.images('image'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Файл не предоставлен' });
      return;
    }

    const chatId = req.body.chat_id as string;
    if (!chatId) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    // Сохраняем файл
    const attachment = await attachmentService.saveFile(req.file as Express.Multer.File, chatId);
    
    logInfo('Изображение успешно загружено', {
      fileName: (req.file as Express.Multer.File).originalname,
      size: (req.file as Express.Multer.File).size,
      chatId,
    });

    res.json({
      success: true,
      data: {
        attachmentId: attachment.id,
        fileName: (req.file as Express.Multer.File).originalname,
        size: (req.file as Express.Multer.File).size,
        mimeType: (req.file as Express.Multer.File).mimetype,
        chatId,
        timestamp: new Date().toISOString(),
      },
    });
      } catch (error) {
      logError('Ошибка загрузки изображения', {
        fileName: req.file ? (req.file as Express.Multer.File).originalname : undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
        chatId: req.body?.chat_id,
      });
      res.status(500).json({ error: 'Не удалось загрузить изображение' });
    }
}));

/**
 * Загрузка нескольких изображений
 */
router.post('/images', requireOperator, rateLimitMiddleware.fileUpload(), uploadMultipleFiles('images', {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  maxFiles: 10,
  validateContent: true,
  blockExecutableFiles: true,
}), asyncHandler(async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ error: 'Файлы не предоставлены' });
      return;
    }

    const chatId = req.body.chat_id as string;
    if (!chatId) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    // Сохраняем все файлы
    const attachments = [];
    for (const file of req.files) {
      try {
        const attachment = await attachmentService.saveFile(file as Express.Multer.File, chatId);
        attachments.push(attachment);
      } catch (error) {
        logError('Ошибка сохранения файла', {
          fileName: (file as Express.Multer.File).originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logInfo('Изображения успешно загружены', {
      fileCount: req.files.length,
      successCount: attachments.length,
      chatId,
    });

    res.json({
      success: true,
      data: attachments,
      validation: (req as any).fileValidation,
      summary: {
        total: req.files.length,
        successful: attachments.length,
        failed: req.files.length - attachments.length,
      },
    });
  } catch (error) {
    logError('Ошибка загрузки изображений', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileCount: req.files?.length,
    });
    res.status(500).json({ error: 'Не удалось загрузить изображения' });
  }
}));

/**
 * Загрузка документа
 */
router.post('/document', requireOperator, rateLimitMiddleware.fileUpload(), fileUploadConfigs.documents('document'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Файл не предоставлен' });
      return;
    }

    const chatId = req.body.chat_id as string;
    if (!chatId) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    // Сохраняем файл
    const attachment = await attachmentService.saveFile(req.file as Express.Multer.File, chatId);
    
    logInfo('Документ успешно загружен', {
      fileName: (req.file as Express.Multer.File).originalname,
      size: (req.file as Express.Multer.File).size,
      chatId,
    });

    res.json({
      success: true,
      data: {
        attachmentId: attachment.id,
        fileName: (req.file as Express.Multer.File).originalname,
        size: (req.file as Express.Multer.File).size,
        mimeType: (req.file as Express.Multer.File).mimetype,
        chatId,
        timestamp: new Date().toISOString(),
      },
    });
      } catch (error) {
      logError('Ошибка загрузки документа', {
        fileName: req.file ? (req.file as Express.Multer.File).originalname : undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
        chatId: req.body?.chat_id,
      });
      res.status(500).json({ error: 'Не удалось загрузить документ' });
    }
}));

/**
 * Загрузка архива
 */
router.post('/archive', requireOperator, fileUploadConfigs.archives('archive'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Файл не предоставлен' });
      return;
    }

    const chatId = req.body.chat_id as string;
    if (!chatId) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    // Сохраняем файл
    const attachment = await attachmentService.saveFile(req.file as Express.Multer.File, chatId);
    
    logInfo('Архив успешно загружен', {
      fileName: (req.file as Express.Multer.File).originalname,
      size: (req.file as Express.Multer.File).size,
      chatId,
    });

    res.json({
      success: true,
      data: {
        attachmentId: attachment.id,
        fileName: (req.file as Express.Multer.File).originalname,
        size: (req.file as Express.Multer.File).size,
        mimeType: (req.file as Express.Multer.File).mimetype,
        chatId,
        timestamp: new Date().toISOString(),
      },
    });
      } catch (error) {
      logError('Ошибка загрузки архива', {
        fileName: req.file ? (req.file as Express.Multer.File).originalname : undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
        chatId: req.body?.chat_id,
      });
      res.status(500).json({ error: 'Не удалось загрузить архив' });
    }
}));

/**
 * Загрузка медиа файла
 */
router.post('/media', requireOperator, fileUploadConfigs.media('media'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Файл не предоставлен' });
      return;
    }

    const chatId = req.body.chat_id as string;
    if (!chatId) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    // Сохраняем файл
    const attachment = await attachmentService.saveFile(req.file as Express.Multer.File, chatId);
    
    logInfo('Медиа файл успешно загружен', {
      fileName: (req.file as Express.Multer.File).originalname,
      size: (req.file as Express.Multer.File).size,
      chatId,
    });

    res.json({
      success: true,
      data: {
        attachmentId: attachment.id,
        fileName: (req.file as Express.Multer.File).originalname,
        size: (req.file as Express.Multer.File).size,
        mimeType: (req.file as Express.Multer.File).mimetype,
        chatId,
        timestamp: new Date().toISOString(),
      },
    });
      } catch (error) {
      logError('Ошибка загрузки медиа файла', {
        fileName: req.file ? (req.file as Express.Multer.File).originalname : undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
        chatId: req.body?.chat_id,
      });
      res.status(500).json({ error: 'Не удалось загрузить медиа файл' });
    }
}));

/**
 * Загрузка файлов с разными полями (например, изображение + документ)
 */
router.post('/mixed', requireOperator, uploadFields([
  { name: 'image', maxCount: 1 },
  { name: 'document', maxCount: 1 },
  { name: 'attachments', maxCount: 5 },
], {
  maxSize: 20 * 1024 * 1024, // 20MB
  allowedMimeTypes: [
    'image/*', 'application/pdf', 'text/*', 
    'application/zip', 'application/x-rar-compressed'
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.zip', '.rar'
  ],
  validateContent: true,
  blockExecutableFiles: true,
}), asyncHandler(async (req, res) => {
  try {
    const chatId = req.body.chat_id as string;
    if (!chatId) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const allAttachments = [];
    const files = req.files as Record<string, Express.Multer.File[]>;

    // Обрабатываем изображение
    if (files.image && files.image.length > 0) {
      try {
        const attachment = await attachmentService.saveFile(files.image[0] as Express.Multer.File, chatId);
        allAttachments.push({ type: 'image', attachment });
      } catch (error) {
        logError('Ошибка сохранения изображения', {
          fileName: files.image[0].originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Обрабатываем документ
    if (files.document && files.document.length > 0) {
      try {
        const attachment = await attachmentService.saveFile(files.document[0] as Express.Multer.File, chatId);
        allAttachments.push({ type: 'document', attachment });
      } catch (error) {
        logError('Ошибка сохранения документа', {
          fileName: files.document[0].originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Обрабатываем дополнительные вложения
    if (files.attachments && files.attachments.length > 0) {
      for (const file of files.attachments) {
        try {
          const attachment = await attachmentService.saveFile(file as Express.Multer.File, chatId);
          allAttachments.push({ type: 'attachment', attachment });
        } catch (error) {
          logError('Ошибка сохранения вложения', {
            fileName: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    logInfo('Смешанные файлы успешно загружены', {
      totalFiles: Object.values(files).flat().length,
      successfulUploads: allAttachments.length,
      chatId,
    });

    res.json({
      success: true,
      data: allAttachments,
      validation: (req as any).fileValidation,
      summary: {
        total: Object.values(files).flat().length,
        successful: allAttachments.length,
        byType: allAttachments.reduce((acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    logError('Ошибка загрузки смешанных файлов', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось загрузить файлы' });
  }
}));

/**
 * Получение статистики валидации файлов
 */
router.get('/validation-stats', requireOperator, getFileValidationStats);

/**
 * Получение информации о загруженном файле
 */
router.get('/file/:id', requireOperator, asyncHandler(async (req, res) => {
  try {
    const fileId = parseInt(req.params.id || '0');
    if (isNaN(fileId) || fileId <= 0) {
      res.status(400).json({ error: 'Недействительный ID файла' });
      return;
    }

    const attachment = await attachmentService.getAttachmentById(fileId);
    if (!attachment) {
      res.status(404).json({ error: 'Файл не найден' });
      return;
    }

    res.json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    logError('Ошибка получения информации о файле', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileId: req.params.id,
    });
    res.status(500).json({ error: 'Не удалось получить информацию о файле' });
  }
}));

/**
 * Скачивание файла
 */
router.get('/download/:id', requireOperator, asyncHandler(async (req, res) => {
  try {
    const fileId = parseInt(req.params.id || '0');
    if (isNaN(fileId) || fileId <= 0) {
      res.status(400).json({ error: 'Недействительный ID файла' });
      return;
    }

    const fileStream = await attachmentService.getFileStream(fileId);
    if (!fileStream) {
      res.status(404).json({ error: 'Файл не найден' });
      return;
    }

    const { stream, attachment } = fileStream;

    // Устанавливаем заголовки для скачивания
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);
    res.setHeader('Content-Length', attachment.file_size.toString());

    // Отправляем файл
    stream.pipe(res);

    logInfo('Файл скачан', {
      fileName: attachment.original_name,
      fileId,
      size: attachment.file_size,
    });

  } catch (error) {
    logError('Ошибка скачивания файла', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileId: req.params.id,
    });
    res.status(500).json({ error: 'Не удалось скачать файл' });
  }
}));

/**
 * Удаление файла
 */
router.delete('/file/:id', requireOperator, asyncHandler(async (req, res) => {
  try {
    const fileId = parseInt(req.params.id || '0');
    if (isNaN(fileId) || fileId <= 0) {
      res.status(400).json({ error: 'Недействительный ID файла' });
      return;
    }

    const success = await attachmentService.deleteAttachment(fileId);
    if (!success) {
      res.status(404).json({ error: 'Файл не найден' });
      return;
    }

    logInfo('Файл удален', { fileId });

    res.json({
      success: true,
      message: 'Файл успешно удален',
    });
  } catch (error) {
    logError('Ошибка удаления файла', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileId: req.params.id,
    });
    res.status(500).json({ error: 'Не удалось удалить файл' });
  }
}));

export default router;
