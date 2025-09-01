import { AttachmentRepository } from '../repositories/AttachmentRepository';
import type { Attachment } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class AttachmentService {
  private attachmentRepository: AttachmentRepository;
  private uploadDir: string;

  constructor(uploadDir: string = 'uploads') {
    this.attachmentRepository = new AttachmentRepository();
    this.uploadDir = uploadDir;

    // Создаем директорию для загрузок, если она не существует
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async createAttachment(attachmentData: {
    chat_id: number;
    message_id?: number;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    original_name: string;
    metadata?: any;
  }): Promise<Attachment> {
    try {
      const attachment = await this.attachmentRepository.create(attachmentData);
      return attachment;
    } catch (error) {
      console.error('Ошибка создания вложения:', error);
      throw new Error('Не удалось создать вложение');
    }
  }

  async getAttachmentById(id: number): Promise<Attachment | null> {
    try {
      return await this.attachmentRepository.findById(id);
    } catch (error) {
      console.error('Ошибка получения вложения по ID:', error);
      throw new Error('Не удалось получить вложение');
    }
  }

  async getAttachmentsByChatId(chatId: string, limit: number = 100): Promise<Attachment[]> {
    try {
      return await this.attachmentRepository.findByChatId(chatId, limit);
    } catch (error) {
      console.error('Ошибка получения вложений чата:', error);
      throw new Error('Не удалось получить вложения чата');
    }
  }

  async getAttachmentsByMessageId(messageId: number): Promise<Attachment[]> {
    try {
      return await this.attachmentRepository.findByMessageId(messageId);
    } catch (error) {
      console.error('Ошибка получения вложений сообщения:', error);
      throw new Error('Не удалось получить вложения сообщения');
    }
  }

  async updateAttachment(id: number, updates: {
    file_name?: string;
    file_path?: string;
    file_size?: number;
    mime_type?: string;
    original_name?: string;
    metadata?: any;
  }): Promise<Attachment | null> {
    try {
      return await this.attachmentRepository.update(id, updates);
    } catch (error) {
      console.error('Ошибка обновления вложения:', error);
      throw new Error('Не удалось обновить вложение');
    }
  }

  async deleteAttachment(id: number): Promise<boolean> {
    try {
      const attachment = await this.getAttachmentById(id);
      if (attachment) {
        // Удаляем физический файл
        await this.deletePhysicalFile(attachment.file_path);
      }

      return await this.attachmentRepository.delete(id);
    } catch (error) {
      console.error('Ошибка удаления вложения:', error);
      throw new Error('Не удалось удалить вложение');
    }
  }

  async deleteAttachmentsByChatId(chatId: string): Promise<boolean> {
    try {
      const attachments = await this.getAttachmentsByChatId(chatId, 1000);

      // Удаляем физические файлы
      for (const attachment of attachments) {
        await this.deletePhysicalFile(attachment.file_path);
      }

      return await this.attachmentRepository.deleteByChatId(chatId);
    } catch (error) {
      console.error('Ошибка удаления вложений чата:', error);
      throw new Error('Не удалось удалить вложения чата');
    }
  }

  async deleteAttachmentsByMessageId(messageId: number): Promise<boolean> {
    try {
      const attachments = await this.getAttachmentsByMessageId(messageId);

      // Удаляем физические файлы
      for (const attachment of attachments) {
        await this.deletePhysicalFile(attachment.file_path);
      }

      return await this.attachmentRepository.deleteByMessageId(messageId);
    } catch (error) {
      console.error('Ошибка удаления вложений сообщения:', error);
      throw new Error('Не удалось удалить вложения сообщения');
    }
  }

  async getAttachmentsByType(mimeType: string, limit: number = 100): Promise<Attachment[]> {
    try {
      return await this.attachmentRepository.getAttachmentsByType(mimeType, limit);
    } catch (error) {
      console.error('Ошибка получения вложений по типу:', error);
      throw new Error('Не удалось получить вложения по типу');
    }
  }

  async getAttachmentsBySize(minSize: number, maxSize: number, limit: number = 100): Promise<Attachment[]> {
    try {
      return await this.attachmentRepository.getAttachmentsBySize(minSize, maxSize, limit);
    } catch (error) {
      console.error('Ошибка получения вложений по размеру:', error);
      throw new Error('Не удалось получить вложения по размеру');
    }
  }

  async searchAttachments(query: string, chatId?: string, limit: number = 100): Promise<Attachment[]> {
    try {
      // Простой поиск по имени файла
      const allAttachments = chatId
        ? await this.getAttachmentsByChatId(chatId, 1000)
        : await this.attachmentRepository.findAll(1000);

      const searchQuery = query.toLowerCase();
      return allAttachments.filter(attachment =>
        attachment.file_name.toLowerCase().includes(searchQuery) ||
        attachment.original_name.toLowerCase().includes(searchQuery),
      ).slice(0, limit);
    } catch (error) {
      console.error('Ошибка поиска вложений:', error);
      throw new Error('Не удалось выполнить поиск вложений');
    }
  }

  async getAttachmentStats(): Promise<{
    total: number;
    totalSize: number;
    byType: { [key: string]: number };
    bySize: { small: number; medium: number; large: number };
  }> {
    try {
      return await this.attachmentRepository.getAttachmentStats();
    } catch (error) {
      console.error('Ошибка получения статистики вложений:', error);
      throw new Error('Не удалось получить статистику вложений');
    }
  }

  async validateFile(file: { size: number; mimetype: string; originalname: string }): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Проверка размера (максимум 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`Размер файла превышает максимально допустимый: ${maxSize / (1024 * 1024)}MB`);
    }

    // Проверка типа файла
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`Тип файла не поддерживается: ${file.mimetype}`);
    }

    // Проверка расширения
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`Расширение файла не поддерживается: ${fileExtension}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async saveFile(file: Express.Multer.File, chatId: string, messageId?: number): Promise<Attachment> {
    try {
      // Файл уже прошел валидацию в middleware, поэтому просто сохраняем

      // Генерируем уникальное имя файла
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileExtension = path.extname(file.originalname);
      const fileName = `${timestamp}_${randomString}${fileExtension}`;
      const filePath = path.join(this.uploadDir, fileName);

      // Сохраняем файл из buffer
      if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
      } else {
        // Fallback для старых версий multer
        await this.writeFile(file.path, filePath);
      }

      // Создаем запись в базе данных
      const attachment = await this.createAttachment({
        chat_id: Number(chatId),
        message_id: Number(messageId),
        file_name: fileName,
        file_path: filePath,
        file_size: Number(file.size),
        mime_type: file.mimetype,
        original_name: file.originalname,
        metadata: {
          uploaded_at: new Date().toISOString(),
          upload_method: 'manual',
        },
      });

      return attachment;
    } catch (error) {
      console.error('Ошибка сохранения файла:', error);
      throw new Error('Не удалось сохранить файл');
    }
  }

  async getFileStream(attachmentId: number): Promise<{ stream: fs.ReadStream; attachment: Attachment } | null> {
    try {
      const attachment = await this.getAttachmentById(attachmentId);
      if (!attachment) {
        return null;
      }

      if (!fs.existsSync(attachment.file_path)) {
        throw new Error('Файл не найден на диске');
      }

      const stream = fs.createReadStream(attachment.file_path);
      return { stream, attachment };
    } catch (error) {
      console.error('Ошибка получения потока файла:', error);
      throw new Error('Не удалось получить поток файла');
    }
  }

  async getFileBuffer(attachmentId: number): Promise<{ buffer: Buffer; attachment: Attachment } | null> {
    try {
      const attachment = await this.getAttachmentById(attachmentId);
      if (!attachment) {
        return null;
      }

      if (!fs.existsSync(attachment.file_path)) {
        throw new Error('Файл не найден на диске');
      }

      const buffer = fs.readFileSync(attachment.file_path);
      return { buffer, attachment };
    } catch (error) {
      console.error('Ошибка получения буфера файла:', error);
      throw new Error('Не удалось получить буфер файла');
    }
  }

  private async writeFile(sourcePath: string, destinationPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(destinationPath);

      readStream.pipe(writeStream);

      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
      readStream.on('error', reject);
    });
  }

  private async deletePhysicalFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('Не удалось удалить физический файл:', filePath, error);
    }
  }

  async cleanupOrphanedFiles(): Promise<number> {
    try {
      let cleanedCount = 0;

      // Получаем все вложения из базы данных
      const attachments = await this.attachmentRepository.findAll(10000);
      const dbFilePaths = new Set<string>(attachments.map((a: Attachment) => a.file_path));

      // Проверяем все файлы в директории загрузок
      const uploadDir = this.uploadDir;
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);

        for (const file of files) {
          const filePath = path.join(uploadDir, file);
          const stat = fs.statSync(filePath);

          if (stat.isFile()) {
            // Если файл не найден в базе данных, удаляем его
            if (!dbFilePaths.has(filePath)) {
              try {
                fs.unlinkSync(filePath);
                cleanedCount++;
              } catch (error) {
                console.warn('Не удалось удалить орфанный файл:', filePath, error);
              }
            }
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Ошибка очистки орфанных файлов:', error);
      throw new Error('Не удалось очистить орфанные файлы');
    }
  }
}
