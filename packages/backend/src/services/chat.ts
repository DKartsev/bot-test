import { ChatRepository, MessageRepository, OperatorRepository, UserRepository } from '../repositories';
import type { Chat, ChatStats, FilterOptions } from '../types';

export class ChatService {
  private chatRepository: ChatRepository;
  private userRepository: UserRepository;
  private messageRepository: MessageRepository;
  private operatorRepository: OperatorRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
    this.userRepository = new UserRepository();
    this.messageRepository = new MessageRepository();
    this.operatorRepository = new OperatorRepository();
  }

  // Получение списка чатов с фильтрацией
  async getChats(filters: FilterOptions = {}): Promise<Chat[]> {
    try {
      return await this.chatRepository.findWithFilters(filters);
    } catch (error) {
      console.error('Ошибка получения чатов:', error);
      throw new Error('Не удалось получить список чатов');
    }
  }

  // Получение чата по ID
  async getChatById(id: string): Promise<Chat | null> {
    try {
      return await this.chatRepository.findById(id);
    } catch (error) {
      console.error('Ошибка получения чата:', error);
      throw new Error('Не удалось получить чат');
    }
  }

  // Создание нового чата
  async create(chatData: Partial<Chat>): Promise<Chat> {
    return this.createChat(chatData);
  }

  // Создание нового чата
  async createChat(chatData: Partial<Chat>): Promise<Chat> {
    try {
      console.log('💬 ChatService.createChat вызван с:', JSON.stringify(chatData, null, 2));
      
      // Проверяем существование пользователя
      if (chatData.user_id) {
        console.log('🔍 Проверяем пользователя с ID:', chatData.user_id);
        const user = await this.userRepository.findById(chatData.user_id);
        if (!user) {
          console.log('❌ Пользователь не найден в первой проверке');
          throw new Error('Пользователь не найден');
        }
        console.log('✅ Пользователь найден в первой проверке:', user.id);
      }

      const userId = chatData.user_id || 0; // Используем ID пользователя из chatData
      const source = chatData.source || 'telegram';
      console.log('📝 Параметры для создания чата:', { userId, source });
      
      // Получаем telegram_id пользователя
      console.log('🔍 Получаем telegram_id для userId:', userId);
      const user = await this.userRepository.findById(userId);
      if (!user) {
        console.log('❌ Пользователь не найден во второй проверке');
        throw new Error('Пользователь не найден');
      }
      console.log('✅ Пользователь найден:', { id: user.id, telegram_id: user.telegram_id });
      
      console.log('🏗️ Создаем чат для telegram_id:', user.telegram_id);
      return await this.chatRepository.create(Number(user.telegram_id), source);
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      throw new Error('Не удалось создать чат');
    }
  }

  // Обновление статуса чата
  async updateChatStatus(id: string, status: string): Promise<Chat | null> {
    try {
      return await this.chatRepository.updateStatus(id, status);
    } catch (error) {
      console.error('Ошибка обновления статуса чата:', error);
      throw new Error('Не удалось обновить статус чата');
    }
  }

  // Принятие чата оператором
  async takeChat(chatId: string, operatorId: number): Promise<Chat | null> {
    try {
      // Проверяем существование оператора
      const operator = await this.operatorRepository.findById(operatorId);
      if (!operator) {
        throw new Error('Оператор не найден');
      }

      // Проверяем, что оператор активен
      if (!operator.is_active) {
        throw new Error('Оператор неактивен');
      }

      // Проверяем, не превышает ли оператор лимит чатов
      const activeChats = await this.chatRepository.findWithFilters({
        operator_id: operatorId,
        status: ['in_progress'],
      });

      if (activeChats.length >= operator.max_chats) {
        throw new Error('Оператор превысил лимит активных чатов');
      }

      return await this.chatRepository.takeChat(chatId, operatorId);
    } catch (error) {
      console.error('Ошибка принятия чата:', error);
      throw new Error('Не удалось принять чат');
    }
  }

  // Закрытие чата
  async closeChat(chatId: string, operatorId: number): Promise<Chat | null> {
    try {
      return await this.chatRepository.closeChat(chatId, operatorId);
    } catch (error) {
      console.error('Ошибка закрытия чата:', error);
      throw new Error('Не удалось закрыть чат');
    }
  }

  // Обновление приоритета чата
  async updateChatPriority(chatId: string, priority: string): Promise<Chat | null> {
    try {
      return await this.chatRepository.updatePriority(chatId, priority);
    } catch (error) {
      console.error('Ошибка обновления приоритета чата:', error);
      throw new Error('Не удалось обновить приоритет чата');
    }
  }

  // Добавление тегов к чату
  async addTags(chatId: string, tags: string[]): Promise<Chat | null> {
    return this.addChatTags(chatId, tags);
  }

  // Добавление тегов к чату
  async addChatTags(chatId: string, _tags: string[]): Promise<Chat> {
    try {
              const result = await this.chatRepository.addTags(chatId, _tags);
      if (!result) {
        throw new Error('Не удалось добавить теги к чату');
      }
      return result;
    } catch (error) {
      console.error('Ошибка добавления тегов к чату:', error);
      throw new Error('Не удалось добавить теги к чату');
    }
  }

  // Получение статистики чатов
  async getChatStats(): Promise<ChatStats> {
    try {
      return await this.chatRepository.getStats();
    } catch (error) {
      console.error('Ошибка получения статистики чатов:', error);
      throw new Error('Не удалось получить статистику чатов');
    }
  }

  // Поиск чатов
  async searchChats(query: string): Promise<Chat[]> {
    try {
      // Получаем все чаты и фильтруем по тексту
      const allChats = await this.chatRepository.findWithFilters({});

      if (!query.trim()) {
        return allChats;
      }

      const searchQuery = query.toLowerCase();

      return allChats.filter(chat => {
        // Поиск по имени пользователя
        if (chat.user.first_name.toLowerCase().includes(searchQuery) ||
            chat.user.last_name?.toLowerCase().includes(searchQuery) ||
            chat.user.username?.toLowerCase().includes(searchQuery)) {
          return true;
        }

        // Поиск по тексту последнего сообщения
        if (chat.last_message?.text.toLowerCase().includes(searchQuery)) {
          return true;
        }

        // Поиск по тегам
        if (chat.tags.some(tag => tag.toLowerCase().includes(searchQuery))) {
          return true;
        }

        // Поиск по статусу и приоритету
        if (chat.status.toLowerCase().includes(searchQuery) ||
            chat.priority.toLowerCase().includes(searchQuery)) {
          return true;
        }

        return false;
      });
    } catch (error) {
      console.error('Ошибка поиска чатов:', error);
      throw new Error('Не удалось выполнить поиск чатов');
    }
  }

  // Получение чатов по статусу
  async getChatsByStatus(status: string): Promise<Chat[]> {
    try {
      return await this.chatRepository.findWithFilters({ status: [status] });
    } catch (error) {
      console.error('Ошибка получения чатов по статусу:', error);
      throw new Error('Не удалось получить чаты по статусу');
    }
  }

  // Получение чатов оператора
  async getChatsByOperator(operatorId: number): Promise<Chat[]> {
    try {
      return await this.chatRepository.findWithFilters({ operator_id: operatorId });
    } catch (error) {
      console.error('Ошибка получения чатов оператора:', error);
      throw new Error('Не удалось получить чаты оператора');
    }
  }

  // Получение чатов пользователя
  async getChatsByUser(userId: number): Promise<Chat[]> {
    try {
      return await this.chatRepository.findWithFilters({ user_id: userId });
    } catch (error) {
      console.error('Ошибка получения чатов пользователя:', error);
      throw new Error('Не удалось получить чаты пользователя');
    }
  }

  // Получение чатов за период
  async getChatsByDateRange(startDate: Date, endDate: Date): Promise<Chat[]> {
    try {
      const allChats = await this.chatRepository.findWithFilters({});

      return allChats.filter(chat => {
        const chatDate = new Date(chat.created_at);
        return chatDate >= startDate && chatDate <= endDate;
      });
    } catch (error) {
      console.error('Ошибка получения чатов за период:', error);
      throw new Error('Не удалось получить чаты за период');
    }
  }

  // Эскалация чата (передача от бота оператору)
  async escalateChat(chatId: string, reason: string): Promise<Chat | null> {
    try {
      // Находим доступного оператора
      const availableOperator = await this.operatorRepository.findLeastLoaded();
      if (!availableOperator) {
        throw new Error('Нет доступных операторов');
      }

      // Обновляем статус чата
      const updatedChat = await this.chatRepository.updateStatus(chatId, 'open');

      // Добавляем тег с причиной эскалации
      if (updatedChat) {
        await this.chatRepository.addTags(chatId, [`escalated:${reason}`]);
      }

      return updatedChat;
    } catch (error) {
      console.error('Ошибка эскалации чата:', error);
      throw new Error('Не удалось эскалировать чат');
    }
  }

  // Получение чатов, требующих внимания
  async getAttentionRequiredChats(): Promise<Chat[]> {
    try {
      return await this.chatRepository.findWithFilters({
        status: ['open'],
        priority: ['high'],
      });
    } catch (error) {
      console.error('Ошибка получения чатов, требующих внимания:', error);
      throw new Error('Не удалось получить чаты, требующие внимания');
    }
  }

  // Получение активных чатов оператора
  async getActiveChatsByOperator(operatorId: number): Promise<Chat[]> {
    try {
      return await this.chatRepository.findWithFilters({
        operator_id: operatorId,
        status: ['in_progress'],
      });
    } catch (error) {
      console.error('Ошибка получения активных чатов оператора:', error);
      throw new Error('Не удалось получить активные чаты оператора');
    }
  }

  // Получение количества непрочитанных сообщений для чата
  async getUnreadMessageCount(chatId: string): Promise<number> {
    try {
      return await this.messageRepository.getUnreadCount(chatId);
    } catch (error) {
      console.error('Ошибка получения количества непрочитанных сообщений:', error);
      return 0;
    }
  }

  // Получение последнего сообщения чата
  async getLastMessage(chatId: string) {
    try {
      return await this.messageRepository.getLastMessage(chatId);
    } catch (error) {
      console.error('Ошибка получения последнего сообщения:', error);
      return null;
    }
  }
}
