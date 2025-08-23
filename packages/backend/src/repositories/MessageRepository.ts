import { db } from '../database/connection';
import type { Message } from '../types';

export class MessageRepository {
  async findById(id: number): Promise<Message> {
    try {
      const result = await db.query<Message>(`
        SELECT * FROM messages WHERE id = $1
      `, [id]);

      const message = result.rows[0];
      if (!message) {
        throw new Error('Сообщение не найдено');
      }
      return message;
    } catch (error) {
      console.error('Ошибка получения сообщения по ID:', error);
      throw error;
    }
  }

  async findByChatId(chatId: number, limit: number = 100, offset: number = 0): Promise<Message[]> {
    try {
      const result = await db.query<Message>(`
        SELECT * FROM messages 
        WHERE chat_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2 OFFSET $3
      `, [chatId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения сообщений чата:', error);
      throw error;
    }
  }

  async findLatestByChatId(chatId: number): Promise<Message> {
    try {
      const result = await db.query<Message>(`
        SELECT * FROM messages 
        WHERE chat_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [chatId]);

      const message = result.rows[0];
      if (!message) {
        throw new Error('Сообщение не найдено');
      }
      return message;
    } catch (error) {
      console.error('Ошибка получения последнего сообщения чата:', error);
      throw error;
    }
  }

  async findUnreadByChatId(chatId: number): Promise<Message[]> {
    try {
      const result = await db.query<Message>(`
        SELECT * FROM messages 
        WHERE chat_id = $1 AND is_read = false 
        ORDER BY timestamp ASC
      `, [chatId]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения непрочитанных сообщений:', error);
      throw error;
    }
  }

  // Создание нового сообщения
  async create(messageData: Partial<Message>): Promise<Message> {
    try {
      const result = await db.query<Message>(`
        INSERT INTO messages (chat_id, author_type, author_id, text, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        messageData.chat_id,
        messageData.author_type,
        messageData.author_id,
        messageData.text,
        messageData.metadata || {},
      ]);

      const message = result.rows[0];
      if (!message) {
        throw new Error('Сообщение не было создано');
      }
      return message;
    } catch (error) {
      console.error('Ошибка создания сообщения:', error);
      throw error;
    }
  }

  // Создание сообщения от бота
  async createBotMessage(chatId: number, text: string, metadata?: any): Promise<Message> {
    try {
      const result = await db.query<Message>(`
        INSERT INTO messages (chat_id, author_type, author_id, text, metadata)
        VALUES ($1, 'bot', NULL, $2, $3)
        RETURNING *
      `, [chatId, text, metadata || {}]);

      const message = result.rows[0];
      if (!message) {
        throw new Error('Сообщение бота не было создано');
      }
      return message;
    } catch (error) {
      console.error('Ошибка создания сообщения бота:', error);
      throw error;
    }
  }

  // Создание сообщения от оператора
  async createOperatorMessage(chatId: number, operatorId: number, text: string, metadata?: any): Promise<Message> {
    try {
      const result = await db.query<Message>(`
        INSERT INTO messages (chat_id, author_type, author_id, text, metadata)
        VALUES ($1, 'operator', $2, $3, $4)
        RETURNING *
      `, [chatId, operatorId, text, metadata || {}]);

      const message = result.rows[0];
      if (!message) {
        throw new Error('Сообщение оператора не было создано');
      }
      return message;
    } catch (error) {
      console.error('Ошибка создания сообщения оператора:', error);
      throw error;
    }
  }

  // Создание сообщения от пользователя
  async createUserMessage(chatId: number, userId: number, text: string, metadata?: any): Promise<Message> {
    try {
      const result = await db.query<Message>(`
        INSERT INTO messages (chat_id, author_type, author_id, text, metadata)
        VALUES ($1, 'user', $2, $3, $4)
        RETURNING *
      `, [chatId, userId, text, metadata || {}]);

      const message = result.rows[0];
      if (!message) {
        throw new Error('Сообщение пользователя не было создано');
      }
      return message;
    } catch (error) {
      console.error('Ошибка создания сообщения пользователя:', error);
      throw error;
    }
  }

  // Обновление статуса прочтения сообщения
  async markAsRead(messageId: number): Promise<void> {
    try {
      await db.query(`
        UPDATE messages 
        SET is_read = true 
        WHERE id = $1
      `, [messageId]);
    } catch (error) {
      console.error('Ошибка обновления статуса сообщения:', error);
      throw error;
    }
  }

  // Получение количества непрочитанных сообщений для чата
  async getUnreadCount(chatId: number): Promise<number> {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM messages 
        WHERE chat_id = $1 AND is_read = false
      `, [chatId]);

      return parseInt(String(result.rows[0]['count']));
    } catch (error) {
      console.error('Ошибка получения количества непрочитанных сообщений:', error);
      return 0;
    }
  }

  // Поиск сообщений по тексту
  async searchByText(chatId: number, query: string, limit: number = 20): Promise<Message[]> {
    try {
      const result = await db.query<Message>(`
        SELECT * FROM messages 
        WHERE chat_id = $1 AND text ILIKE $2
        ORDER BY timestamp DESC 
        LIMIT $3
      `, [chatId, `%${query}%`, limit]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка поиска сообщений по тексту:', error);
      throw error;
    }
  }

  // Получение последнего сообщения чата
  async getLastMessage(chatId: number): Promise<Message | null> {
    try {
      const result = await db.query<Message>(`
        SELECT * FROM messages 
        WHERE chat_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [chatId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Ошибка получения последнего сообщения:', error);
      return null;
    }
  }

  // Получение сообщений по типу автора
  async findByAuthorType(chatId: number, authorType: string, limit: number = 20): Promise<Message[]> {
    try {
      const result = await db.query<Message>(`
        SELECT * FROM messages 
        WHERE chat_id = $1 AND author_type = $2
        ORDER BY timestamp DESC 
        LIMIT $3
      `, [chatId, authorType, limit]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения сообщений по типу автора:', error);
      throw error;
    }
  }

  // Получение сообщений за период
  async findByDateRange(chatId: number, startDate: Date, endDate: Date): Promise<Message[]> {
    try {
      const result = await db.query<Message>(`
        SELECT * FROM messages 
        WHERE chat_id = $1 AND timestamp BETWEEN $2 AND $3
        ORDER BY timestamp ASC
      `, [chatId, startDate, endDate]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения сообщений за период:', error);
      throw error;
    }
  }

  // Обновление сообщения
  async update(id: number, updates: Partial<Message>): Promise<Message | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.text !== undefined) {
        fields.push(`text = $${paramIndex++}`);
        values.push(updates.text);
      }
      if (updates.is_read !== undefined) {
        fields.push(`is_read = $${paramIndex++}`);
        values.push(updates.is_read);
      }
      if (updates.metadata !== undefined) {
        fields.push(`metadata = $${paramIndex++}`);
        values.push(updates.metadata);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      values.push(id);
      const result = await db.query<Message>(`
        UPDATE messages 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      const updatedMessage = result.rows[0];
      return updatedMessage || null;
    } catch (error) {
      console.error('Ошибка обновления сообщения:', error);
      throw error;
    }
  }

  // Удаление сообщения (только для администраторов)
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.query(`
        DELETE FROM messages WHERE id = $1
      `, [id]);

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
      throw error;
    }
  }

  // Получение статистики сообщений
  async getStats(chatId: number): Promise<{
    total: number;
    user: number;
    bot: number;
    operator: number;
    unread: number;
  }> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE author_type = 'user') as user,
          COUNT(*) FILTER (WHERE author_type = 'bot') as bot,
          COUNT(*) FILTER (WHERE author_type = 'operator') as operator,
          COUNT(*) FILTER (WHERE is_read = false) as unread
        FROM messages 
        WHERE chat_id = $1
      `, [chatId]);

      const stats = result.rows[0];
      return {
        total: parseInt(String(stats['total'])),
        user: parseInt(String(stats['user'])),
        bot: parseInt(String(stats['bot'])),
        operator: parseInt(String(stats['operator'])),
        unread: parseInt(String(stats['unread'])),
      };
    } catch (error) {
      console.error('Ошибка получения статистики сообщений:', error);
      throw error;
    }
  }

  // Выполнение произвольного SQL запроса
  async findByQuery(query: string, params: unknown[] = []): Promise<Message[]> {
    try {
      const result = await db.query<Message>(query, params);
      return result.rows;
    } catch (error) {
      console.error('Ошибка выполнения запроса:', error);
      throw error;
    }
  }
}
