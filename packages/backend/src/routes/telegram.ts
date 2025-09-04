import express from 'express';
import { env } from '../config/env';
import { cacheMiddleware } from '../middleware/cache';

// Helper функция для обертывания async handlers
const asyncHandler = (fn: (req: express.Request, res: express.Response) => Promise<void>) => 
  (req: express.Request, res: express.Response) => { void fn(req, res); };
import { TelegramService } from '../services/telegram';
import { ChatService } from '../services/chat';
import { MessageService } from '../services/message';
import { UserService } from '../services/user';

const router = express.Router();

// Инициализируем Telegram сервис
const telegramService = new TelegramService(env.TG_BOT_TOKEN || '');

// Создаем instances сервисов
const chatService = new ChatService();
const messageService = new MessageService();
const userService = new UserService();

// Webhook для получения обновлений от Telegram
router.post('/webhook', asyncHandler(async (req, res) => {
  try {
    console.log('📨 Webhook получен:', JSON.stringify(req.body, null, 2));
    
    const { message, callback_query, edited_message } = req.body;

    if (message) {
      console.log('📝 Обработка сообщения:', message.text);
      await telegramService.handleMessage(message as any);
    } else if (callback_query) {
      console.log('🔘 Обработка callback query');
      await telegramService.handleCallbackQuery(callback_query as any);
    } else if (edited_message) {
      console.log('✏️ Обработка отредактированного сообщения');
      await telegramService.handleEditedMessage(edited_message as any);
    } else {
      console.log('❓ Неизвестный тип обновления');
    }

    console.log('✅ Webhook обработан успешно');
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error);
    res.status(500).json({ error: 'Ошибка обработки webhook' });
  }
}));

// Установка webhook
router.post('/set-webhook', asyncHandler(async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: 'URL webhook обязателен' });
      return;
    }

    const result = await telegramService.setWebhook(String(url));
    res.json(result);
  } catch (error) {
    console.error('Ошибка установки webhook:', error);
    res.status(500).json({ error: 'Не удалось установить webhook' });
  }
}));

// Получение информации о боте
router.get('/bot-info', cacheMiddleware.long, asyncHandler(async (req, res) => {
  try {
    const botInfo = await telegramService.getBotInfo();
    res.json(botInfo);
  } catch (error) {
    console.error('Ошибка получения информации о боте:', error);
    res.status(500).json({ error: 'Не удалось получить информацию о боте' });
  }
}));

// Отправка сообщения
router.post('/send-message', asyncHandler(async (req, res) => {
  try {
    const { chat_id, text, parse_mode = 'HTML', reply_markup } = req.body;

    if (!chat_id || !text) {
      res.status(400).json({ error: 'chat_id и text обязательны' });
      return;
    }

    const result = await telegramService.sendMessage(Number(chat_id), String(text), {
      parse_mode: String(parse_mode),
      reply_markup,
    });
    res.json(result);
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Не удалось отправить сообщение' });
  }
}));

// Получение чатов бота
router.get('/chats', cacheMiddleware.medium, asyncHandler(async (req, res) => {
  try {
    const chats = await chatService.getChats({ limit: 100 });
    res.json(chats);
  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    res.status(500).json({ error: 'Не удалось получить чаты' });
  }
}));

// Получение сообщений чата
router.get('/chats/:id/messages', cacheMiddleware.short, asyncHandler(async (req, res) => {
  try {
    const chatId = req.params['id'];
    if (!chatId) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const messages = await messageService.getMessagesByChatId(chatId, 50, 0);
    res.json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: 'Не удалось получить сообщения' });
  }
}));

// Получение пользователей
router.get('/users', cacheMiddleware.medium, asyncHandler(async (req, res) => {
  try {
    const users = await userService.getUsers(100, 0);
    res.json(users);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Не удалось получить пользователей' });
  }
}));

// Получение статистики
router.get('/stats', cacheMiddleware.medium, asyncHandler(async (req, res) => {
  try {
    const chatStats = await chatService.getChatStats();
    const userStats = await userService.getUserStats();

    res.json({
      chats: chatStats,
      users: userStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Не удалось получить статистику' });
  }
}));

export default router;
