import type { CreateUserData, UpdateUserData, User } from '../types';
import { UserRepository } from '../repositories';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getOrCreate(userData: {
    telegram_id: number;
    username?: string;
    first_name: string;
    last_name?: string;
    avatar_url?: string;
  }): Promise<User> {
    try {
      console.log('👤 UserService.getOrCreate вызван с данными:', userData);
      
      // Попробуем найти пользователя по telegram_id
      let user = await this.userRepository.findByTelegramId(userData.telegram_id);
      console.log('🔍 Поиск пользователя по telegram_id:', userData.telegram_id, 'результат:', user ? 'найден' : 'не найден');

      if (!user) {
        console.log('➕ Создаем нового пользователя...');
        // Создаем нового пользователя
        const createData: CreateUserData = {
          telegram_id: userData.telegram_id,
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          avatar_url: userData.avatar_url,
          balance: 0,
          deals_count: 0,
          flags: [],
          is_blocked: false,
          is_verified: false,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        };
        console.log('📝 Данные для создания пользователя:', createData);
        user = await this.userRepository.create(createData);
        console.log('✅ Пользователь создан:', { id: user.id, telegram_id: user.telegram_id });
      } else {
        console.log('👤 Пользователь найден:', { id: user.id, telegram_id: user.telegram_id });
      }

      return user;
    } catch (error) {
      console.error('❌ Ошибка получения/создания пользователя:', error);
      throw new Error('Не удалось получить или создать пользователя');
    }
  }

  async updateActivity(userId: number): Promise<void> {
    try {
      const updateData: UpdateUserData = {
        last_activity: new Date().toISOString(),
      };
      await this.userRepository.update(userId, updateData);
    } catch (error) {
      console.error('Ошибка обновления активности пользователя:', error);
    }
  }

  async getUsers(limit: number, offset: number): Promise<User[]> {
    try {
      return await this.userRepository.findAll(limit, offset);
    } catch (error) {
      console.error('Ошибка получения пользователей:', error);
      throw new Error('Не удалось получить пользователей');
    }
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    blocked: number;
    verified: number;
  }> {
    try {
      return await this.userRepository.getStats();
    } catch (error) {
      console.error('Ошибка получения статистики пользователей:', error);
      throw new Error('Не удалось получить статистику пользователей');
    }
  }
}
