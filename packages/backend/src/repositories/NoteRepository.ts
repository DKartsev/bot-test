import { db } from '../database/connection';
import type { Note } from '../types';
import { logError } from '../utils/logger';

export class NoteRepository {
  // Получение заметки по ID
  async findById(id: string): Promise<Note> {
    try {
      const result = await db.query<Note>(`
        SELECT 
          id, chat_id, content, 
          operator_id as author_id, 
          (SELECT name FROM operators WHERE id = notes.operator_id) as author_name,
          CASE WHEN is_internal THEN 'internal' ELSE 'public' END as type,
          is_internal as is_private,
          created_at, updated_at
        FROM notes WHERE id = $1
      `, [id]);

      const noteRow: any = result.rows[0];
      if (!noteRow) {
        throw new Error('Заметка не найдена');
      }
      return {
        id: noteRow.id,
        chat_id: noteRow.chat_id,
        conversation_id: noteRow.chat_id, // Используем chat_id как conversation_id
        content: noteRow.content,
        author_id: noteRow.author_id,
        author_name: noteRow.author_name || 'Unknown',
        type: noteRow.type,
        is_private: noteRow.is_private,
        created_at: noteRow.created_at,
        updated_at: noteRow.updated_at,
      };
    } catch (error) {
      logError('Ошибка получения заметки по ID:', error);
      throw error;
    }
  }

  async findByChatId(chatId: number): Promise<Note[]> {
    try {
      const result = await db.query<Note>(`
        SELECT 
          id, chat_id, content, 
          operator_id as author_id, 
          (SELECT name FROM operators WHERE id = notes.operator_id) as author_name,
          CASE WHEN is_internal THEN 'internal' ELSE 'public' END as type,
          is_internal as is_private,
          created_at, updated_at
        FROM notes 
        WHERE chat_id = $1 
        ORDER BY created_at DESC
      `, [chatId]);

      return result.rows;
    } catch (error) {
      logError('Ошибка получения заметок чата:', error);
      throw error;
    }
  }

  async findByOperatorId(operatorId: number): Promise<Note[]> {
    try {
      const result = await db.query<Note>(`
        SELECT 
          id, chat_id, content, 
          operator_id as author_id, 
          (SELECT name FROM operators WHERE id = notes.operator_id) as author_name,
          CASE WHEN is_internal THEN 'internal' ELSE 'public' END as type,
          is_internal as is_private,
          created_at, updated_at
        FROM notes 
        WHERE operator_id = $1 
        ORDER BY created_at DESC
      `, [operatorId]);

      return result.rows;
    } catch (error) {
      logError('Ошибка получения заметок оператора:', error);
      throw error;
    }
  }

  async findAll(): Promise<Note[]> {
    try {
      const result = await db.query<Note>(`
        SELECT 
          id, chat_id, content, 
          operator_id as author_id, 
          (SELECT name FROM operators WHERE id = notes.operator_id) as author_name,
          CASE WHEN is_internal THEN 'internal' ELSE 'public' END as type,
          is_internal as is_private,
          created_at, updated_at
        FROM notes ORDER BY created_at DESC
      `);
      return result.rows;
    } catch (error) {
      logError('Ошибка получения всех заметок:', error);
      throw error;
    }
  }

  // Получение внутренних заметок чата
  async findInternalByChatId(chatId: number): Promise<Note[]> {
    try {
      const result = await db.query<Note>(`
        SELECT 
          id, chat_id, content, 
          operator_id as author_id, 
          (SELECT name FROM operators WHERE id = notes.operator_id) as author_name,
          'internal' as type,
          true as is_private,
          created_at, updated_at
        FROM notes 
        WHERE chat_id = $1 AND is_internal = true
        ORDER BY created_at DESC
      `, [chatId]);

      return result.rows;
    } catch (error) {
      logError('Ошибка получения внутренних заметок чата:', error);
      throw error;
    }
  }

  // Получение публичных заметок чата
  async findPublicByChatId(chatId: number): Promise<Note[]> {
    try {
      const result = await db.query<Note>(`
        SELECT 
          id, chat_id, content, 
          operator_id as author_id, 
          (SELECT name FROM operators WHERE id = notes.operator_id) as author_name,
          'public' as type,
          false as is_private,
          created_at, updated_at
        FROM notes 
        WHERE chat_id = $1 AND is_internal = false
        ORDER BY created_at DESC
      `, [chatId]);

      return result.rows;
    } catch (error) {
      logError('Ошибка получения публичных заметок чата:', error);
      throw error;
    }
  }

  // Создание новой заметки
  async create(noteData: Record<string, unknown>): Promise<Note> {
    try {
      const result = await db.query<Note>(`
        INSERT INTO notes (
          chat_id, operator_id, content, is_internal
        ) VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [
        noteData['chat_id'],
        noteData['author_id'],
        noteData['content'],
        noteData['type'] === 'internal' || noteData['is_private'],
      ]);

      const noteRow = result.rows[0] as any;
      if (!noteRow) {
        throw new Error('Заметка не была создана');
      }

      // Преобразуем в нужный формат
      return {
        id: String(noteRow.id),
        chat_id: String(noteRow.chat_id),
        conversation_id: String(noteRow.chat_id), // Используем chat_id как conversation_id
        content: String(noteRow.content),
        author_id: Number(noteRow.operator_id),
        author_name: String(noteRow.author_name || 'Unknown'),
        type: noteRow.is_internal ? 'internal' : 'public',
        is_private: Boolean(noteRow.is_internal),
        created_at: new Date(noteRow.created_at).toISOString(),
        updated_at: new Date(noteRow.updated_at).toISOString(),
      };
    } catch (error) {
      logError('Ошибка создания заметки:', error);
      throw error;
    }
  }

  // Обновление заметки
  async update(id: string, updates: Record<string, unknown>): Promise<Note | null> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates['content'] !== undefined) {
        fields.push(`content = $${paramIndex++}`);
        values.push(updates['content']);
      }
      if (updates['type'] !== undefined) {
        fields.push(`is_internal = $${paramIndex++}`);
        values.push(updates['type'] === 'internal');
      }
      if (updates['is_private'] !== undefined) {
        fields.push(`is_internal = $${paramIndex++}`);
        values.push(updates['is_private']);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      values.push(id);
      const result = await db.query(`
        UPDATE notes 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      const updatedNote = result.rows[0];
      if (!updatedNote) {
        return null;
      }

      // Преобразуем в нужный формат
      return {
        id: String(updatedNote.id),
        chat_id: String(updatedNote.chat_id),
        conversation_id: String(updatedNote.chat_id), // Используем chat_id как conversation_id
        content: updatedNote.content,
        author_id: updatedNote.operator_id,
        author_name: updatedNote.author_name || 'Unknown',
        type: updatedNote.is_internal ? 'internal' : 'public',
        is_private: updatedNote.is_internal,
        created_at: updatedNote.created_at,
        updated_at: updatedNote.updated_at,
      };
    } catch (error) {
      logError('Ошибка обновления заметки:', error);
      throw error;
    }
  }

  // Удаление заметки
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db.query(`
        DELETE FROM notes WHERE id = $1
      `, [id]);

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logError('Ошибка удаления заметки:', error);
      throw error;
    }
  }

  // Получение статистики заметок
  async getStats(chatId: string): Promise<{
    total: number;
    internal: number;
    public: number;
    by_operator: Record<string, number>;
  }> {
    try {
      let whereClause = '';
      const values: unknown[] = [];

      if (chatId) {
        whereClause = 'WHERE chat_id = $1';
        values.push(chatId);
      }

      const result = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_internal = true) as internal,
          COUNT(*) FILTER (WHERE is_internal = false) as public
        FROM notes ${whereClause}
      `, values);

      const stats = result.rows[0];

      // Получаем статистику по операторам
      const operatorResult = await db.query(`
        SELECT o.name, COUNT(*) as count
        FROM notes n
        JOIN operators o ON n.operator_id = o.id
        ${whereClause}
        GROUP BY o.name
      `, values);

      const byOperator: Record<string, number> = {};
      operatorResult.rows.forEach((row: Record<string, unknown>) => {
        byOperator[String(row['name'])] = parseInt(String(row['count']));
      });

      return {
        total: parseInt(String(stats['total'])),
        internal: parseInt(String(stats['internal'])),
        public: parseInt(String(stats['public'])),
        by_operator: byOperator,
      };
    } catch (error) {
      logError('Ошибка получения статистики заметок:', error);
      throw error;
    }
  }
}
