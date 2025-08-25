import { db } from '../database/connection';
import type { Chat, ChatStats, FilterOptions } from '../types';

export class ChatRepository {
  // Получение списка чатов с фильтрацией
  async findWithFilters(filters: FilterOptions): Promise<Chat[]> {
    try {
      let query = `
        SELECT 
          c.*,
          u.id as user_id,
          u.telegram_id,
          u.username,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.balance,
          u.deals_count,
          u.flags,
          u.is_blocked,
          u.is_verified,
          u.created_at as user_created_at,
          u.last_activity,
          m.id as message_id,
          m.author_type as message_author_type,
          m.author_id as message_author_id,
          m.text as message_text,
          m.timestamp as message_timestamp,
          m.is_read as message_is_read,
          m.metadata as message_metadata
        FROM support_chats c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN LATERAL (
          SELECT * FROM messages 
          WHERE chat_id = c.id 
          ORDER BY timestamp DESC 
          LIMIT 1
        ) m ON true
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      // Применяем фильтры
      if (filters.status && filters.status.length > 0) {
        query += ` AND c.status = ANY($${paramIndex++})`;
        params.push(filters.status);
      }

      if (filters.source && filters.source.length > 0) {
        query += ` AND c.source = ANY($${paramIndex++})`;
        params.push(filters.source);
      }

      if (filters.priority && filters.priority.length > 0) {
        query += ` AND c.priority = ANY($${paramIndex++})`;
        params.push(filters.priority);
      }

      if (filters.operator_id) {
        query += ` AND c.operator_id = $${paramIndex++}`;
        params.push(filters.operator_id);
      }

      // Сортировка и пагинация
      query += ' ORDER BY c.updated_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      }

      if (filters.page && filters.limit) {
        query += ` OFFSET $${paramIndex++}`;
        params.push((filters.page - 1) * filters.limit);
      }

      const result = await db.query(query, params);

      // Преобразуем результат в объекты Chat
      return result.rows.map((row: Record<string, unknown>) => this.mapRowToChat(row));
    } catch (error) {
      console.error('Ошибка получения чатов с фильтрами:', error);
      throw error;
    }
  }

  // Получение конкретного чата
  async findById(id: number): Promise<Chat | null> {
    try {
      const result = await db.query(`
        SELECT 
          c.*,
          u.id as user_id,
          u.telegram_id,
          u.username,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.balance,
          u.deals_count,
          u.flags,
          u.is_blocked,
          u.is_verified,
          u.created_at as user_created_at,
          u.last_activity,
          m.id as message_id,
          m.author_type as message_author_type,
          m.author_id as message_author_id,
          m.text as message_text,
          m.timestamp as message_timestamp,
          m.is_read as message_is_read,
          m.metadata as message_metadata
        FROM support_chats c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN LATERAL (
          SELECT * FROM messages 
          WHERE chat_id = c.id 
          ORDER BY timestamp DESC 
          LIMIT 1
        ) m ON true
        WHERE c.id = $1
      `, [id]);

      if (result.rows.length === 0) return null;

      return this.mapRowToChat(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      console.error('Ошибка получения чата по ID:', error);
      throw error;
    }
  }

  // Создание нового чата
  async create(userId: number, source: string = 'telegram'): Promise<Chat> {
    try {
      const result = await db.query(`
        INSERT INTO chats (user_id, source, status, priority, tags)
        VALUES ($1, $2, 'waiting', 'medium', '{}')
        RETURNING *
      `, [userId, source]);

      // Получаем полную информацию о чате
      return await this.findById(Number(result.rows[0]['id']));
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      throw error;
    }
  }

  // Обновление статуса чата
  async updateStatus(id: number, status: string, operatorId?: number): Promise<Chat | null> {
    try {
      const result = await db.query(`
        UPDATE chats 
        SET status = $1, operator_id = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [status, operatorId, id]);

      if (result.rows.length === 0) return null;

      return await this.findById(id);
    } catch (error) {
      console.error('Ошибка обновления статуса чата:', error);
      throw error;
    }
  }

  // Принятие чата в работу
  async takeChat(id: number, operatorId: number): Promise<Chat | null> {
    try {
      const result = await db.query(`
        UPDATE chats 
        SET status = 'in_progress', operator_id = $1, updated_at = NOW()
        WHERE id = $2 AND status = 'waiting'
        RETURNING *
      `, [operatorId, id]);

      if (result.rows.length === 0) return null;

      return await this.findById(id);
    } catch (error) {
      console.error('Ошибка принятия чата в работу:', error);
      throw error;
    }
  }

  // Закрытие чата
  async closeChat(id: number, operatorId: number): Promise<Chat | null> {
    try {
      const result = await db.query(`
        UPDATE chats 
        SET status = 'closed', updated_at = NOW()
        WHERE id = $1 AND operator_id = $2
        RETURNING *
      `, [id, operatorId]);

      if (result.rows.length === 0) return null;

      return await this.findById(id);
    } catch (error) {
      console.error('Ошибка закрытия чата:', error);
      throw error;
    }
  }

  // Обновление приоритета чата
  async updatePriority(id: number, priority: string): Promise<Chat | null> {
    try {
      const result = await db.query(`
        UPDATE chats 
        SET priority = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [priority, id]);

      if (result.rows.length === 0) return null;

      return await this.findById(id);
    } catch (error) {
      console.error('Ошибка обновления приоритета чата:', error);
      throw error;
    }
  }

  // Добавление тегов к чату
  async addTags(id: number, tags: string[]): Promise<Chat | null> {
    try {
      const result = await db.query(`
        UPDATE chats 
        SET tags = array_cat(tags, $1), updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [tags, id]);

      if (result.rows.length === 0) return null;

      return await this.findById(id);
    } catch (error) {
      console.error('Ошибка добавления тегов к чату:', error);
      throw error;
    }
  }

  // Получение статистики чатов
  async getStats(): Promise<ChatStats> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_chats,
          COUNT(*) FILTER (WHERE status = 'waiting') as waiting_chats,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_chats,
          COUNT(*) FILTER (WHERE status = 'closed') as closed_chats
        FROM support_chats
      `);

      const stats = result.rows[0];

      // Получаем среднее время ответа
      const responseTimeResult = await db.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (m.timestamp - c.created_at))) as avg_response_seconds
        FROM support_chats c
        JOIN messages m ON c.id = m.chat_id
        WHERE m.author_type = 'operator' 
        AND m.id = (
          SELECT MIN(m2.id) 
          FROM messages m2 
          WHERE m2.chat_id = c.id 
          AND m2.author_type = 'operator'
        )
      `);

      // Получаем среднее время разрешения
      const resolutionTimeResult = await db.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at))) as avg_resolution_seconds
        FROM support_chats c
        WHERE c.status = 'closed'
      `);

      const avgResponseSeconds = responseTimeResult.rows[0]?.avg_response_seconds || 0;
      const avgResolutionSeconds = resolutionTimeResult.rows[0]?.avg_resolution_seconds || 0;

      return {
        total_chats: parseInt(String(stats['total_chats'])),
        waiting_chats: parseInt(String(stats['waiting_chats'])),
        in_progress_chats: parseInt(String(stats['in_progress_chats'])),
        closed_chats: parseInt(String(stats['closed_chats'])),
        avg_response_time: Math.round(avgResponseSeconds / 60), // в минутах
        avg_resolution_time: Math.round(avgResolutionSeconds / 60), // в минутах
      };
    } catch (error) {
      console.error('Ошибка получения статистики чатов:', error);
      throw error;
    }
  }

  // Преобразование строки БД в объект Chat
  private mapRowToChat(row: Record<string, unknown>): Chat {
    return {
      id: Number(row['id']),
      user_id: Number(row['user_id']),
      user: {
        id: Number(row['user_id']),
        telegram_id: Number(row['telegram_id']),
        username: String(row['username']),
        first_name: String(row['first_name']),
        last_name: String(row['last_name']),
        avatar_url: String(row['avatar_url']),
        balance: parseFloat(String(row['balance'])),
        deals_count: parseInt(String(row['deals_count'])),
        flags: row['flags'] as string[] || [],
        is_blocked: Boolean(row['is_blocked']),
        is_verified: Boolean(row['is_verified']),
        created_at: new Date(row['user_created_at'] as string).toISOString(),
        last_activity: new Date(row['last_activity'] as string).toISOString(),
      },
      last_message: {
        id: Number(row['message_id']),
        chat_id: Number(row['id']),
        author_type: String(row['message_author_type']) as 'user' | 'bot' | 'operator',
        author_id: Number(row['message_author_id']),
        text: String(row['message_text']),
        timestamp: new Date(row['message_timestamp'] as string).toISOString(),
        is_read: Boolean(row['message_is_read']),
        metadata: {
          ...(row['message_metadata'] as Record<string, unknown>),
          source: String(row['source'] || 'telegram'),
          channel: String(row['channel'] || 'default'),
        },
      },
      status: String(row['status']) as 'waiting' | 'in_progress' | 'closed' | 'waiting_for_operator',
      priority: String(row['priority']) as 'low' | 'medium' | 'high' | 'urgent',
      source: String(row['source']) as 'telegram' | 'website' | 'p2p',
      operator_id: row['operator_id'] ? Number(row['operator_id']) : null,
      is_pinned: Boolean(row['is_pinned']),
      is_important: Boolean(row['is_important']),
      unread_count: Number(row['unread_count']),
      created_at: new Date(row['created_at'] as string).toISOString(),
      updated_at: new Date(row['updated_at'] as string).toISOString(),
      tags: row['tags'] as string[] || [],
      escalation_reason: row['escalation_reason'] ? String(row['escalation_reason']) : null,
    };
  }
}
