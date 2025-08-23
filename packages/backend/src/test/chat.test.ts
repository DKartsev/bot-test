import { jest } from '@jest/globals';
import { ChatService } from '../services/chat';

// Мокаем logger
jest.mock('../utils/logger', () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
  logInfo: jest.fn(),
}));

// Мокаем env
jest.mock('../config/env', () => ({
  env: {
    database: {
      host: 'localhost',
      port: 5432,
      name: 'test_db',
      user: 'test_user',
      password: 'test_pass',
    },
  },
}));

// Мокаем database
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('../config/database', () => ({
  db: mockDb,
}));

describe('Chat Service', () => {
  let service: ChatService;
  let chatModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Создаем экземпляр сервиса
    service = new ChatService();
    
    // Мокаем методы базы данных
    (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({ rows: [] });
    (mockDb.connect as jest.MockedFunction<() => Promise<void>>).mockResolvedValue(undefined);
    (mockDb.disconnect as jest.MockedFunction<() => Promise<void>>).mockResolvedValue(undefined);
  });

  describe('Создание экземпляра', () => {
    it('должен экспортировать ChatService', () => {
      expect(ChatService).toBeDefined();
      expect(typeof ChatService).toBe('function');
    });

    it('должен создавать экземпляр сервиса', () => {
      expect(service).toBeInstanceOf(ChatService);
    });

    it('должен иметь метод getChatById', () => {
      expect(service.getChatById).toBeDefined();
      expect(typeof service.getChatById).toBe('function');
    });

    it('должен иметь метод updateChatStatus', () => {
      expect(service.updateChatStatus).toBeDefined();
      expect(typeof service.updateChatStatus).toBe('function');
    });

    it('должен иметь метод closeChat', () => {
      expect(service.closeChat).toBeDefined();
      expect(typeof service.closeChat).toBe('function');
    });

    it('должен иметь метод getChats', () => {
      expect(service.getChats).toBeDefined();
      expect(typeof service.getChats).toBe('function');
    });
  });

  describe('Операции с чатами', () => {
    it('должен создавать чат', async () => {
      const chatData = {
        user_id: 1,
        operator_id: 2,
        status: 'active',
        title: 'Тестовый чат',
      };

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: 1, ...chatData }],
      });

      const result = await service.createChat(chatData as any);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('должен получать чат по ID', async () => {
      const chatId = 1;
      const mockChat = { id: 1, user_id: 1, operator_id: 2, status: 'active' };

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [mockChat],
      });

      const result = await service.getChatById(chatId);

      expect(result).toBeDefined();
      expect(result.id).toBe(chatId);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('должен обновлять статус чата', async () => {
      const chatId = 1;
      const newStatus = 'closed';

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: chatId, status: newStatus }],
      });

      const result = await service.updateChatStatus(chatId, newStatus);

      expect(result).toBeDefined();
      expect(result.id).toBe(chatId);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('должен закрывать чат', async () => {
      const chatId = 1;
      const operatorId = 2;

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: chatId, status: 'closed' }],
      });

      const result = await service.closeChat(chatId, operatorId);

      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('должен получать список чатов', async () => {
      const filters = { status: ['active'], user_id: 1 };
      const mockChats = [
        { id: 1, user_id: 1, status: 'active' },
        { id: 2, user_id: 1, status: 'active' },
      ];

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: mockChats,
      });

      const result = await service.getChats(filters);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('Валидация данных', () => {
    it('должен валидировать корректные данные чата', async () => {
      const validData = {
        user_id: 1,
        operator_id: 2,
        status: 'active',
        title: 'Валидный чат',
      };

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: 1, ...validData }],
      });

      const result = await service.createChat(validData as any);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('должен обрабатывать некорректные ID пользователей', async () => {
      const invalidData = {
        user_id: -1,
        operator_id: 0,
        status: 'active',
      };

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: 1, ...invalidData }],
      });

      const result = await service.createChat(invalidData as any);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('должен обрабатывать очень большие ID', async () => {
      const largeIdData = {
        user_id: Number.MAX_SAFE_INTEGER,
        operator_id: 999999999,
        status: 'active',
      };

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: 1, ...largeIdData }],
      });

      const result = await service.createChat(largeIdData as any);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('должен обрабатывать пустые строки', async () => {
      const emptyStringData = {
        user_id: 1,
        operator_id: 2,
        status: '',
        title: '',
      };

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: 1, ...emptyStringData }],
      });

      const result = await service.createChat(emptyStringData as any);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('должен обрабатывать очень длинные строки', async () => {
      const longStringData = {
        user_id: 1,
        operator_id: 2,
        status: 'a'.repeat(1000),
        title: 'b'.repeat(1000),
      };

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: 1, ...longStringData }],
      });

      const result = await service.createChat(longStringData as any);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });
  });

  describe('Обработка ошибок', () => {
    it('должен обрабатывать ошибки базы данных', async () => {
      const chatData = { user_id: 1, operator_id: 2, status: 'active' };

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.createChat(chatData as any)).rejects.toThrow('Database connection failed');
    });

    it('должен обрабатывать пустые результаты', async () => {
      const chatId = 999;

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [],
      });

      const result = await service.getChatById(chatId);

      expect(result).toBeNull();
    });

    it('должен обрабатывать null результаты', async () => {
      const chatId = 999;

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: null,
      });

      const result = await service.getChatById(chatId);

      expect(result).toBeNull();
    });
  });

  describe('Дополнительные методы', () => {
    it('должен принимать чат оператором', async () => {
      const chatId = 1;
      const operatorId = 2;

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: chatId, operator_id: operatorId, status: 'in_progress' }],
      });

      const result = await service.takeChat(chatId, operatorId);

      expect(result).toBeDefined();
      expect(result.id).toBe(chatId);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('должен обновлять приоритет чата', async () => {
      const chatId = 1;
      const priority = 'high';

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: chatId, priority }],
      });

      const result = await service.updateChatPriority(chatId, priority);

      expect(result).toBeDefined();
      expect(result.id).toBe(chatId);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('должен добавлять теги к чату', async () => {
      const chatId = 1;
      const tags = ['urgent', 'support'];

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ id: chatId, tags }],
      });

      const result = await service.addChatTags(chatId, tags);

      expect(result).toBeDefined();
      expect(result.id).toBe(chatId);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('должен получать статистику чатов', async () => {
      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: [{ total: 10, active: 5, closed: 5 }],
      });

      const result = await service.getChatStats();

      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('должен искать чаты', async () => {
      const query = 'test';
      const mockChats = [
        { id: 1, user: { first_name: 'Test User' }, status: 'active' },
      ];

      (mockDb.query as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        rows: mockChats,
      });

      const result = await service.searchChats(query);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockDb.query).toHaveBeenCalled();
    });
  });
});
