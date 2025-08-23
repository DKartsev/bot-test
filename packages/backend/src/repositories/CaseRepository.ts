import { db } from '../database/connection';
import type { Case } from '../types';

export class CaseRepository {
  // Получение кейса по ID
  async findById(id: number): Promise<Case | null> {
    try {
      const result = await db.query<Case>(`
        SELECT * FROM cases WHERE id = $1
      `, [id]);

      const caseItem = result.rows[0];
      return caseItem || null;
    } catch (error) {
      console.error('Ошибка получения кейса по ID:', error);
      throw error;
    }
  }

  // Получение кейсов чата
  async findByChatId(chatId: number): Promise<Case[]> {
    try {
      const result = await db.query<Case>(`
        SELECT c.*, o.name as operator_name
        FROM cases c
        JOIN operators o ON c.assigned_to = o.id
        WHERE c.chat_id = $1
        ORDER BY c.created_at DESC
      `, [chatId]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения кейсов чата:', error);
      throw error;
    }
  }

  // Получение кейсов оператора
  async findByOperatorId(operatorId: number): Promise<Case[]> {
    try {
      const result = await db.query<Case>(`
        SELECT c.*, ch.id as chat_id
        FROM cases c
        JOIN chats ch ON c.chat_id = ch.id
        WHERE c.assigned_to = $1
        ORDER BY c.created_at DESC
      `, [operatorId]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения кейсов оператора:', error);
      throw error;
    }
  }

  // Получение всех кейсов с фильтрацией
  async findAll(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    operatorId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Case[]> {
    try {
      let query = `
        SELECT c.*, o.name as operator_name, ch.id as chat_id
        FROM cases c
        JOIN operators o ON c.assigned_to = o.id
        JOIN chats ch ON c.chat_id = ch.id
        WHERE 1=1
      `;
      const values: any[] = [];
      let paramIndex = 1;

      if (filters?.status) {
        query += ` AND c.status = $${paramIndex++}`;
        values.push(filters.status);
      }
      if (filters?.priority) {
        query += ` AND c.priority = $${paramIndex++}`;
        values.push(filters.priority);
      }
      if (filters?.category) {
        query += ` AND c.category = $${paramIndex++}`;
        values.push(filters.category);
      }
      if (filters?.operatorId) {
        query += ` AND c.assigned_to = $${paramIndex++}`;
        values.push(filters.operatorId);
      }

      query += ' ORDER BY c.created_at DESC';

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(filters.limit);
      }
      if (filters?.offset) {
        query += ` OFFSET $${paramIndex++}`;
        values.push(filters.offset);
      }

      const result = await db.query<Case>(query, values);
      return result.rows;
    } catch (error) {
      console.error('Ошибка получения всех кейсов:', error);
      throw error;
    }
  }

  // Создание нового кейса
  async create(caseData: Record<string, unknown>): Promise<Case> {
    try {
      const result = await db.query<Case>(`
        INSERT INTO cases (
          chat_id, title, description, status, priority, assigned_to, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *
      `, [
        caseData['chat_id'],
        caseData['title'],
        caseData['description'],
        caseData['status'] || 'open',
        caseData['priority'] || 'medium',
        caseData['assigned_to'],
        caseData['created_by'],
      ]);

      const newCase = result.rows[0];
      if (!newCase) {
        throw new Error('Кейс не был создан');
      }
      return newCase;
    } catch (error) {
      console.error('Ошибка создания кейса:', error);
      throw error;
    }
  }

  // Обновление кейса
  async update(id: number, updates: Partial<Case>): Promise<Case | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.priority !== undefined) {
        fields.push(`priority = $${paramIndex++}`);
        values.push(updates.priority);
      }
      if (updates.assigned_to !== undefined) {
        fields.push(`assigned_to = $${paramIndex++}`);
        values.push(updates.assigned_to);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      values.push(id);
      const result = await db.query<Case>(`
        UPDATE cases 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      const updatedCase = result.rows[0];
      return updatedCase || null;
    } catch (error) {
      console.error('Ошибка обновления кейса:', error);
      throw error;
    }
  }

  // Удаление кейса
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.query(`
        DELETE FROM cases WHERE id = $1
      `, [id]);

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Ошибка удаления кейса:', error);
      throw error;
    }
  }

  // Изменение статуса кейса
  async updateStatus(id: number, status: string): Promise<Case | null> {
    try {
      const result = await db.query<Case>(`
        UPDATE cases 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [status, id]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Ошибка изменения статуса кейса:', error);
      throw error;
    }
  }

  // Изменение приоритета кейса
  async updatePriority(id: number, priority: string): Promise<Case | null> {
    try {
      const result = await db.query<Case>(`
        UPDATE cases 
        SET priority = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [priority, id]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Ошибка изменения приоритета кейса:', error);
      throw error;
    }
  }

  // Добавление тегов к кейсу
  async addTags(id: number, tags: string[]): Promise<Case | null> {
    try {
      const result = await db.query<Case>(`
        UPDATE cases 
        SET tags = array_append(tags, $1), updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [tags, id]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Ошибка добавления тегов к кейсу:', error);
      throw error;
    }
  }

  // Поиск кейсов по тексту
  async search(query: string): Promise<Case[]> {
    try {
      const result = await db.query<Case>(`
        SELECT c.*, o.name as operator_name
        FROM cases c
        JOIN operators o ON c.assigned_to = o.id
        WHERE c.title ILIKE $1 OR c.description ILIKE $1
        ORDER BY c.created_at DESC
      `, [`%${query}%`]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка поиска кейсов:', error);
      throw error;
    }
  }

  // Получение кейсов по статусу
  async findByStatus(status: string): Promise<Case[]> {
    try {
      const result = await db.query<Case>(`
        SELECT c.*, o.name as operator_name
        FROM cases c
        JOIN operators o ON c.assigned_to = o.id
        WHERE c.status = $1
        ORDER BY c.created_at DESC
      `, [status]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения кейсов по статусу:', error);
      throw error;
    }
  }

  // Получение кейсов по приоритету
  async findByPriority(priority: string): Promise<Case[]> {
    try {
      const result = await db.query<Case>(`
        SELECT c.*, o.name as operator_name
        FROM cases c
        JOIN operators o ON c.assigned_to = o.id
        WHERE c.priority = $1
        ORDER BY c.created_at DESC
      `, [priority]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения кейсов по приоритету:', error);
      throw error;
    }
  }

  // Получение кейсов по категории
  async findByCategory(category: string): Promise<Case[]> {
    try {
      const result = await db.query<Case>(`
        SELECT c.*, o.name as operator_name
        FROM cases c
        JOIN operators o ON c.assigned_to = o.id
        WHERE c.category = $1
        ORDER BY c.created_at DESC
      `, [category]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения кейсов по категории:', error);
      throw error;
    }
  }

  // Получение статистики кейсов
  async getStats(): Promise<{
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    by_priority: Record<string, number>;
    by_category: Record<string, number>;
  }> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'open') as open,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE status = 'closed') as closed,
          priority,
          COUNT(*) as priority_count,
          category,
          COUNT(*) as category_count
        FROM cases
        GROUP BY priority, category
      `);

      const stats = {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        by_priority: {} as Record<string, number>,
        by_category: {} as Record<string, number>,
      };

      result.rows.forEach((row: Record<string, unknown>) => {
        stats.total += parseInt(String(row['total']));
        stats.open += parseInt(String(row['open']));
        stats.in_progress += parseInt(String(row['in_progress']));
        stats.resolved += parseInt(String(row['resolved']));
        stats.closed += parseInt(String(row['closed']));
        stats.by_priority[String(row['priority'])] = parseInt(String(row['priority_count']));
        stats.by_category[String(row['category'])] = parseInt(String(row['category_count']));
      });

      return stats;
    } catch (error) {
      console.error('Ошибка получения статистики кейсов:', error);
      throw error;
    }
  }

  // Получение кейсов за период
  async findByDateRange(startDate: Date, endDate: Date): Promise<Case[]> {
    try {
      const result = await db.query<Case>(`
        SELECT c.*, o.name as operator_name
        FROM cases c
        JOIN operators o ON c.assigned_to = o.id
        WHERE c.created_at BETWEEN $1 AND $2
        ORDER BY c.created_at DESC
      `, [startDate, endDate]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения кейсов за период:', error);
      throw error;
    }
  }
}
