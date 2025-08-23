import { jest } from '@jest/globals';
import { TelegramService } from '../services/telegram';

// Мокаем logger
jest.mock('../utils/logger', () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
  logInfo: jest.fn(),
}));

// Мокаем env
jest.mock('../config/env', () => ({
  env: {
    telegram: {
      token: 'test-token',
      webhookUrl: 'https://test.com/webhook',
      enableWebhook: true,
    },
  },
}));

// Мокаем node-telegram-bot-api
const mockBot = {
  on: jest.fn(),
  sendMessage: jest.fn(),
  getMe: jest.fn(),
  setWebHook: jest.fn(),
  deleteWebHook: jest.fn(),
  getWebHookInfo: jest.fn(),
  processUpdate: jest.fn(),
};

jest.mock('node-telegram-bot-api', () => {
  return jest.fn().mockImplementation(() => mockBot);
});

describe('Telegram Service', () => {
  let service: TelegramService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TelegramService('test-token');
  });

  describe('Создание экземпляра', () => {
    it('должен экспортировать TelegramService', () => {
      expect(TelegramService).toBeDefined();
      expect(typeof TelegramService).toBe('function');
    });

    it('должен создавать экземпляр сервиса', () => {
      expect(service).toBeInstanceOf(TelegramService);
    });

    it('должен инициализировать бота с токеном', () => {
      expect(service).toBeDefined();
      expect(mockBot.on).toHaveBeenCalled();
    });
  });

  describe('Основные методы', () => {
    it('должен иметь метод sendMessage', () => {
      expect(service.sendMessage).toBeDefined();
      expect(typeof service.sendMessage).toBe('function');
    });

    it('должен иметь метод getMe', () => {
      expect(service.getMe).toBeDefined();
      expect(typeof service.getMe).toBe('function');
    });

    it('должен иметь метод setWebhook', () => {
      expect(service.setWebhook).toBeDefined();
      expect(typeof service.setWebhook).toBe('function');
    });

    it('должен иметь метод deleteWebhook', () => {
      expect(service.deleteWebhook).toBeDefined();
      expect(typeof service.deleteWebhook).toBe('function');
    });
  });

  describe('Отправка сообщений', () => {
    it('должен отправлять сообщения', async () => {
      const chatId = 123456;
      const text = 'Тестовое сообщение';

      mockBot.sendMessage.mockResolvedValue({ message_id: 1, chat: { id: chatId }, text });

      const result = await service.sendMessage(chatId, text);

      expect(result).toBeDefined();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, text, expect.any(Object));
    });

    it('должен обрабатывать ошибки при отправке', async () => {
      const chatId = 123456;
      const text = 'Тестовое сообщение';

      mockBot.sendMessage.mockRejectedValue(new Error('Telegram API error'));

      await expect(service.sendMessage(chatId, text)).rejects.toThrow('Telegram API error');
    });
  });

  describe('Webhook управление', () => {
    it('должен устанавливать webhook', async () => {
      const url = 'https://test.com/webhook';

      mockBot.setWebHook.mockResolvedValue(true);

      const result = await service.setWebhook(url);

      expect(result).toBe(true);
      expect(mockBot.setWebHook).toHaveBeenCalledWith(url);
    });

    it('должен удалять webhook', async () => {
      mockBot.deleteWebHook.mockResolvedValue(true);

      const result = await service.deleteWebhook();

      expect(result).toBe(true);
      expect(mockBot.deleteWebHook).toHaveBeenCalled();
    });

    it('должен получать информацию о webhook', async () => {
      const webhookInfo = { url: 'https://test.com/webhook', has_custom_certificate: false };

      mockBot.getWebHookInfo.mockResolvedValue(webhookInfo);

      const result = await service.getWebhookInfo();

      expect(result).toEqual(webhookInfo);
      expect(mockBot.getWebHookInfo).toHaveBeenCalled();
    });
  });

  describe('Информация о боте', () => {
    it('должен получать информацию о боте', async () => {
      const botInfo = { id: 123456, username: 'test_bot', first_name: 'Test Bot' };

      mockBot.getMe.mockResolvedValue(botInfo);

      const result = await service.getMe();

      expect(result).toEqual(botInfo);
      expect(mockBot.getMe).toHaveBeenCalled();
    });
  });

  describe('Обработка ошибок', () => {
    it('должен обрабатывать ошибки API', async () => {
      mockBot.getMe.mockRejectedValue(new Error('API Error'));

      await expect(service.getMe()).rejects.toThrow('API Error');
    });

    it('должен обрабатывать ошибки webhook', async () => {
      mockBot.setWebHook.mockRejectedValue(new Error('Webhook Error'));

      await expect(service.setWebhook('https://test.com/webhook')).rejects.toThrow('Webhook Error');
    });
  });
});
