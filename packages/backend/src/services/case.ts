import { CaseRepository } from '../repositories/CaseRepository';
import type { Case } from '../types';

export class CaseService {
  private caseRepository: CaseRepository;

  constructor() {
    this.caseRepository = new CaseRepository();
  }

  async create(caseData: Partial<Case>): Promise<Case> {
    try {
      const newCase = await this.caseRepository.create({
        chat_id: caseData.chat_id!,
        title: caseData.title!,
        description: caseData.description!,
        status: caseData.status || 'open',
        priority: caseData.priority || 'medium',
      });
      return newCase;
    } catch (error) {
      console.error('Ошибка создания кейса:', error);
      throw new Error('Не удалось создать кейс');
    }
  }

  async getById(id: number): Promise<Case | null> {
    try {
      return await this.caseRepository.findById(id);
    } catch (error) {
      console.error('Ошибка получения кейса по ID:', error);
      throw new Error('Не удалось получить кейс');
    }
  }

  async getByChatId(chatId: number): Promise<Case[]> {
    try {
      return await this.caseRepository.findByChatId(chatId);
    } catch (error) {
      console.error('Ошибка получения кейсов чата:', error);
      throw new Error('Не удалось получить кейсы чата');
    }
  }

  // Alias для совместимости с routes
  async getCasesByChatId(chatId: number): Promise<Case[]> {
    return this.getByChatId(chatId);
  }

  async getByOperatorId(operatorId: number): Promise<Case[]> {
    try {
      return await this.caseRepository.findByOperatorId(operatorId);
    } catch (error) {
      console.error('Ошибка получения кейсов оператора:', error);
      throw new Error('Не удалось получить кейсы оператора');
    }
  }

  async update(id: number, updates: Partial<Case>): Promise<Case | null> {
    try {
      return await this.caseRepository.update(id, updates);
    } catch (error) {
      console.error('Ошибка обновления кейса:', error);
      throw new Error('Не удалось обновить кейс');
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      return await this.caseRepository.delete(id);
    } catch (error) {
      console.error('Ошибка удаления кейса:', error);
      throw new Error('Не удалось удалить кейс');
    }
  }

  async getByStatus(status: string): Promise<Case[]> {
    try {
      return await this.caseRepository.findByStatus(status);
    } catch (error) {
      console.error('Ошибка получения кейсов по статусу:', error);
      throw new Error('Не удалось получить кейсы по статусу');
    }
  }

  async getByPriority(priority: string): Promise<Case[]> {
    try {
      return await this.caseRepository.findByPriority(priority);
    } catch (error) {
      console.error('Ошибка получения кейсов по приоритету:', error);
      throw new Error('Не удалось получить кейсы по приоритету');
    }
  }

  async getOpenCases(): Promise<Case[]> {
    try {
      // Получаем все кейсы и фильтруем открытые
      const allCases = await this.caseRepository.findAll();
      return allCases.filter(c => c.status === 'open');
    } catch (error) {
      console.error('Ошибка получения открытых кейсов:', error);
      throw new Error('Не удалось получить открытые кейсы');
    }
  }

  async getUrgentCases(): Promise<Case[]> {
    try {
      // Получаем все кейсы и фильтруем срочные
      const allCases = await this.caseRepository.findAll();
      return allCases.filter(c => c.priority === 'urgent');
    } catch (error) {
      console.error('Ошибка получения срочных кейсов:', error);
      throw new Error('Не удалось получить срочные кейсы');
    }
  }

  async search(query: string, chatId?: number, operatorId?: number): Promise<Case[]> {
    try {
      // Простой поиск по названию и описанию
      const allCases = await this.caseRepository.findAll();
      let filteredCases = allCases;

      if (chatId) {
        filteredCases = filteredCases.filter(c => c.chat_id === chatId);
      }
      if (operatorId) {
        filteredCases = filteredCases.filter(c => c.assigned_to === operatorId);
      }

      const searchQuery = query.toLowerCase();
      return filteredCases.filter(c =>
        c.title.toLowerCase().includes(searchQuery) ||
        c.description.toLowerCase().includes(searchQuery),
      );
    } catch (error) {
      console.error('Ошибка поиска кейсов:', error);
      throw new Error('Не удалось выполнить поиск кейсов');
    }
  }

  async getByDateRange(startDate: Date, endDate: Date, chatId?: number): Promise<Case[]> {
    try {
      // Простой поиск по дате создания
      const allCases = await this.caseRepository.findAll();
      let filteredCases = allCases;

      if (chatId) {
        filteredCases = filteredCases.filter(c => c.chat_id === chatId);
      }

      return filteredCases.filter(c => {
        const createdAt = new Date(c.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      });
    } catch (error) {
      console.error('Ошибка получения кейсов по диапазону дат:', error);
      throw new Error('Не удалось получить кейсы по диапазону дат');
    }
  }

  async assignCase(caseId: number, operatorId: number): Promise<Case | null> {
    try {
      return await this.update(caseId, { assigned_to: operatorId });
    } catch (error) {
      console.error('Ошибка назначения кейса:', error);
      throw new Error('Не удалось назначить кейс');
    }
  }

  async resolveCase(caseId: number, resolution: string): Promise<Case | null> {
    try {
      return await this.update(caseId, {
        status: 'resolved',
        description: resolution,
      });
    } catch (error) {
      console.error('Ошибка разрешения кейса:', error);
      throw new Error('Не удалось разрешить кейс');
    }
  }

  async closeCase(caseId: number, closeReason: string): Promise<Case | null> {
    try {
      return await this.update(caseId, {
        status: 'closed',
        description: closeReason,
      });
    } catch (error) {
      console.error('Ошибка закрытия кейса:', error);
      throw new Error('Не удалось закрыть кейс');
    }
  }

  async getStats(_chatId?: number): Promise<{
    total: number;
    byStatus: { [key: string]: number };
    byPriority: { [key: string]: number };
    avgResolutionTime: number;
  }> {
    try {
      const stats = await this.caseRepository.getStats();
      return {
        total: stats.total,
        byStatus: {
          open: stats.open,
          in_progress: stats.in_progress,
          resolved: stats.resolved,
          closed: stats.closed,
        },
        byPriority: stats.by_priority,
        avgResolutionTime: 0, // Пока не реализовано
      };
    } catch (error) {
      console.error('Ошибка получения статистики кейсов:', error);
      throw new Error('Не удалось получить статистику кейсов');
    }
  }

  async getTimeline(caseId: number): Promise<{
    events: Array<{
      type: string;
      timestamp: string;
      description: string;
    }>;
  }> {
    try {
      // Простая реализация временной шкалы
      const caseItem = await this.getById(caseId);
      if (!caseItem) {
        throw new Error('Кейс не найден');
      }

      const events = [
        {
          type: 'created',
          timestamp: caseItem.created_at,
          description: 'Кейс создан',
        },
      ];

      if (caseItem.assigned_to) {
        events.push({
          type: 'assigned',
          timestamp: caseItem.updated_at,
          description: 'Кейс назначен оператору',
        });
      }

      if (caseItem.status === 'resolved') {
        events.push({
          type: 'resolved',
          timestamp: caseItem.updated_at,
          description: 'Кейс разрешен',
        });
      }

      if (caseItem.status === 'closed') {
        events.push({
          type: 'closed',
          timestamp: caseItem.updated_at,
          description: 'Кейс закрыт',
        });
      }

      return { events };
    } catch (error) {
      console.error('Ошибка получения временной шкалы кейса:', error);
      throw new Error('Не удалось получить временную шкалу кейса');
    }
  }
}
