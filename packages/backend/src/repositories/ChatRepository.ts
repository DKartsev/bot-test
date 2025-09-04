import { db } from '../database/connection';
import type { Chat, ChatStats, FilterOptions } from '../types';

export class ChatRepository {
    // Получение списка чатов с фильтрацией
  async findWithFilters(filters: FilterOptions): Promise<Chat[]> {
    try {
      // Сначала проверяем существование таблиц
      const tablesCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'conversations'
        ) as conversations_table_exists,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'messages'
        ) as messages_table_exists
      `);

      const { conversations_table_exists, messages_table_exists } = tablesCheck.rows[0];

      if (!conversations_table_exists) {
        console.warn('Таблица conversations не существует, возвращаем пустой массив');
        return [];
      }

      let query = `
        SELECT 
          c.*,
          m.id as message_id,
          m.sender as message_sender,
          m.content as message_content,
          m.created_at as message_created_at,
          m.media_urls as message_media_urls,
          m.media_types as message_media_types
        FROM conversations c
        LEFT JOIN LATERAL (
          SELECT * FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC 
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
        // В новой схеме source не существует, пропускаем
      }

      if (filters.priority && filters.priority.length > 0) {
        // В новой схеме priority не существует, пропускаем
      }

      if (filters.operator_id) {
        query += ` AND c.assignee_id = $${paramIndex++}`;
        params.push(filters.operator_id);
      }

      // Сортировка и пагинация
      query += ' ORDER BY c.last_message_at DESC NULLS LAST';

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
  async findById(id: string): Promise<Chat | null> {
    try {
      const result = await db.query(`
        SELECT 
          c.*,
          m.id as message_id,
          m.sender as message_sender,
          m.content as message_content,
          m.created_at as message_created_at,
          m.media_urls as message_media_urls,
          m.media_types as message_media_types
        FROM conversations c
        LEFT JOIN LATERAL (
          SELECT * FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC 
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
  async create(userTelegramId: number, source: string = 'telegram'): Promise<Chat> {
    try {
      const result = await db.query(`
        INSERT INTO conversations (id, user_telegram_id, status, handoff)
        VALUES (gen_random_uuid(), $1, 'waiting', 'bot')
        RETURNING *
      `, [userTelegramId.toString()]);

      // Получаем полную информацию о чате
      return await this.findById(String(result.rows[0]['id']));
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      throw error;
    }
  }

  // Обновление статуса чата
  async updateStatus(id: string, status: string, operatorId?: number): Promise<Chat | null> {
    try {
      console.log('🔄 ChatRepository.updateStatus вызван с:', { id, status, operatorId });
      const result = await db.query(`
        UPDATE conversations 
        SET status = $1, assignee_id = $2
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
  async takeChat(id: string, operatorId: number): Promise<Chat | null> {
    try {
      const result = await db.query(`
        UPDATE conversations 
        SET status = 'in_progress', assignee_id = $1
        WHERE id = $2 AND status = 'open'
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
  async closeChat(id: string, operatorId: number): Promise<Chat | null> {
    try {
      const result = await db.query(`
        UPDATE conversations 
        SET status = 'closed'
        WHERE id = $1 AND assignee_id = $2
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
  async updatePriority(id: string, priority: string): Promise<Chat | null> {
    try {
      // В новой схеме priority не существует
      console.warn('Приоритет не поддерживается в новой схеме');
      return await this.findById(id);
    } catch (error) {
      console.error('Ошибка обновления приоритета чата:', error);
      throw error;
    }
  }

  // Получение статистики чатов
  async getStats(): Promise<ChatStats> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_chats,
          COUNT(*) FILTER (WHERE status = 'open') as waiting_chats,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_chats,
          COUNT(*) FILTER (WHERE status = 'closed') as closed_chats
        FROM conversations
      `);

      const stats = result.rows[0];

      // Получаем среднее время ответа
      const responseTimeResult = await db.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (m.created_at - c.created_at))) as avg_response_seconds
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        WHERE m.sender = 'operator' 
        AND m.created_at = (
          SELECT MIN(m2.created_at) 
          FROM messages m2 
          WHERE m2.conversation_id = c.id 
          AND m2.sender = 'operator'
        )
      `);

      // Получаем среднее время разрешения
      const resolutionTimeResult = await db.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (c.last_message_at - c.created_at))) as avg_resolution_seconds
        FROM conversations c
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
    // Убеждаемся, что id чата не null
    const chatId = row['id'];
    if (!chatId) {
      console.warn('Chat ID is null, skipping chat:', row);
      throw new Error('Chat ID cannot be null');
    }

    return {
      id: String(chatId), // Используем UUID как строку
      user_id: Number(row['user_telegram_id']),
      user: {
        id: Number(row['user_telegram_id']),
        telegram_id: Number(row['user_telegram_id']),
        username: String(row['user_telegram_id']),
        first_name: String(row['user_telegram_id']),
        last_name: '',
        avatar_url: '',
        balance: 0,
        deals_count: 0,
        flags: [],
        is_blocked: false,
        is_verified: false,
        created_at: new Date(row['created_at'] as string).toISOString(),
        last_activity: new Date(row['last_message_at'] as string || row['created_at'] as string).toISOString(),
      },
      last_message: row['message_id'] ? {
        id: String(row['message_id']), // UUID как строка
        chat_id: String(chatId), // UUID как строка
        conversation_id: String(chatId), // UUID как строка
        sender: String(row['message_sender']),
        content: String(row['message_content'] || ''),
        author_type: String(row['message_sender']) as 'user' | 'bot' | 'operator',
        author_id: String(row['message_sender']), // Используем sender как author_id
        text: String(row['message_content'] || ''), // Добавляем text для совместимости с фронтендом
        timestamp: new Date(row['message_created_at'] as string).toISOString(),
        is_read: true,
        created_at: new Date(row['message_created_at'] as string).toISOString(),
        metadata: {
          source: 'telegram',
          channel: 'default',
          media_urls: row['message_media_urls'] as any || [],
          media_types: row['message_media_types'] as string[] || [],
        },
      } : null,
      status: String(row['status']) as 'waiting' | 'in_progress' | 'closed',
      priority: 'medium', // В новой схеме priority не существует
      source: 'telegram', // В новой схеме source не существует
      operator_id: row['assignee_id'] ? Number(row['assignee_id']) : null,
      is_pinned: false, // В новой схеме не существует
      is_important: false, // В новой схеме не существует
      unread_count: 0, // В новой схеме не существует
      created_at: new Date(row['created_at'] as string).toISOString(),
      updated_at: new Date(row['last_message_at'] as string || row['created_at'] as string).toISOString(),
      tags: [], // В новой схеме tags не существует
      escalation_reason: null, // В новой схеме не существует
    };
  }

  // Добавление тегов к чату (заглушка для совместимости)
  async addTags(chatId: string, tags: string[]): Promise<Chat | null> {
    try {
      // В новой схеме tags не поддерживаются, возвращаем чат без изменений
      console.warn('Теги не поддерживаются в новой схеме');
      return await this.findById(chatId);
    } catch (error) {
      console.error('Ошибка добавления тегов к чату:', error);
      return null;
    }
  }
}
