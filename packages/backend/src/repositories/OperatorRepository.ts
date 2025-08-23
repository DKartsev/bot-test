import { db } from '../database/connection';
import type { Operator } from '../types';

export class OperatorRepository {
  // Получение оператора по ID
  async findById(id: number): Promise<Operator> {
    try {
      const result = await db.query<Operator>(`
        SELECT * FROM operators WHERE id = $1
      `, [id]);

      const operator = result.rows[0];
      if (!operator) {
        throw new Error('Оператор не найден');
      }
      return operator;
    } catch (error) {
      console.error('Ошибка получения оператора по ID:', error);
      throw error;
    }
  }

  // Получение оператора по email
  async findByEmail(email: string): Promise<Operator | null> {
    try {
      const result = await db.query<Operator>(`
        SELECT * FROM operators WHERE email = $1
      `, [email]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Ошибка получения оператора по email:', error);
      throw error;
    }
  }

  // Получение всех операторов
  async findAll(): Promise<Operator[]> {
    try {
      const result = await db.query<Operator>(`
        SELECT * FROM operators ORDER BY name
      `);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения всех операторов:', error);
      throw error;
    }
  }

  // Получение активных операторов
  async findActive(): Promise<Operator[]> {
    try {
      const result = await db.query<Operator>(`
        SELECT * FROM operators WHERE is_active = true ORDER BY name
      `);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения активных операторов:', error);
      throw error;
    }
  }

  // Создание нового оператора
  async create(operatorData: Partial<Operator>): Promise<Operator> {
    try {
      const result = await db.query<Operator>(`
        INSERT INTO operators (name, email, role, is_active, max_chats)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        operatorData.name,
        operatorData.email,
        operatorData.role || 'operator',
        operatorData.is_active !== false,
        operatorData.max_chats || 5,
      ]);

      const operator = result.rows[0];
      if (!operator) {
        throw new Error('Оператор не был создан');
      }
      return operator;
    } catch (error) {
      console.error('Ошибка создания оператора:', error);
      throw error;
    }
  }

  // Обновление оператора
  async update(id: number, updates: Partial<Operator>): Promise<Operator | null> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }
      if (updates.role !== undefined) {
        fields.push(`role = $${paramIndex++}`);
        values.push(updates.role);
      }
      if (updates.is_active !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updates.is_active);
      }
      if (updates.max_chats !== undefined) {
        fields.push(`max_chats = $${paramIndex++}`);
        values.push(updates.max_chats);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      values.push(id);
      const result = await db.query<Operator>(`
        UPDATE operators 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Ошибка обновления оператора:', error);
      throw error;
    }
  }

  // Удаление оператора
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.query(`
        DELETE FROM operators WHERE id = $1
      `, [id]);

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Ошибка удаления оператора:', error);
      throw error;
    }
  }

  // Получение операторов по роли
  async findByRole(role: string): Promise<Operator[]> {
    try {
      const result = await db.query<Operator>(`
        SELECT * FROM operators WHERE role = $1 ORDER BY name
      `, [role]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения операторов по роли:', error);
      throw error;
    }
  }

  // Получение операторов с активными чатами
  async findWithActiveChats(): Promise<Operator[]> {
    try {
      const result = await db.query<Operator>(`
        SELECT DISTINCT o.*, COUNT(c.id) as active_chat_count
        FROM operators o
        LEFT JOIN chats c ON o.id = c.operator_id AND c.status = 'in_progress'
        GROUP BY o.id
        ORDER BY active_chat_count DESC, o.name
      `);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения операторов с активными чатами:', error);
      throw error;
    }
  }

  // Получение доступных операторов (не превысивших лимит чатов)
  async findAvailable(): Promise<Operator[]> {
    try {
      const result = await db.query<Operator>(`
        SELECT o.*, COUNT(c.id) as current_chat_count
        FROM operators o
        LEFT JOIN chats c ON o.id = c.operator_id AND c.status = 'in_progress'
        WHERE o.is_active = true
        GROUP BY o.id
        HAVING COUNT(c.id) < o.max_chats
        ORDER BY current_chat_count ASC, o.name
      `);

      return result.rows;
    } catch (error) {
      console.error('Ошибка получения доступных операторов:', error);
      throw error;
    }
  }

  // Обновление статуса активности оператора
  async updateActivity(id: number, isActive: boolean): Promise<void> {
    try {
      await db.query(`
        UPDATE operators 
        SET is_active = $1, updated_at = NOW()
        WHERE id = $2
      `, [isActive, id]);
    } catch (error) {
      console.error('Ошибка обновления статуса активности оператора:', error);
      throw error;
    }
  }

  // Получение статистики оператора
  async getStats(id: number): Promise<{
    total_chats: number;
    active_chats: number;
    closed_chats: number;
    avg_response_time: number;
  }> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_chats,
          COUNT(*) FILTER (WHERE status = 'in_progress') as active_chats,
          COUNT(*) FILTER (WHERE status = 'closed') as closed_chats,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time
        FROM chats 
        WHERE operator_id = $1
      `, [id]);

      const stats = result.rows[0];
      return {
        total_chats: parseInt(String(stats['total_chats'])),
        active_chats: parseInt(String(stats['active_chats'])),
        closed_chats: parseInt(String(stats['closed_chats'])),
        avg_response_time: parseFloat(String(stats['avg_response_time'])) || 0,
      };
    } catch (error) {
      console.error('Ошибка получения статистики оператора:', error);
      throw error;
    }
  }

  // Поиск операторов по имени или email
  async search(query: string): Promise<Operator[]> {
    try {
      const result = await db.query<Operator>(`
        SELECT * FROM operators 
        WHERE name ILIKE $1 OR email ILIKE $1
        ORDER BY name
      `, [`%${query}%`]);

      return result.rows;
    } catch (error) {
      console.error('Ошибка поиска операторов:', error);
      throw error;
    }
  }

  // Получение оператора с наименьшей нагрузкой
  async findLeastLoaded(): Promise<Operator | null> {
    try {
      const result = await db.query<Operator>(`
        SELECT o.*, COUNT(c.id) as current_chat_count
        FROM operators o
        LEFT JOIN chats c ON o.id = c.operator_id AND c.status = 'in_progress'
        WHERE o.is_active = true
        GROUP BY o.id
        ORDER BY current_chat_count ASC, o.name
        LIMIT 1
      `);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Ошибка получения оператора с наименьшей нагрузкой:', error);
      throw error;
    }
  }
}
