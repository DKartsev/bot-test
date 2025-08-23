import { db } from '../database/connection';
import type { Attachment } from '../types';
import { logError } from '../utils/logger';

export class AttachmentRepository {
  async findAll(limit: number = 100, offset: number = 0): Promise<Attachment[]> {
    try {
      const result = await db.query<Attachment>(
        'SELECT * FROM attachments ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      );
      return result.rows;
    } catch (error) {
      logError('Ошибка при получении вложений:', error);
      throw new Error('Не удалось получить вложения');
    }
  }

  async findById(id: number): Promise<Attachment | null> {
    try {
      const result = await db.query<Attachment>(
        'SELECT * FROM attachments WHERE id = $1',
        [id],
      );
      return result.rows[0] || null;
    } catch (error) {
      logError('Ошибка при получении вложения по ID:', error);
      throw new Error('Не удалось получить вложение');
    }
  }

  async findByChatId(chatId: number, limit: number = 100): Promise<Attachment[]> {
    try {
      const result = await db.query<Attachment>(
        'SELECT * FROM attachments WHERE chat_id = $1 ORDER BY created_at DESC LIMIT $2',
        [chatId, limit],
      );
      return result.rows;
    } catch (error) {
      logError('Ошибка при получении вложений чата:', error);
      throw new Error('Не удалось получить вложения чата');
    }
  }

  async findByMessageId(messageId: number): Promise<Attachment[]> {
    try {
      const result = await db.query<Attachment>(
        'SELECT * FROM attachments WHERE message_id = $1 ORDER BY created_at ASC',
        [messageId],
      );
      return result.rows;
    } catch (error) {
      logError('Ошибка при получении вложений сообщения:', error);
      throw new Error('Не удалось получить вложения сообщения');
    }
  }

  async create(attachmentData: Record<string, unknown>): Promise<Attachment> {
    try {
      const result = await db.query<Attachment>(
        `INSERT INTO attachments (
          chat_id, message_id, file_name, file_path, file_size, 
          mime_type, original_name, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
                  attachmentData['chat_id'],
        attachmentData['message_id'],
        attachmentData['file_name'],
        attachmentData['file_path'],
        attachmentData['file_size'],
        attachmentData['mime_type'],
        attachmentData['original_name'],
        attachmentData['metadata'] || {},
        ],
      );

      const attachment = result.rows[0];
      if (!attachment) {
        throw new Error('Вложение не было создано');
      }

      return attachment;
    } catch (error) {
      logError('Ошибка при создании вложения:', error);
      throw new Error('Не удалось создать вложение');
    }
  }

  async update(id: number, updates: Record<string, unknown>): Promise<Attachment | null> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates['file_name'] !== undefined) {
        fields.push(`file_name = $${paramIndex}`);
        values.push(updates['file_name']);
        paramIndex++;
      }

      if (updates['file_path'] !== undefined) {
        fields.push(`file_path = $${paramIndex}`);
        values.push(updates['file_path']);
        paramIndex++;
      }

      if (updates['file_size'] !== undefined) {
        fields.push(`file_size = $${paramIndex}`);
        values.push(updates['file_size']);
        paramIndex++;
      }

      if (updates['mime_type'] !== undefined) {
        fields.push(`mime_type = $${paramIndex}`);
        values.push(updates['mime_type']);
        paramIndex++;
      }

      if (updates['original_name'] !== undefined) {
        fields.push(`original_name = $${paramIndex}`);
        values.push(updates['original_name']);
        paramIndex++;
      }

      if (updates['metadata'] !== undefined) {
        fields.push(`metadata = $${paramIndex}`);
        values.push(updates['metadata']);
        paramIndex++;
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const result = await db.query<Attachment>(
        `UPDATE attachments SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
        values,
      );

      return result.rows[0] || null;
    } catch (error) {
      logError('Ошибка при обновлении вложения:', error);
      throw new Error('Не удалось обновить вложение');
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.query(
        'DELETE FROM attachments WHERE id = $1',
        [id],
      );
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logError('Ошибка при удалении вложения:', error);
      throw new Error('Не удалось удалить вложение');
    }
  }

  async deleteByChatId(chatId: number): Promise<boolean> {
    try {
      const result = await db.query(
        'DELETE FROM attachments WHERE chat_id = $1',
        [chatId],
      );
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logError('Ошибка при удалении вложений чата:', error);
      throw new Error('Не удалось удалить вложения чата');
    }
  }

  async deleteByMessageId(messageId: number): Promise<boolean> {
    try {
      const result = await db.query(
        'DELETE FROM attachments WHERE message_id = $1',
        [messageId],
      );
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logError('Ошибка при удалении вложений сообщения:', error);
      throw new Error('Не удалось удалить вложения сообщения');
    }
  }

  async getAttachmentsByType(mimeType: string, limit: number = 100): Promise<Attachment[]> {
    try {
      const result = await db.query<Attachment>(
        'SELECT * FROM attachments WHERE mime_type = $1 ORDER BY created_at DESC LIMIT $2',
        [mimeType, limit],
      );
      return result.rows;
    } catch (error) {
      logError('Ошибка при получении вложений по типу:', error);
      throw new Error('Не удалось получить вложения по типу');
    }
  }

  async getAttachmentsBySize(minSize: number, maxSize: number, limit: number = 100): Promise<Attachment[]> {
    try {
      const result = await db.query<Attachment>(
        'SELECT * FROM attachments WHERE file_size BETWEEN $1 AND $2 ORDER BY file_size DESC LIMIT $3',
        [minSize, maxSize, limit],
      );
      return result.rows;
    } catch (error) {
      logError('Ошибка при получении вложений по размеру:', error);
      throw new Error('Не удалось получить вложения по размеру');
    }
  }

  async getAttachmentStats(): Promise<{
    total: number;
    totalSize: number;
    byType: { [key: string]: number };
    bySize: { small: number; medium: number; large: number };
  }> {
    try {
      const totalResult = await db.query('SELECT COUNT(*), SUM(file_size) FROM attachments');
      const byTypeResult = await db.query(
        'SELECT mime_type, COUNT(*) FROM attachments GROUP BY mime_type',
      );
      const bySizeResult = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE file_size < 1024*1024) as small,
          COUNT(*) FILTER (WHERE file_size >= 1024*1024 AND file_size < 10*1024*1024) as medium,
          COUNT(*) FILTER (WHERE file_size >= 10*1024*1024) as large
        FROM attachments
      `);

      const total = parseInt(String(totalResult.rows[0]?.['count'] || '0'));
      const totalSize = parseInt(String(totalResult.rows[0]?.['sum'] || '0'));

      const byType: { [key: string]: number } = {};
      byTypeResult.rows.forEach((row: Record<string, unknown>) => {
        byType[String(row['mime_type'])] = parseInt(String(row['count']));
      });

      const bySize = {
        small: parseInt(String(bySizeResult.rows[0]?.['small'] || '0')),
        medium: parseInt(String(bySizeResult.rows[0]?.['medium'] || '0')),
        large: parseInt(String(bySizeResult.rows[0]?.['large'] || '0')),
      };

      return { total, totalSize, byType, bySize };
    } catch (error) {
      logError('Ошибка при получении статистики вложений:', error);
      throw new Error('Не удалось получить статистику вложений');
    }
  }
}
