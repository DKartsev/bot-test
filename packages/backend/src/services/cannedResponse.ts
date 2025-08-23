import { CannedResponseRepository } from '../repositories/CannedResponseRepository';
import type { CannedResponse } from '../types';

export class CannedResponseService {
  private cannedResponseRepository: CannedResponseRepository;

  constructor() {
    this.cannedResponseRepository = new CannedResponseRepository();
  }

  async create(responseData: Partial<CannedResponse>): Promise<CannedResponse> {
    try {
      const response = await this.cannedResponseRepository.create({
        title: responseData.title!,
        content: responseData.content!,
        category: responseData.category || 'general',
        tags: responseData.tags || [],
      });
      return response;
    } catch (error) {
      console.error('Ошибка создания готового ответа:', error);
      throw new Error('Не удалось создать готовый ответ');
    }
  }

  async getCannedResponseById(id: number): Promise<CannedResponse | null> {
    try {
      return await this.cannedResponseRepository.findById(id);
    } catch (error) {
      console.error('Ошибка получения готового ответа по ID:', error);
      throw new Error('Не удалось получить готовый ответ');
    }
  }

  async getAll(_limit: number = 100): Promise<CannedResponse[]> {
    try {
      return await this.cannedResponseRepository.findAll();
    } catch (error) {
      console.error('Ошибка получения всех готовых ответов:', error);
      throw new Error('Не удалось получить готовые ответы');
    }
  }

  async getByCategory(category: string, _limit: number = 100): Promise<CannedResponse[]> {
    try {
      if (category === 'all') {
        return await this.cannedResponseRepository.findAll();
      }
      return await this.cannedResponseRepository.findByCategory(category);
    } catch (error) {
      console.error('Ошибка получения готовых ответов по категории:', error);
      throw new Error('Не удалось получить готовые ответы');
    }
  }

  // Alias для совместимости с routes
  async getCannedResponses(category?: string): Promise<CannedResponse[]> {
    if (category) {
      return this.getByCategory(category);
    }
    return this.getAll();
  }

  async getByCategoryAndLimit(category: string, _limit: number = 100): Promise<CannedResponse[]> {
    try {
      if (category === 'all') {
        return await this.cannedResponseRepository.findAll();
      }
      return await this.cannedResponseRepository.findByCategory(category);
    } catch (error) {
      console.error('Ошибка получения готовых ответов по категории:', error);
      throw new Error('Не удалось получить готовые ответы');
    }
  }

  async getByTags(tags: string[], _limit: number = 100): Promise<CannedResponse[]> {
    try {
      return await this.cannedResponseRepository.findByTags(tags);
    } catch (error) {
      console.error('Ошибка получения готовых ответов по тегам:', error);
      throw new Error('Не удалось получить готовые ответы');
    }
  }

  async updateCannedResponse(id: number, updates: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    shortcut?: string;
  }): Promise<CannedResponse | null> {
    try {
      return await this.cannedResponseRepository.update(id, updates);
    } catch (error) {
      console.error('Ошибка обновления готового ответа:', error);
      throw new Error('Не удалось обновить готовый ответ');
    }
  }

  async deleteCannedResponse(id: number): Promise<boolean> {
    try {
      return await this.cannedResponseRepository.delete(id);
    } catch (error) {
      console.error('Ошибка удаления готового ответа:', error);
      throw new Error('Не удалось удалить готовый ответ');
    }
  }

  async search(query: string, category?: string, limit: number = 100): Promise<CannedResponse[]> {
    try {
      // Простой поиск по названию и содержимому
      const allResponses = category && category !== 'all'
        ? await this.cannedResponseRepository.findByCategory(category)
        : await this.cannedResponseRepository.findAll();

      const searchQuery = query.toLowerCase();
      return allResponses.filter(response =>
        response.title.toLowerCase().includes(searchQuery) ||
        response.content.toLowerCase().includes(searchQuery),
      ).slice(0, limit);
    } catch (error) {
      console.error('Ошибка поиска готовых ответов:', error);
      throw new Error('Не удалось выполнить поиск');
    }
  }

  async getByShortcut(shortcut: string): Promise<CannedResponse | null> {
    try {
      // Простой поиск по сокращению
      const allResponses = await this.cannedResponseRepository.findAll();
      return allResponses.find(response => response.shortcut === shortcut) || null;
    } catch (error) {
      console.error('Ошибка получения готового ответа по сокращению:', error);
      throw new Error('Не удалось получить готовый ответ');
    }
  }

  async getPopularCannedResponses(limit: number = 20): Promise<CannedResponse[]> {
    try {
      return await this.cannedResponseRepository.findPopular(limit);
    } catch (error) {
      console.error('Ошибка получения популярных готовых ответов:', error);
      throw new Error('Не удалось получить популярные готовые ответы');
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const allResponses = await this.cannedResponseRepository.findAll();
      const categories = new Set<string>();
      allResponses.forEach(response => categories.add(response.category));
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Ошибка получения категорий готовых ответов:', error);
      throw new Error('Не удалось получить категории');
    }
  }

  async getStats(): Promise<{
    total: number;
    byCategory: { [key: string]: number };
    byTags: { [key: string]: number };
    mostUsed: CannedResponse[];
  }> {
    try {
      const allResponses = await this.cannedResponseRepository.findAll();

      const byCategory: { [key: string]: number } = {};
      const byTags: { [key: string]: number } = {};

      allResponses.forEach(response => {
        byCategory[response.category] = (byCategory[response.category] || 0) + 1;
        response.tags.forEach(tag => {
          byTags[tag] = (byTags[tag] || 0) + 1;
        });
      });

      const mostUsed = allResponses
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 10);

      return {
        total: allResponses.length,
        byCategory,
        byTags,
        mostUsed,
      };
    } catch (error) {
      console.error('Ошибка получения статистики готовых ответов:', error);
      throw new Error('Не удалось получить статистику');
    }
  }

  async incrementUsageCount(id: number): Promise<void> {
    try {
      await this.cannedResponseRepository.incrementUsage(id);
    } catch (error) {
      console.error('Ошибка увеличения счетчика использования:', error);
      // Не бросаем ошибку, так как это не критично
    }
  }

  async getByUsageCount(minUsage: number, limit: number = 100): Promise<CannedResponse[]> {
    try {
      const allResponses = await this.cannedResponseRepository.findAll();
      return allResponses
        .filter(response => (response.usage_count || 0) >= minUsage)
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Ошибка получения готовых ответов по количеству использования:', error);
      throw new Error('Не удалось получить готовые ответы');
    }
  }

  async duplicateCannedResponse(id: number, newTitle: string): Promise<CannedResponse> {
    try {
      const original = await this.getCannedResponseById(id);
      if (!original) {
        throw new Error('Исходный готовый ответ не найден');
      }

      return await this.create({
        title: newTitle,
        content: original.content,
        category: original.category,
        tags: original.tags,
        shortcut: original.shortcut ? `${original.shortcut}_copy` : undefined,
      });
    } catch (error) {
      console.error('Ошибка дублирования готового ответа:', error);
      throw new Error('Не удалось дублировать готовый ответ');
    }
  }

  async exportCannedResponses(category?: string): Promise<CannedResponse[]> {
    try {
      if (category) {
        return await this.getByCategory(category, 1000);
      }
      return await this.cannedResponseRepository.findAll();
    } catch (error) {
      console.error('Ошибка экспорта готовых ответов:', error);
      throw new Error('Не удалось экспортировать готовые ответы');
    }
  }

  async importCannedResponses(responses: Array<{
    title: string;
    content: string;
    category: string;
    tags?: string[];
    shortcut?: string;
  }>): Promise<CannedResponse[]> {
    try {
      const importedResponses: CannedResponse[] = [];

      for (const responseData of responses) {
        try {
          const response = await this.create(responseData);
          importedResponses.push(response);
        } catch (error) {
          console.warn(`Не удалось импортировать готовый ответ "${responseData.title}":`, error);
        }
      }

      return importedResponses;
    } catch (error) {
      console.error('Ошибка импорта готовых ответов:', error);
      throw new Error('Не удалось импортировать готовые ответы');
    }
  }

  async cleanupUnused(): Promise<number> {
    try {
      const allResponses = await this.cannedResponseRepository.findAll();
      let deletedCount = 0;

      for (const response of allResponses) {
        if ((response.usage_count || 0) === 0) {
          await this.deleteCannedResponse(response.id);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Ошибка очистки неиспользуемых готовых ответов:', error);
      throw new Error('Не удалось очистить неиспользуемые ответы');
    }
  }
}
