import { AttachmentRepository, ChatRepository, MessageRepository, OperatorRepository, UserRepository } from '../repositories';
import type { Message } from '../types';

export class MessageService {
  private messageRepository: MessageRepository;
  private chatRepository: ChatRepository;
  private userRepository: UserRepository;
  private operatorRepository: OperatorRepository;
  private attachmentRepository: AttachmentRepository;

  constructor() {
    this.messageRepository = new MessageRepository();
    this.chatRepository = new ChatRepository();
    this.userRepository = new UserRepository();
    this.operatorRepository = new OperatorRepository();
    this.attachmentRepository = new AttachmentRepository();
  }

  // Получение сообщений чата
  async getMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      // Проверяем существование чата
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new Error('Чат не найден');
      }

      return await this.messageRepository.findByChatId(chatId, limit, offset);
    } catch (error) {
      console.error('Ошибка получения сообщений:', error);
      throw new Error('Не удалось получить сообщения');
    }
  }

  // Создание сообщения от пользователя
  async createUserMessage(chatId: string, _userId: number, text: string, metadata?: any): Promise<Message> {
    try {
      // Проверяем существование чата и пользователя
      const [chat, user] = await Promise.all([
        this.chatRepository.findById(chatId),
        this.userRepository.findById(_userId),
      ]);

      if (!chat) {
        throw new Error('Чат не найден');
      }
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      // Создаем сообщение
      const message = await this.messageRepository.createUserMessage(chatId, _userId, text, metadata);

      // Обновляем время последней активности пользователя
      // Обновляем активность пользователя (поле last_activity пока не реализовано)
      await this.userRepository.update(_userId, {});

      // Обновляем время последнего сообщения в чате
      await this.chatRepository.updateStatus(chatId, 'open');

      return message;
    } catch (error) {
      console.error('Ошибка создания сообщения пользователя:', error);
      throw new Error('Не удалось создать сообщение');
    }
  }

  // Создание сообщения от оператора
  async createOperatorMessage(chatId: string, operatorId: number, text: string, metadata?: any): Promise<Message> {
    try {
      // Проверяем существование чата и оператора
      const [chat, operator] = await Promise.all([
        this.chatRepository.findById(chatId),
        this.operatorRepository.findById(operatorId),
      ]);

      if (!chat) {
        throw new Error('Чат не найден');
      }
      if (!operator) {
        throw new Error('Оператор не найден');
      }

      // Проверяем, что оператор назначен на этот чат
      if (chat.operator_id !== operatorId) {
        throw new Error('Оператор не назначен на этот чат');
      }

      // Создаем сообщение
      const message = await this.messageRepository.createOperatorMessage(chatId, operatorId, text, metadata);

      // Обновляем время последнего сообщения в чате
      await this.chatRepository.updateStatus(chatId, 'open');

      return message;
    } catch (error) {
      console.error('Ошибка создания сообщения оператора:', error);
      throw new Error('Не удалось создать сообщение');
    }
  }

  // Создание сообщения от бота
  async createBotMessage(chatId: string, text: string, metadata?: any): Promise<Message> {
    try {
      // Проверяем существование чата
      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new Error('Чат не найден');
      }

      // Создаем сообщение
      const message = await this.messageRepository.createBotMessage(chatId, text, metadata);

      // Обновляем время последнего сообщения в чате
      await this.chatRepository.updateStatus(chatId, 'open');

      return message;
    } catch (error) {
      console.error('Ошибка создания сообщения бота:', error);
      throw new Error('Не удалось создать сообщение');
    }
  }

  // Обновление статуса прочтения сообщения
  async markMessageAsRead(messageId: number): Promise<void> {
    try {
      await this.messageRepository.markAsRead(messageId);
    } catch (error) {
      console.error('Ошибка обновления статуса сообщения:', error);
      throw new Error('Не удалось обновить статус сообщения');
    }
  }

  // Получение количества непрочитанных сообщений
  async getUnreadCount(chatId: number): Promise<number> {
    try {
      return await this.messageRepository.getUnreadCount(chatId.toString());
    } catch (error) {
      console.error('Ошибка получения количества непрочитанных сообщений:', error);
      return 0;
    }
  }


  // Получение последнего сообщения чата
  async getLastMessage(chatId: number): Promise<Message | null> {
    try {
      return await this.messageRepository.getLastMessage(chatId.toString());
    } catch (error) {
      console.error('Ошибка получения последнего сообщения:', error);
      return null;
    }
  }

  // Получение сообщений по типу автора
  async getMessagesByAuthorType(chatId: number, authorType: string, limit: number = 20): Promise<Message[]> {
    try {
      return await this.messageRepository.findByAuthorType(chatId.toString(), authorType, limit);
    } catch (error) {
      console.error('Ошибка получения сообщений по типу автора:', error);
      throw new Error('Не удалось получить сообщения по типу автора');
    }
  }

  // Получение сообщений за период
  async getMessagesByDateRange(chatId: number, startDate: Date, endDate: Date): Promise<Message[]> {
    try {
      return await this.messageRepository.findByDateRange(chatId.toString(), startDate, endDate);
    } catch (error) {
      console.error('Ошибка получения сообщений за период:', error);
      throw new Error('Не удалось получить сообщения за период');
    }
  }

  // Удаление сообщения (только для администраторов)
  async deleteMessage(messageId: number): Promise<boolean> {
    try {
      // Удаляем все вложения сообщения
      const attachments = await this.attachmentRepository.findByMessageId(messageId);
      for (const attachment of attachments) {
        await this.attachmentRepository.delete(attachment.id);
      }

      // Удаляем само сообщение
      return await this.messageRepository.delete(messageId);
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
      throw new Error('Не удалось удалить сообщение');
    }
  }

  // Получение статистики сообщений
  async getMessageStats(chatId: number) {
    try {
      return await this.messageRepository.getStats(chatId.toString());
    } catch (error) {
      console.error('Ошибка получения статистики сообщений:', error);
      throw new Error('Не удалось получить статистику сообщений');
    }
  }

  // Получение сообщений с вложениями
  async getMessagesWithAttachments(chatId: number, limit: number = 50, offset: number = 0): Promise<(Message & { attachments: any[] })[]> {
    try {
      const messages = await this.messageRepository.findByChatId(chatId.toString(), limit, offset);

      // Получаем вложения для каждого сообщения
      const messagesWithAttachments = await Promise.all(
        messages.map(async (message) => {
                     const attachments = await this.attachmentRepository.findByMessageId(message.id as any);
           return {
             ...message,
             attachments: attachments as any[],
           };
        }),
      );

      return messagesWithAttachments;
    } catch (error) {
      console.error('Ошибка получения сообщений с вложениями:', error);
      throw new Error('Не удалось получить сообщения с вложениями');
    }
  }

  // Получение сообщений пользователя
  async getUserMessages(userId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      // Получаем все чаты пользователя
      const chats = await this.chatRepository.findWithFilters({ user_id: userId });
      const chatIds = chats.map(chat => chat.id);

      if (chatIds.length === 0) {
        return [];
      }

      // Получаем сообщения из всех чатов пользователя
      const allMessages: Message[] = [];
      for (const chatId of chatIds) {
        const messages = await this.messageRepository.findByChatId(chatId, limit, offset);
        allMessages.push(...messages);
      }

      // Сортируем по времени и применяем лимит
      return allMessages
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Ошибка получения сообщений пользователя:', error);
      throw new Error('Не удалось получить сообщения пользователя');
    }
  }

  // Получение сообщений оператора
  async getOperatorMessages(operatorId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      // Получаем все чаты оператора
      const chats = await this.chatRepository.findWithFilters({ operator_id: operatorId });
      const chatIds = chats.map(chat => chat.id);

      if (chatIds.length === 0) {
        return [];
      }

      // Получаем сообщения из всех чатов оператора
      const allMessages: Message[] = [];
      for (const chatId of chatIds) {
        const messages = await this.messageRepository.findByChatId(chatId, limit, offset);
        allMessages.push(...messages);
      }

      // Сортируем по времени и применяем лимит
      return allMessages
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Ошибка получения сообщений оператора:', error);
      throw new Error('Не удалось получить сообщения оператора');
    }
  }

  // Получение сообщений бота
  async getBotMessages(chatId: number, limit: number = 20): Promise<Message[]> {
    try {
      return await this.messageRepository.findByAuthorType(chatId.toString(), 'bot', limit);
    } catch (error) {
      console.error('Ошибка получения сообщений бота:', error);
      throw new Error('Не удалось получить сообщения бота');
    }
  }

  // Получение сообщений для анализа (для AI)
  async getMessagesForAnalysis(chatId: number, limit: number = 10): Promise<Message[]> {
    try {
      // Получаем последние сообщения пользователя для анализа
      const userMessages = await this.messageRepository.findByAuthorType(chatId.toString(), 'user', limit);

      // Получаем последние сообщения бота для контекста
      const botMessages = await this.messageRepository.findByAuthorType(chatId.toString(), 'bot', 5);

      // Объединяем и сортируем по времени
      const allMessages = [...userMessages, ...botMessages];
      return allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Ошибка получения сообщений для анализа:', error);
      throw new Error('Не удалось получить сообщения для анализа');
    }
  }

  async updateUserActivity(userId: number): Promise<void> {
    try {
      // Обновляем активность пользователя без last_activity
      await this.userRepository.update(userId, {});
    } catch (error) {
      console.error('Ошибка обновления активности пользователя:', error);
    }
  }


  async markMessagesAsRead(chatId: number, _operatorId: number): Promise<number> {
    try {
      const messages = await this.messageRepository.findByChatId(chatId.toString(), 1000, 0);
      let updatedCount = 0;

      for (const message of messages) {
        if (!message.is_read && message.author_type === 'user') {
          await this.messageRepository.update(message.id as any, { is_read: true });
          updatedCount++;
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Ошибка отметки сообщений как прочитанных:', error);
      throw new Error('Не удалось отметить сообщения как прочитанные');
    }
  }

  async getUnreadMessages(chatId: number): Promise<Message[]> {
    try {
      return await this.messageRepository.findByChatId(chatId.toString(), 1000, 0);
    } catch (error) {
      console.error('Ошибка получения непрочитанных сообщений:', error);
      throw new Error('Не удалось получить непрочитанные сообщения');
    }
  }

  // Alias для совместимости с routes
  async getMessagesByChatId(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    return this.getMessages(chatId, limit, offset);
  }

  // Создание сообщения (общий метод)
  async createMessage(messageData: {
    chatId: string;
    authorType: 'user' | 'operator' | 'bot';
    authorId?: number;
    text: string;
    metadata?: any;
  }): Promise<Message> {
    try {
      switch (messageData.authorType) {
        case 'user':
          if (!messageData.authorId) {
            throw new Error('ID пользователя обязателен для сообщения пользователя');
          }
          return await this.createUserMessage(messageData.chatId, messageData.authorId, messageData.text, messageData.metadata);

        case 'operator':
          if (!messageData.authorId) {
            throw new Error('ID оператора обязателен для сообщения оператора');
          }
          return await this.createOperatorMessage(messageData.chatId, messageData.authorId, messageData.text, messageData.metadata);

        case 'bot':
          return await this.createBotMessage(messageData.chatId, messageData.text, messageData.metadata);

        default:
          throw new Error('Неизвестный тип автора сообщения');
      }
    } catch (error) {
      console.error('Ошибка создания сообщения:', error);
      throw new Error('Не удалось создать сообщение');
    }
  }

  // Обновление сообщения
  async updateMessage(messageId: number, updates: Partial<Message>): Promise<Message | null> {
    try {
      return await this.messageRepository.update(messageId, updates);
    } catch (error) {
      console.error('Ошибка обновления сообщения:', error);
      throw new Error('Не удалось обновить сообщение');
    }
  }

  // Поиск сообщений
  async searchMessages(query: string, chatId?: string): Promise<Message[]> {
    try {
      if (chatId) {
        return await this.messageRepository.searchByText(chatId, query);
      } else {
        // Поиск по всем чатам
        const allMessages: Message[] = [];
        const chats = await this.chatRepository.findWithFilters({});

        for (const chat of chats) {
          const messages = await this.messageRepository.searchByText(chat.id, query);
          allMessages.push(...messages);
        }

        return allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (error) {
      console.error('Ошибка поиска сообщений:', error);
      throw new Error('Не удалось найти сообщения');
    }
  }

  // Обновление сообщения по Telegram ID
  async updateMessageByTelegramId(telegramMessageId: number, _updates: Partial<Message>): Promise<Message | null> {
    try {
      // Найдем сообщение по telegram_message_id в metadata
      const allMessages = await this.messageRepository.findByQuery(`
        SELECT * FROM messages 
        WHERE metadata::text LIKE '%"telegram_message_id":${telegramMessageId}%'
        LIMIT 1
      `);

      if (allMessages.length === 0) {
        return null;
      }

      const message = allMessages[0];
      if (!message) {
        return null;
      }
      return await this.updateMessage(message.id as any, _updates);
    } catch (error) {
      console.error('Ошибка обновления сообщения по Telegram ID:', error);
      throw new Error('Не удалось обновить сообщение');
    }
  }
}
