import { CaseRepository, ChatRepository, MessageRepository, NoteRepository, OperatorRepository } from '../repositories';
import type { Operator } from '../types';

export class OperatorService {
  private operatorRepository: OperatorRepository;
  private chatRepository: ChatRepository;
  private messageRepository: MessageRepository;
  private noteRepository: NoteRepository;
  private caseRepository: CaseRepository;

  constructor() {
    this.operatorRepository = new OperatorRepository();
    this.chatRepository = new ChatRepository();
    this.messageRepository = new MessageRepository();
    this.noteRepository = new NoteRepository();
    this.caseRepository = new CaseRepository();
  }

  // Получение оператора по ID
  async getOperatorById(id: number): Promise<Operator | null> {
    try {
      return await this.operatorRepository.findById(id);
    } catch (error) {
      console.error('Ошибка получения оператора:', error);
      throw new Error('Не удалось получить оператора');
    }
  }

  // Получение оператора по email
  async getOperatorByEmail(email: string): Promise<Operator | null> {
    try {
      return await this.operatorRepository.findByEmail(email);
    } catch (error) {
      console.error('Ошибка получения оператора по email:', error);
      throw new Error('Не удалось получить оператора');
    }
  }

  // Получение всех операторов
  async getAllOperators(): Promise<Operator[]> {
    try {
      return await this.operatorRepository.findAll();
    } catch (error) {
      console.error('Ошибка получения всех операторов:', error);
      throw new Error('Не удалось получить список операторов');
    }
  }

  // Получение активных операторов
  async getActiveOperators(): Promise<Operator[]> {
    try {
      return await this.operatorRepository.findActive();
    } catch (error) {
      console.error('Ошибка получения активных операторов:', error);
      throw new Error('Не удалось получить активных операторов');
    }
  }

  // Создание нового оператора
  async createOperator(operatorData: { first_name: string; last_name: string; email: string; role?: string; is_active?: boolean; max_chats?: number; password_hash?: string }): Promise<Operator> {
    try {
      // Проверяем обязательные поля
      if (!operatorData.first_name || !operatorData.last_name || !operatorData.email) {
        throw new Error('Имя, фамилия и email обязательны для создания оператора');
      }

      // Проверяем уникальность email
      const existingOperator = await this.operatorRepository.findByEmail(operatorData.email);
      if (existingOperator) {
        throw new Error('Оператор с таким email уже существует');
      }

      return await this.operatorRepository.create(operatorData);
    } catch (error) {
      console.error('Ошибка создания оператора:', error);
      throw new Error('Не удалось создать оператора');
    }
  }

  // Обновление оператора
  async updateOperator(id: number, updates: Partial<Operator>): Promise<Operator | null> {
    try {
      // Проверяем существование оператора
      const existingOperator = await this.operatorRepository.findById(id);
      if (!existingOperator) {
        throw new Error('Оператор не найден');
      }

      // Если обновляется email, проверяем уникальность
      if (updates.email && updates.email !== existingOperator.email) {
        const operatorWithEmail = await this.operatorRepository.findByEmail(updates.email);
        if (operatorWithEmail && operatorWithEmail.id !== id) {
          throw new Error('Оператор с таким email уже существует');
        }
      }

      return await this.operatorRepository.update(id, updates);
    } catch (error) {
      console.error('Ошибка обновления оператора:', error);
      throw new Error('Не удалось обновить оператора');
    }
  }

  // Удаление оператора
  async deleteOperator(id: number): Promise<boolean> {
    try {
      // Проверяем, есть ли у оператора активные чаты
      const activeChats = await this.chatRepository.findWithFilters({
        operator_id: id,
        status: ['in_progress'],
      });

      if (activeChats.length > 0) {
        throw new Error('Нельзя удалить оператора с активными чатами');
      }

      return await this.operatorRepository.delete(id);
    } catch (error) {
      console.error('Ошибка удаления оператора:', error);
      throw new Error('Не удалось удалить оператора');
    }
  }

  // Получение операторов по роли
  async getOperatorsByRole(role: string): Promise<Operator[]> {
    try {
      return await this.operatorRepository.findByRole(role);
    } catch (error) {
      console.error('Ошибка получения операторов по роли:', error);
      throw new Error('Не удалось получить операторов по роли');
    }
  }

  // Получение операторов с активными чатами
  async getOperatorsWithActiveChats(): Promise<Operator[]> {
    try {
      return await this.operatorRepository.findWithActiveChats();
    } catch (error) {
      console.error('Ошибка получения операторов с активными чатами:', error);
      throw new Error('Не удалось получить операторов с активными чатами');
    }
  }

  // Получение доступных операторов
  async getAvailableOperators(): Promise<Operator[]> {
    try {
      return await this.operatorRepository.findAvailable();
    } catch (error) {
      console.error('Ошибка получения доступных операторов:', error);
      throw new Error('Не удалось получить доступных операторов');
    }
  }

  // Обновление статуса активности оператора
  async updateOperatorActivity(id: number, isActive: boolean): Promise<void> {
    try {
      await this.operatorRepository.updateActivity(id, isActive);
    } catch (error) {
      console.error('Ошибка обновления статуса активности оператора:', error);
      throw new Error('Не удалось обновить статус активности оператора');
    }
  }

  // Получение статистики оператора
  async getOperatorStats(id: number) {
    try {
      return await this.operatorRepository.getStats(id);
    } catch (error) {
      console.error('Ошибка получения статистики оператора:', error);
      throw new Error('Не удалось получить статистику оператора');
    }
  }

  // Поиск операторов
  async searchOperators(query: string): Promise<Operator[]> {
    try {
      return await this.operatorRepository.search(query);
    } catch (error) {
      console.error('Ошибка поиска операторов:', error);
      throw new Error('Не удалось выполнить поиск операторов');
    }
  }

  // Получение оператора с наименьшей нагрузкой
  async getLeastLoadedOperator(): Promise<Operator | null> {
    try {
      return await this.operatorRepository.findLeastLoaded();
    } catch (error) {
      console.error('Ошибка получения оператора с наименьшей нагрузкой:', error);
      throw new Error('Не удалось получить оператора с наименьшей нагрузкой');
    }
  }

  // Получение операторов по статусу
  async getOperatorsByStatus(isActive: boolean): Promise<Operator[]> {
    try {
      if (isActive) {
        return await this.operatorRepository.findActive();
      } else {
        const allOperators = await this.operatorRepository.findAll();
        return allOperators.filter(op => !op.is_active);
      }
    } catch (error) {
      console.error('Ошибка получения операторов по статусу:', error);
      throw new Error('Не удалось получить операторов по статусу');
    }
  }

  // Получение операторов по количеству активных чатов
  async getOperatorsByChatCount(minChats: number, maxChats: number): Promise<Operator[]> {
    try {
      const operatorsWithChats = await this.operatorRepository.findWithActiveChats();
      return operatorsWithChats.filter(op => {
        const chatCount = (op as any).active_chat_count || 0;
        return chatCount >= minChats && chatCount <= maxChats;
      });
    } catch (error) {
      console.error('Ошибка получения операторов по количеству чатов:', error);
      throw new Error('Не удалось получить операторов по количеству чатов');
    }
  }

  // Получение операторов для эскалации
  async getOperatorsForEscalation(priority: string = 'medium'): Promise<Operator[]> {
    try {
      // Получаем доступных операторов
      const availableOperators = await this.operatorRepository.findAvailable();

      // Фильтруем по приоритету (если есть старшие операторы)
      if (priority === 'high' || priority === 'urgent') {
        const seniorOperators = availableOperators.filter(op =>
          op.role === 'supervisor' || op.role === 'admin',
        );
        if (seniorOperators.length > 0) {
          return seniorOperators;
        }
      }

      return availableOperators;
    } catch (error) {
      console.error('Ошибка получения операторов для эскалации:', error);
      throw new Error('Не удалось получить операторов для эскалации');
    }
  }

  // Получение операторов по времени последней активности
  async getOperatorsByLastActivity(hoursAgo: number): Promise<Operator[]> {
    try {
      const allOperators = await this.operatorRepository.findAll();
      const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      return allOperators.filter(op => {
        if (!op.last_activity) return false;
        return new Date(op.last_activity) > cutoffTime;
      });
    } catch (error) {
      console.error('Ошибка получения операторов по времени активности:', error);
      throw new Error('Не удалось получить операторов по времени активности');
    }
  }

  // Получение операторов по производительности
  async getOperatorsByPerformance(minResolutionTime: number, maxResolutionTime: number): Promise<Operator[]> {
    try {
      const operatorsWithStats = await Promise.all(
        (await this.operatorRepository.findAll()).map(async (op) => {
          try {
            const stats = await this.operatorRepository.getStats(op.id);
            return { ...op, stats };
          } catch {
            return { ...op, stats: { avg_response_time: 0 } };
          }
        }),
      );

      return operatorsWithStats.filter(op => {
        const avgTime = (op as any).stats?.avg_response_time || 0;
        return avgTime >= minResolutionTime && avgTime <= maxResolutionTime;
      });
    } catch (error) {
      console.error('Ошибка получения операторов по производительности:', error);
      throw new Error('Не удалось получить операторов по производительности');
    }
  }

  // Обновление статуса оператора
  async updateOperatorStatus(id: number, isActive: boolean): Promise<Operator | null> {
    try {
      return await this.operatorRepository.update(id, { is_active: isActive });
    } catch (error) {
      console.error('Ошибка обновления статуса оператора:', error);
      throw new Error('Не удалось обновить статус оператора');
    }
  }

  // Обновление времени последнего входа
  async updateLastLogin(id: number): Promise<Operator | null> {
    try {
      return await this.operatorRepository.update(id, {
        last_login: new Date().toISOString()
      });
    } catch (error) {
      console.error('Ошибка обновления времени входа:', error);
      throw new Error('Не удалось обновить время входа');
    }
  }
}
