import TelegramBot = require('node-telegram-bot-api');
import { ChatService } from './chat';
import { MessageService } from './message';
import { UserService } from './user';
import { SupabaseRAGService } from './supabaseRAGService';
import logger from '../utils/logger';

// Типы для Telegram
interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  date: number;
  text?: string;
  caption?: string;
  photo?: any[];
  document?: any;
  audio?: any;
  voice?: any;
  video?: any;
  sticker?: any;
  location?: any;
  contact?: any;
  reply_to_message?: TelegramMessage;
  forward_from?: TelegramUser;
  forward_from_chat?: any;
  forward_date?: number;
  edit_date?: number;
  media_group_id?: string;
  author_signature?: string;
  via_bot?: any;
  has_protected_content?: boolean;
  is_automatic_forward?: boolean;
  has_media_spoiler?: boolean;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

export class TelegramService {
  private bot: TelegramBot;
  private userService: UserService;
  private chatService: ChatService;
  private messageService: MessageService;
  private ragService: SupabaseRAGService;

  constructor(token: string) {
    console.log('🤖 TelegramService конструктор вызван с токеном:', token ? 'есть' : 'отсутствует');
    if (!token) {
      console.warn('Telegram Bot Token не установлен. Telegram функциональность будет недоступна.');
      this.bot = null as any; // Создаем заглушку для разработки
    } else {
      console.log('✅ Создаем TelegramBot с токеном');
      this.bot = new TelegramBot(token, { polling: false });
    }
    this.userService = new UserService();
    this.chatService = new ChatService();
    this.messageService = new MessageService();
    this.ragService = new SupabaseRAGService();

    logger.info('Telegram сервис инициализирован', { token: `${token.substring(0, 10)}...` });
  }

  async handleStartCommand(chatId: number, userId: number, username?: string): Promise<void> {
    try {
      console.log('🚀 Обработка команды /start', { chatId, userId, username });
      
      // Создаем или получаем пользователя
      const user = await this.userService.getOrCreate({
        telegram_id: userId,
        username,
        first_name: username || 'User',
        last_name: undefined,
        avatar_url: undefined,
      });

      console.log('👤 Пользователь создан/найден:', { id: user.id, telegram_id: user.telegram_id });

      // Создаем или получаем чат
      const chat = await this.chatService.create({
        user_id: user.id,
        status: 'waiting',
        priority: 'medium',
        source: 'telegram',
      });

      console.log('💬 Чат создан/найден:', { id: chat.id, user_id: chat.user_id });

      // Отправляем приветственное сообщение через Telegram API (только если бот инициализирован)
      if (this.bot) {
        try {
          await this.sendMessage(chatId, 'Добро пожаловать! Чем могу помочь?');
        } catch (error) {
          console.log('⚠️ Не удалось отправить сообщение в Telegram (возможно, тестовый режим):', error.message);
        }
      } else {
        console.log('⚠️ Telegram бот не инициализирован, пропускаем отправку сообщения');
      }

      // Сохраняем ответ бота в базе данных
      await this.messageService.createBotMessage(chat.id,
        'Добро пожаловать! Чем могу помочь?',
      );

      // Обновляем активность пользователя
      await this.userService.updateActivity(userId);
    } catch (error) {
      logger.error('Ошибка обработки команды /start:', error);
      throw error;
    }
  }

  async handleMessage(message: Record<string, unknown>): Promise<void> {
    try {
      console.log('🎯 handleMessage вызван с сообщением:', JSON.stringify(message, null, 2));
      
      const chatId = (message as any).chat.id;
      const userId = (message as any).from.id;
      const text = (message as any).text || '';
      // const _messageId = message.message_id; // Не используется

      console.log('🔍 Обработка сообщения:', { chatId, userId, text });

      // Проверяем команду /start
      if (text === '/start') {
        console.log('⭐ Обработка команды /start');
        await this.handleStartCommand(Number(chatId), Number(userId), (message as any).from.username);
        return;
      }

      // Получаем или создаем пользователя
      console.log('👤 Получение/создание пользователя...');
      const user = await this.userService.getOrCreate({
        telegram_id: userId,
        username: (message as any).from.username,
        first_name: (message as any).from.first_name,
        last_name: (message as any).from.last_name,
        avatar_url: undefined,
      });
      console.log('✅ Пользователь создан/найден:', user.id);

      // Получаем или создаем чат
      console.log('💬 Создание чата...');
      const chat = await this.chatService.create({
        user_id: user.id,
        status: 'waiting',
        priority: 'medium',
        source: 'telegram',
      });
      console.log('✅ Чат создан:', chat.id);

      // Создаем сообщение пользователя
      console.log('📝 Создание сообщения пользователя...');
      await this.messageService.createUserMessage(Number(chatId).toString(), user.id, String(text));
      console.log('✅ Сообщение пользователя создано');

      // Обновляем активность пользователя
      console.log('⏰ Обновление активности пользователя...');
      await this.userService.updateActivity(Number(userId));
      console.log('✅ Активность пользователя обновлена');

      // Обрабатываем сообщение (логика бота)
      console.log('🤖 Обработка сообщения ботом...');
      await this.processUserMessage(Number(chat.id), String(text), Number(userId));
      console.log('✅ Сообщение обработано ботом');
    } catch (error) {
      logger.error('Ошибка обработки сообщения:', error);
      throw error;
    }
  }

  // Обработка отредактированных сообщений
  async handleEditedMessage(message: TelegramMessage): Promise<void> {
    try {
      logger.info('Получено отредактированное сообщение от Telegram', {
        messageId: message.message_id,
        fromId: message.from.id,
        chatId: message.chat.id,
        text: message.text?.substring(0, 100),
      });

      // Находим существующее сообщение и обновляем его
      if (message.text) {
        await this.messageService.updateMessageByTelegramId(message.message_id, {
          text: message.text,
          metadata: {
            source: 'telegram',
            channel: 'edit',
            telegram_message_id: message.message_id,
            telegram_edit_date: message.edit_date,
            is_edited: true,
          },
        });
      }

    } catch (error) {
      logger.error('Ошибка обработки отредактированного сообщения Telegram', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: message.message_id,
        fromId: message.from.id,
      });
    }
  }

  async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    try {
      if (!query.message || !query.from || !query.data) {
        throw new Error('Неполные данные callback query');
      }
      const chatId = Number(query.message.chat.id);
      const userId = Number(query.from.id);
      const data = String(query.data);

      // Получаем или создаем пользователя
      const user = await this.userService.getOrCreate({
        telegram_id: userId,
        username: query.from.username,
        first_name: query.from.first_name,
        last_name: query.from.last_name,
        avatar_url: undefined,
      });

      // Получаем или создаем чат
      const chat = await this.chatService.create({
        user_id: user.id,
        status: 'waiting',
        priority: 'medium',
        source: 'telegram',
      });

      // Создаем сообщение пользователя
      await this.messageService.createBotMessage(chatId.toString(), `Callback: ${data}`);

      // Обновляем активность пользователя
      await this.userService.updateActivity(userId);

      // Обрабатываем callback (логика бота)
      await this.processCallbackQuery(Number(chat.id), data, userId);
    } catch (error) {
      logger.error('Ошибка обработки callback query:', error);
      throw error;
    }
  }

  // Обработка медиа сообщений
  private async handleMediaMessage(message: TelegramMessage, chatId: number, userId: number): Promise<void> {
    try {
      let mediaType = 'unknown';
      let mediaData: any = {};

      if (message.photo) {
        mediaType = 'photo';
        mediaData = {
          file_id: message.photo[message.photo.length - 1].file_id,
          width: message.photo[message.photo.length - 1].width,
          height: message.photo[message.photo.length - 1].height,
        };
      } else if (message.document) {
        mediaType = 'document';
        mediaData = {
          file_id: message.document.file_id,
          file_name: message.document.file_name,
          mime_type: message.document.mime_type,
          file_size: message.document.file_size,
        };
      } else if (message.audio) {
        mediaType = 'audio';
        mediaData = {
          file_id: message.audio.file_id,
          duration: message.audio.duration,
          title: message.audio.title,
          performer: message.audio.performer,
        };
      } else if (message.voice) {
        mediaType = 'voice';
        mediaData = {
          file_id: message.voice.file_id,
          duration: message.voice.duration,
        };
      } else if (message.video) {
        mediaType = 'video';
        mediaData = {
          file_id: message.video.file_id,
          duration: message.video.duration,
          width: message.video.width,
          height: message.video.height,
        };
      }

      // Сохраняем медиа сообщение
      await this.messageService.createMessage({
        chatId: chatId.toString(),
        authorType: 'user',
        authorId: userId,
        text: message.caption || `[${mediaType.toUpperCase()}]`,
        metadata: {
          media_type: mediaType,
          media_data: mediaData,
          telegram_date: message.date,
          telegram_message_id: message.message_id,
        },
      });

    } catch (error) {
      logger.error('Ошибка обработки медиа сообщения Telegram', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: message.message_id,
        chatId,
        userId,
      });
    }
  }

  // Проверка необходимости эскалации
  private async checkEscalation(chat: any, message: TelegramMessage): Promise<void> {
    try {
      // Простая логика эскалации: если сообщение содержит ключевые слова
      const escalationKeywords = ['помощь', 'поддержка', 'оператор', 'человек', 'человека'];
      const messageText = message.text?.toLowerCase() || '';

      const needsEscalation = escalationKeywords.some(keyword =>
        messageText.includes(keyword),
      );

      if (needsEscalation && chat.status === 'waiting') {
        const chatId = Number(chat.id);
        await this.chatService.escalateChat(chatId.toString(), 'Автоматическая эскалация по ключевому слову');
        logger.info('Чат эскалирован автоматически', {
          chatId,
          reason: 'Автоматическая эскалация по ключевому слову',
          messageText: message.text?.substring(0, 100),
        });
      }

    } catch (error) {
      logger.error('Ошибка проверки эскалации', {
        error: error instanceof Error ? error.message : 'Unknown error',
        chatId: (chat).id,
      });
    }
  }

  // Обработка callback данных
  private async processCallbackData(data: string, userId: number): Promise<void> {
    try {
      const [action] = data.split(':');

      switch (action) {
        case 'help':
          await this.sendHelpMessage(userId);
          break;
        case 'contact':
          await this.sendContactInfo(userId);
          break;
        case 'menu':
          await this.sendMainMenu(userId);
          break;
        default:
          logger.warn('Неизвестный callback action', { action, data, userId });
      }

    } catch (error) {
      logger.error('Ошибка обработки callback данных', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
        userId,
      });
    }
  }

  // Отправка сообщения
  async sendMessage(chatId: number, text: string, options?: {
    parse_mode?: string;
    reply_markup?: Record<string, unknown>;
    disable_web_page_preview?: boolean;
  }): Promise<unknown> {
    try {
      const messageOptions: Record<string, unknown> = {};

      if (options?.parse_mode) {
        messageOptions['parse_mode'] = options.parse_mode;
      }
      if (options?.reply_markup) {
        messageOptions['reply_markup'] = options.reply_markup;
      }
      if (options?.disable_web_page_preview) {
        messageOptions['disable_web_page_preview'] = options.disable_web_page_preview;
      }

      const result = await this.bot.sendMessage(chatId, text, messageOptions);
      return result;
    } catch (error) {
      logger.error('Ошибка отправки сообщения:', error);
      throw error;
    }
  }

  // Отправка сообщения с клавиатурой
  async sendMessageWithKeyboard(chatId: number, text: string, keyboard: string[][]): Promise<unknown> {
    const replyMarkup = {
      keyboard: keyboard,
      resize_keyboard: true,
      one_time_keyboard: false,
    };

    return this.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  }

  // Отправка inline клавиатуры
  async sendMessageWithInlineKeyboard(chatId: number, text: string, inlineKeyboard: Array<Array<{ text: string; callback_data: string }>>): Promise<unknown> {
    const replyMarkup = {
      inline_keyboard: inlineKeyboard,
    };

    return this.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  }

  // Отправка главного меню
  async sendMainMenu(chatId: number): Promise<void> {
    const keyboard = [
      ['📋 Помощь', '📞 Связаться'],
      ['ℹ️ Информация', '🔧 Настройки'],
    ];

    await this.sendMessageWithKeyboard(chatId, 'Выберите действие:', keyboard);
  }

  // Отправка сообщения помощи
  async sendHelpMessage(chatId: number): Promise<void> {
    const helpText = `
🤖 <b>Служба поддержки</b>

Здесь вы можете получить помощь по любым вопросам.

<b>Доступные команды:</b>
/start - Главное меню
/help - Это сообщение
/contact - Связаться с оператором

<b>Как это работает:</b>
1. Опишите вашу проблему
2. Бот попытается помочь автоматически
3. При необходимости вас перенаправит к оператору
4. Оператор ответит в ближайшее время

<b>Время работы:</b>
24/7 - автоматические ответы
9:00-18:00 - операторы
    `;

    await this.sendMessage(chatId, helpText, {
      parse_mode: 'HTML',
    });
  }

  // Отправка контактной информации
  async sendContactInfo(chatId: number): Promise<void> {
    const contactText = `
📞 <b>Контактная информация</b>

<b>Телефон:</b> +7 (XXX) XXX-XX-XX
<b>Email:</b> support@example.com
<b>Сайт:</b> https://example.com

<b>Время работы операторов:</b>
Пн-Пт: 9:00-18:00
Сб-Вс: 10:00-16:00

<b>Экстренная поддержка:</b>
Круглосуточно через бота
    `;

    await this.sendMessage(chatId, contactText, {
      parse_mode: 'HTML',
    });
  }

  // Установка webhook
  async setWebhook(url: string): Promise<boolean> {
    try {
      const result = await this.bot.setWebHook(url);
      logger.info('Webhook установлен:', result);
      return result;
    } catch (error) {
      logger.error('Ошибка установки webhook:', error);
      throw error;
    }
  }

  // Удаление webhook
  async deleteWebhook(): Promise<boolean> {
    try {
      const result = await this.bot.deleteWebHook();
      logger.info('Webhook удален:', result);
      return result;
    } catch (error) {
      logger.error('Ошибка удаления webhook:', error);
      throw error;
    }
  }

  // Получение информации о webhook
  async getWebhookInfo(): Promise<unknown> {
    try {
      const webhookInfo = await this.bot.getWebHookInfo();
      logger.info('Информация о webhook получена', { webhookInfo });
      return webhookInfo;
    } catch (error) {
      logger.error('Ошибка получения информации о webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Получение информации о боте
  async getBotInfo(): Promise<unknown> {
    try {
      const botInfo = await this.bot.getMe();
      logger.info('Информация о боте получена', { botInfo });
      return botInfo;
    } catch (error) {
      logger.error('Ошибка получения информации о боте', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Получение обновлений
  async getUpdates(offset?: number, limit?: number, timeout?: number): Promise<unknown[]> {
    try {
      const updates = await this.bot.getUpdates({
        offset,
        limit,
        timeout,
      });
      return updates;
    } catch (error) {
      logger.error('Ошибка получения обновлений', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Обработка входящих обновлений
  async handleIncomingMessage(update: Record<string, unknown>): Promise<void> {
    try {
      if (update['message']) {
        await this.handleMessage(update['message'] as Record<string, unknown>);
      } else if (update['edited_message']) {
        await this.handleEditedMessage(update['edited_message'] as TelegramMessage);
      } else if (update['callback_query']) {
        await this.handleCallbackQuery(update['callback_query'] as TelegramCallbackQuery);
      }
    } catch (error) {
      logger.error('Ошибка обработки входящего сообщения', {
        error: error instanceof Error ? error.message : 'Unknown error',
        update,
      });
    }
  }

  // Обработка сообщения пользователя с использованием RAG
  async processUserMessage(chatId: number, text: string, userId: number): Promise<void> {
    try {
      logger.info('🤖 Обработка сообщения пользователя через RAG', {
        chatId,
        userId,
        text: text.substring(0, 100),
      });

      let response: string;

      try {
        // Обрабатываем запрос через RAG пайплайн
        const ragResponse = await this.ragService.processQuery({
          question: text,
          userId: userId.toString(),
          chatId: chatId.toString(),
          language: 'ru',
          options: {
            temperature: 0.3,
            maxTokens: 1000,
            topK: 5,
            minSimilarity: 0.5,
          },
        });

        // Формируем ответ с учетом уверенности
        response = ragResponse.answer;
        
        // Если уверенность низкая, добавляем предложение обратиться к оператору
        if (ragResponse.confidence < 0.6) {
          response += '\n\nЕсли нужна дополнительная помощь, я передам ваш вопрос оператору поддержки.';
        }

        // Добавляем информацию об источниках (опционально, для отладки)
        if (ragResponse.sources.length > 0 && ragResponse.confidence > 0.7) {
          response += `\n\n📚 Найдено ${ragResponse.sources.length} релевантных источников.`;
        }

        logger.info('✅ RAG ответ сгенерирован', {
          chatId,
          userId,
          confidence: ragResponse.confidence,
          sourcesCount: ragResponse.sources.length,
          totalTime: ragResponse.totalTime,
          fallbackUsed: ragResponse.metadata.fallbackUsed,
        });

      } catch (ragError) {
        logger.warn('⚠️ RAG сервис недоступен, используем простой ответ', {
          error: ragError instanceof Error ? ragError.message : 'Unknown error',
          chatId,
          userId,
        });

        // Простой ответ без RAG
        response = 'Спасибо за ваше сообщение! Я получил его и передам оператору поддержки.';
      }

      // Отправляем ответ
      await this.sendMessage(chatId, response);

      // Сохраняем ответ бота
      await this.messageService.createBotMessage(chatId.toString(), response);

      logger.info('✅ Ответ отправлен пользователю', {
        chatId,
        userId,
        response: response.substring(0, 100),
      });

    } catch (error) {
      logger.error('❌ Ошибка обработки сообщения пользователя', {
        error: error instanceof Error ? error.message : 'Unknown error',
        chatId,
        userId,
        text: text.substring(0, 100),
      });

      // Fallback ответ при ошибке
      const fallbackResponse = 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте переформулировать вопрос или обратитесь к оператору поддержки.';
      
      try {
        await this.sendMessage(chatId, fallbackResponse);
        await this.messageService.createBotMessage(chatId.toString(), fallbackResponse);
      } catch (sendError) {
        logger.error('❌ Ошибка отправки fallback ответа', { sendError });
      }
    }
  }

  // Обработка callback query
  async processCallbackQuery(chatId: number, data: string, userId: number): Promise<void> {
    try {
      await this.processCallbackData(data, userId);
    } catch (error) {
      logger.error('Ошибка обработки callback query', {
        error: error instanceof Error ? error.message : 'Unknown error',
        chatId,
        userId,
        data,
      });
    }
  }
}
