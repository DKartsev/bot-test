import { db } from '../database/connection';
import type { CannedResponse } from '../types';
import { logError } from '../utils/logger';

export class CannedResponseRepository {
  // Получение готового ответа по ID
  async findById(id: number): Promise<CannedResponse | null> {
    try {
      const result = await db.query<CannedResponse>(`
        SELECT * FROM canned_responses WHERE id = $1
      `, [id]);

      const response = result.rows[0];
      return response || null;
    } catch (error) {
      logError('Ошибка получения готового ответа по ID:', error);
      throw error;
    }
  }

  // Получение всех готовых ответов
  async findAll(): Promise<CannedResponse[]> {
    try {
      const result = await db.query<CannedResponse>(`
        SELECT * FROM canned_responses 
        WHERE is_active = true 
        ORDER BY category, title
      `);

      return result.rows;
    } catch (error) {
      logError('Ошибка получения всех готовых ответов:', error);
      throw error;
    }
  }

  // Получение готовых ответов по категории
  async findByCategory(category: string): Promise<CannedResponse[]> {
    try {
      const result = await db.query<CannedResponse>(`
        SELECT * FROM canned_responses 
        WHERE category = $1 AND is_active = true 
        ORDER BY title
      `, [category]);

      return result.rows;
    } catch (error) {
      logError('Ошибка получения готовых ответов по категории:', error);
      throw error;
    }
  }

  // Получение готовых ответов по тегам
  async findByTags(tags: string[]): Promise<CannedResponse[]> {
    try {
      const conditions = tags.map((_, index) => `$${index + 1} = ANY(tags)`).join(' OR ');
      const result = await db.query<CannedResponse>(`
        SELECT * FROM canned_responses 
        WHERE (${conditions}) AND is_active = true 
        ORDER BY usage_count DESC, title
      `, tags);

      return result.rows;
    } catch (error) {
      logError('Ошибка получения готовых ответов по тегам:', error);
      throw error;
    }
  }

  // Поиск готовых ответов по тексту
  async search(query: string): Promise<CannedResponse[]> {
    try {
      const result = await db.query<CannedResponse>(`
        SELECT * FROM canned_responses 
        WHERE (title ILIKE $1 OR content ILIKE $1) AND is_active = true 
        ORDER BY usage_count DESC, title
      `, [`%${query}%`]);

      return result.rows;
    } catch (error) {
      logError('Ошибка поиска готовых ответов:', error);
      throw error;
    }
  }

  // Создание нового готового ответа
  async create(responseData: Record<string, unknown>): Promise<CannedResponse> {
    try {
      const result = await db.query<CannedResponse>(`
        INSERT INTO canned_responses (
          title, content, category, tags, shortcut, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `, [
        responseData['title'],
        responseData['content'],
        responseData['category'],
        responseData['tags'] || [],
        responseData['shortcut'],
        responseData['is_active'] !== undefined ? responseData['is_active'] : true,
      ]);

      const response = result.rows[0];
      if (!response) {
        throw new Error('Готовый ответ не был создан');
      }
      return response;
    } catch (error) {
      logError('Ошибка создания готового ответа:', error);
      throw error;
    }
  }

  // Обновление готового ответа
  async update(id: number, updates: Record<string, unknown>): Promise<CannedResponse | null> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates['title'] !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(updates['title']);
      }
      if (updates['content'] !== undefined) {
        fields.push(`content = $${paramIndex++}`);
        values.push(updates['content']);
      }
      if (updates['category'] !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        values.push(updates['category']);
      }
      if (updates['tags'] !== undefined) {
        fields.push(`tags = $${paramIndex++}`);
        values.push(updates['tags']);
      }
      if (updates['shortcut'] !== undefined) {
        fields.push(`shortcut = $${paramIndex++}`);
        values.push(updates['shortcut']);
      }
      if (updates['is_active'] !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updates['is_active']);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      values.push(id);
      const result = await db.query<CannedResponse>(`
        UPDATE canned_responses 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      const updatedResponse = result.rows[0];
      return updatedResponse || null;
    } catch (error) {
      logError('Ошибка обновления готового ответа:', error);
      throw error;
    }
  }

  // Удаление готового ответа
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.query(`
        DELETE FROM canned_responses WHERE id = $1
      `, [id]);

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logError('Ошибка удаления готового ответа:', error);
      throw error;
    }
  }

  // Увеличение счетчика использования
  async incrementUsage(id: number): Promise<void> {
    try {
      await db.query(`
        UPDATE canned_responses 
        SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = $1
      `, [id]);
    } catch (error) {
      logError('Ошибка увеличения счетчика использования:', error);
      throw error;
    }
  }

  // Получение популярных готовых ответов
  async findPopular(limit: number = 10): Promise<CannedResponse[]> {
    try {
      const result = await db.query<CannedResponse>(`
        SELECT * FROM canned_responses 
        WHERE is_active = true 
        ORDER BY usage_count DESC, title
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      logError('Ошибка получения популярных готовых ответов:', error);
      throw error;
    }
  }

  // Получение готового ответа по сокращению
  async findByShortcut(shortcut: string): Promise<CannedResponse | null> {
    try {
      const result = await db.query<CannedResponse>(`
        SELECT * FROM canned_responses 
        WHERE shortcut = $1 AND is_active = true
      `, [shortcut]);

      return result.rows[0] || null;
    } catch (error) {
      logError('Ошибка получения готового ответа по сокращению:', error);
      throw error;
    }
  }

  // Получение статистики готовых ответов
  async getResponseStats(): Promise<{
    total: number;
    byCategory: { [key: string]: number };
    byTags: { [key: string]: number };
    withShortcuts: number;
  }> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total,
          category,
          COUNT(*) as category_count,
          tags,
          COUNT(*) as tags_count,
          shortcut,
          COUNT(*) as shortcut_count
        FROM canned_responses
        WHERE is_active = true
        GROUP BY category, tags, shortcut
      `);

      const stats = {
        total: 0,
        byCategory: {} as Record<string, number>,
        byTags: {} as Record<string, number>,
        withShortcuts: 0,
      };

      result.rows.forEach((row: Record<string, unknown>) => {
        stats.total += parseInt(String(row.total));
        stats.byCategory[String(row.category)] = parseInt(String(row.category_count));
        if (row.shortcut) {
          stats.withShortcuts += parseInt(String(row.shortcut_count));
        }
      });

      return stats;
    } catch (error) {
      logError('Ошибка получения статистики готовых ответов:', error);
      throw error;
    }
  }

  // Получение готовых ответов по количеству использования
  async findByUsageCount(minUsage: number, limit: number = 100): Promise<CannedResponse[]> {
    try {
      const result = await db.query<CannedResponse>(`
        SELECT * FROM canned_responses 
        WHERE usage_count >= $1 AND is_active = true 
        ORDER BY usage_count DESC, title
        LIMIT $2
      `, [minUsage, limit]);

      return result.rows;
    } catch (error) {
      logError('Ошибка получения готовых ответов по количеству использования:', error);
      throw error;
    }
  }

  // Поиск готовых ответов по тексту и категории
  async searchResponses(query: string, category?: string, limit: number = 100): Promise<CannedResponse[]> {
    try {
      let sql = `
        SELECT * FROM canned_responses 
        WHERE (title ILIKE $1 OR content ILIKE $1) AND is_active = true
      `;
      const values: unknown[] = [`%${query}%`];

      if (category) {
        sql += ' AND category = $2';
        values.push(category);
      }

      sql += ` ORDER BY usage_count DESC, title LIMIT $${values.length + 1}`;
      values.push(limit);

      const result = await db.query<CannedResponse>(sql, values);
      return result.rows;
    } catch (error) {
      logError('Ошибка поиска готовых ответов:', error);
      throw error;
    }
  }
}
