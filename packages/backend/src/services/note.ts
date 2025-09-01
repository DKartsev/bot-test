import { NoteRepository } from '../repositories/NoteRepository';
import type { Note } from '../types';

export class NoteService {
  private noteRepository: NoteRepository;

  constructor() {
    this.noteRepository = new NoteRepository();
  }

  async create(noteData: Partial<Note>): Promise<Note> {
    try {
      const note = await this.noteRepository.create({
        chat_id: noteData.chat_id!,
        content: noteData.content!,
        author_id: noteData.author_id!,
        author_name: noteData.author_name!,
        type: noteData.type || 'internal',
        is_private: noteData.is_private !== undefined ? noteData.is_private : true,
      });
      return note;
    } catch (error) {
      console.error('Ошибка создания заметки:', error);
      throw new Error('Не удалось создать заметку');
    }
  }

  async getById(id: number): Promise<Note | null> {
    try {
      return await this.noteRepository.findById(id.toString());
    } catch (error) {
      console.error('Ошибка получения заметки по ID:', error);
      throw new Error('Не удалось получить заметку');
    }
  }

  async getByChatId(chatId: string): Promise<Note[]> {
    try {
      return await this.noteRepository.findByChatId(chatId);
    } catch (error) {
      console.error('Ошибка получения заметок чата:', error);
      throw new Error('Не удалось получить заметки чата');
    }
  }

  // Alias для совместимости с routes
  async getNotesByChatId(chatId: string): Promise<Note[]> {
    return this.getByChatId(chatId);
  }

  // Alias для совместимости с routes
  async createNote(noteData: Partial<Note>): Promise<Note> {
    return this.create(noteData);
  }

  async getByOperatorId(operatorId: number): Promise<Note[]> {
    try {
      return await this.noteRepository.findByOperatorId(operatorId);
    } catch (error) {
      console.error('Ошибка получения заметок оператора:', error);
      throw new Error('Не удалось получить заметки оператора');
    }
  }

  async update(id: number, updates: Partial<Note>): Promise<Note | null> {
    try {
      return await this.noteRepository.update(id.toString(), updates);
    } catch (error) {
      console.error('Ошибка обновления заметки:', error);
      throw new Error('Не удалось обновить заметку');
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      return await this.noteRepository.delete(id.toString());
    } catch (error) {
      console.error('Ошибка удаления заметки:', error);
      throw new Error('Не удалось удалить заметку');
    }
  }

  async getPublicByChatId(chatId: string): Promise<Note[]> {
    try {
      return await this.noteRepository.findPublicByChatId(chatId);
    } catch (error) {
      console.error('Ошибка получения публичных заметок чата:', error);
      throw new Error('Не удалось получить публичные заметки чата');
    }
  }

  async getInternalByChatId(chatId: string, _operatorId: number): Promise<Note[]> {
    try {
      return await this.noteRepository.findInternalByChatId(chatId);
    } catch (error) {
      console.error('Ошибка получения внутренних заметок чата:', error);
      throw new Error('Не удалось получить внутренние заметки чата');
    }
  }

  async search(query: string, chatId?: number, operatorId?: number): Promise<Note[]> {
    try {
      // Простой поиск по содержимому
      const allNotes = await this.noteRepository.findAll();
      let filteredNotes = allNotes;

      if (chatId) {
        filteredNotes = filteredNotes.filter((n: Note) => n.chat_id === chatId.toString());
      }
      if (operatorId) {
        filteredNotes = filteredNotes.filter((n: Note) => n.author_id === operatorId);
      }

      const searchQuery = query.toLowerCase();
      return filteredNotes.filter((n: Note) =>
        n.content.toLowerCase().includes(searchQuery),
      );
    } catch (error) {
      console.error('Ошибка поиска заметок:', error);
      throw new Error('Не удалось выполнить поиск заметок');
    }
  }

  async getByType(type: string): Promise<Note[]> {
    try {
      // Простой поиск по типу
      const allNotes = await this.noteRepository.findAll();
      return allNotes.filter((n: Note) => n.type === type);
    } catch (error) {
      console.error('Ошибка получения заметок по типу:', error);
      throw new Error('Не удалось получить заметки по типу');
    }
  }

  async getByDateRange(startDate: Date, endDate: Date, chatId?: number): Promise<Note[]> {
    try {
      // Простой поиск по дате создания
      const allNotes = await this.noteRepository.findAll();
      let filteredNotes = allNotes;

      if (chatId) {
        filteredNotes = filteredNotes.filter((n: Note) => n.chat_id === chatId.toString());
      }

      return filteredNotes.filter((n: Note) => {
        const createdAt = new Date(n.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      });
    } catch (error) {
      console.error('Ошибка получения заметок по диапазону дат:', error);
      throw new Error('Не удалось получить заметки по диапазону дат');
    }
  }

  async getStats(_chatId?: number): Promise<{
    total: number;
    byType: { [key: string]: number };
    byAuthor: { [key: string]: number };
    avgLength: number;
  }> {
    try {
      const stats = await this.noteRepository.getStats((_chatId || 0).toString());
      return {
        total: stats.total,
        byType: {
          internal: stats.internal,
          public: stats.public,
        },
        byAuthor: stats.by_operator,
        avgLength: 0, // Пока не реализовано
      };
    } catch (error) {
      console.error('Ошибка получения статистики заметок:', error);
      throw new Error('Не удалось получить статистику заметок');
    }
  }
}
