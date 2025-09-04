import { db } from '../database/connection';
import type { User } from '../types';
import { logError } from '../utils/logger';

// Типы для создания и обновления пользователя
interface CreateUserData {
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  avatar_url?: string | null;
  balance?: number;
  deals_count?: number;
  flags?: string[];
  is_blocked?: boolean;
  is_verified?: boolean;
}

interface UpdateUserData {
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  balance?: number;
  deals_count?: number;
  flags?: string[];
  is_blocked?: boolean;
  is_verified?: boolean;
}

export class UserRepository {
  async findAll(limit: number = 100, offset: number = 0): Promise<User[]> {
    try {
      const result = await db.query<User>(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      );
      return result.rows;
    } catch (error) {
      logError('Ошибка при получении пользователей:', error);
      throw new Error('Не удалось получить пользователей');
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      const result = await db.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [id],
      );
      return result.rows[0] || null;
    } catch (error) {
      logError('Ошибка при получении пользователя по ID:', error);
      throw new Error('Не удалось получить пользователя');
    }
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    try {
      console.log('🔍 UserRepository.findByTelegramId вызван с telegramId:', telegramId);
      const result = await db.query<User>(
        'SELECT * FROM users WHERE telegram_id = $1',
        [telegramId],
      );
      console.log('🔍 Результат поиска пользователя:', { found: result.rows.length > 0, user: result.rows[0] || null });
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Ошибка при получении пользователя по Telegram ID:', error);
      logError('Ошибка при получении пользователя по Telegram ID:', error);
      throw new Error('Не удалось получить пользователя');
    }
  }

  async create(userData: CreateUserData): Promise<User> {
    try {
      console.log('➕ UserRepository.create вызван с данными:', userData);
      const result = await db.query<User>(
        `INSERT INTO users (
          telegram_id, username, first_name, last_name, avatar_url, 
          balance, deals_count, flags, is_blocked, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [
          userData.telegram_id,
          userData.username,
          userData.first_name,
          userData.last_name,
          userData.avatar_url || null,
          userData.balance || 0,
          userData.deals_count || 0,
          userData.flags || [],
          userData.is_blocked || false,
          userData.is_verified || false,
        ],
      );

      const user = result.rows[0];
      if (!user) {
        throw new Error('Пользователь не был создан');
      }

      console.log('✅ Пользователь успешно создан:', { id: user.id, telegram_id: user.telegram_id });
      return user;
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error);
      throw new Error('Не удалось создать пользователя');
    }
  }

  async update(id: number, userData: UpdateUserData): Promise<User | null> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (userData.username !== undefined) {
        fields.push(`username = $${paramIndex}`);
        values.push(userData.username);
        paramIndex++;
      }

      if (userData.first_name !== undefined) {
        fields.push(`first_name = $${paramIndex}`);
        values.push(userData.first_name);
        paramIndex++;
      }

      if (userData.last_name !== undefined) {
        fields.push(`last_name = $${paramIndex}`);
        values.push(userData.last_name);
        paramIndex++;
      }

      if (userData.avatar_url !== undefined) {
        fields.push(`avatar_url = $${paramIndex}`);
        values.push(userData.avatar_url);
        paramIndex++;
      }

      if (userData.balance !== undefined) {
        fields.push(`balance = $${paramIndex}`);
        values.push(userData.balance);
        paramIndex++;
      }

      if (userData.deals_count !== undefined) {
        fields.push(`deals_count = $${paramIndex}`);
        values.push(userData.deals_count);
        paramIndex++;
      }

      if (userData.flags !== undefined) {
        fields.push(`flags = $${paramIndex}`);
        values.push(userData.flags);
        paramIndex++;
      }

      if (userData.is_blocked !== undefined) {
        fields.push(`is_blocked = $${paramIndex}`);
        values.push(userData.is_blocked);
        paramIndex++;
      }

      if (userData.is_verified !== undefined) {
        fields.push(`is_verified = $${paramIndex}`);
        values.push(userData.is_verified);
        paramIndex++;
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const result = await db.query<User>(
        `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
        values,
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      throw new Error('Не удалось обновить пользователя');
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.query(
        'DELETE FROM users WHERE id = $1',
        [id],
      );
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      throw new Error('Не удалось удалить пользователя');
    }
  }

  async getOrCreate(telegramId: number, userData: Partial<CreateUserData>): Promise<User> {
    try {
      // Сначала пытаемся найти существующего пользователя
      let user = await this.findByTelegramId(telegramId);

      if (user) {
        // Если пользователь существует, обновляем его данные
        const updateData: UpdateUserData = {};

        if (userData.username !== undefined) updateData.username = userData.username;
        if (userData.first_name !== undefined) updateData.first_name = userData.first_name;
        if (userData.last_name !== undefined) updateData.last_name = userData.last_name;
        if (userData.avatar_url !== undefined) updateData.avatar_url = userData.avatar_url;

        if (Object.keys(updateData).length > 0) {
          user = await this.update(user.id, updateData);
          if (!user) {
            throw new Error('Не удалось обновить пользователя');
          }
        }

        return user;
      } else {
        // Если пользователь не существует, создаем нового
        const createData: CreateUserData = {
          telegram_id: telegramId,
          username: userData.username,
          first_name: userData.first_name || 'Unknown',
          last_name: userData.last_name,
          avatar_url: userData.avatar_url || null,
          balance: userData.balance || 0,
          deals_count: userData.deals_count || 0,
          flags: userData.flags || [],
          is_blocked: userData.is_blocked || false,
          is_verified: userData.is_verified || false,
        };

        return await this.create(createData);
      }
    } catch (error) {
      console.error('Ошибка при получении или создании пользователя:', error);
      throw new Error('Не удалось получить или создать пользователя');
    }
  }

  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    try {
      const searchQuery = `%${query}%`;
      const result = await db.query<User>(
        `SELECT * FROM users 
         WHERE username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
         ORDER BY created_at DESC 
         LIMIT $2`,
        [searchQuery, limit],
      );
      return result.rows;
    } catch (error) {
      console.error('Ошибка при поиске пользователей:', error);
      throw new Error('Не удалось выполнить поиск пользователей');
    }
  }

  async getUsersByFlags(flags: string[], limit: number = 100): Promise<User[]> {
    try {
      const result = await db.query<User>(
        `SELECT * FROM users 
         WHERE flags && $1
         ORDER BY created_at DESC 
         LIMIT $2`,
        [flags, limit],
      );
      return result.rows;
    } catch (error) {
      console.error('Ошибка при получении пользователей по флагам:', error);
      throw new Error('Не удалось получить пользователей по флагам');
    }
  }

  async getBlockedUsers(limit: number = 100): Promise<User[]> {
    try {
      const result = await db.query<User>(
        'SELECT * FROM users WHERE is_blocked = true ORDER BY created_at DESC LIMIT $1',
        [limit],
      );
      return result.rows;
    } catch (error) {
      console.error('Ошибка при получении заблокированных пользователей:', error);
      throw new Error('Не удалось получить заблокированных пользователей');
    }
  }

  async getVerifiedUsers(limit: number = 100): Promise<User[]> {
    try {
      const result = await db.query<User>(
        'SELECT * FROM users WHERE is_verified = true ORDER BY created_at DESC LIMIT $1',
        [limit],
      );
      return result.rows;
    } catch (error) {
      console.error('Ошибка при получении верифицированных пользователей:', error);
      throw new Error('Не удалось получить верифицированных пользователей');
    }
  }

  async getUserStats(): Promise<{
    total: number;
    verified: number;
    blocked: number;
    withFlags: number;
  }> {
    try {
      const totalResult = await db.query('SELECT COUNT(*) FROM users');
      const verifiedResult = await db.query('SELECT COUNT(*) FROM users WHERE is_verified = true');
      const blockedResult = await db.query('SELECT COUNT(*) FROM users WHERE is_blocked = true');
      const withFlagsResult = await db.query('SELECT COUNT(*) FROM users WHERE array_length(flags, 1) > 0');

      return {
        total: parseInt(String(totalResult.rows[0]?.['count'] || '0')),
        verified: parseInt(String(verifiedResult.rows[0]?.['count'] || '0')),
        blocked: parseInt(String(blockedResult.rows[0]?.['count'] || '0')),
        withFlags: parseInt(String(withFlagsResult.rows[0]?.['count'] || '0')),
      };
    } catch (error) {
      console.error('Ошибка при получении статистики пользователей:', error);
      throw new Error('Не удалось получить статистику пользователей');
    }
  }

  // Alias для совместимости с UserService
  async getStats(): Promise<{
    total: number;
    active: number;
    blocked: number;
    verified: number;
  }> {
    try {
      const stats = await this.getUserStats();
      return {
        total: stats.total,
        active: stats.total - stats.blocked,
        blocked: stats.blocked,
        verified: stats.verified,
      };
    } catch (error) {
      console.error('Ошибка при получении статистики пользователей:', error);
      throw new Error('Не удалось получить статистику пользователей');
    }
  }
}
