import express from 'express';
import jwt from 'jsonwebtoken';
import { requireOperator } from '../middleware/auth';
import { cacheMiddleware, createCacheInvalidationMiddleware } from '../middleware/cache';
import { rateLimitMiddleware } from '../services/rateLimiter';
import { queryAnalyzerMiddleware } from '../middleware/queryAnalyzer';
import { ChatService } from '../services/chat';
import { MessageService } from '../services/message';
import { OperatorService } from '../services/operator';
import { NoteService } from '../services/note';
import { CaseService } from '../services/case';
import { CannedResponseService } from '../services/cannedResponse';
import { AttachmentService } from '../services/attachment';

// Helper функция для обертывания async handlers
// Helper функция для обертывания async handlers для исправления no-misused-promises
const asyncHandler = (fn: (req: express.Request, res: express.Response) => Promise<void>) => 
  (req: express.Request, res: express.Response) => { void fn(req, res); };

const router = express.Router();

// Создаем instances сервисов
const chatService = new ChatService();
const messageService = new MessageService();
const operatorService = new OperatorService();
const noteService = new NoteService();
const caseService = new CaseService();
const cannedResponseService = new CannedResponseService();
const attachmentService = new AttachmentService();

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Получение списка чатов с фильтрацией
 *     description: Возвращает список чатов с возможностью фильтрации по статусу, приоритету, оператору и другим параметрам
 *     tags: [Чаты]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, closed, resolved]
 *         description: Фильтр по статусу чата
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Фильтр по приоритету
 *       - in: query
 *         name: operator_id
 *         schema:
 *           type: integer
 *         description: ID оператора
 *       - in: query
 *         name: has_attachments
 *         schema:
 *           type: boolean
 *         description: Фильтр по наличию вложений
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Количество элементов на странице
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию чата
 *     responses:
 *       200:
 *         description: Список чатов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Chat'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/chats', requireOperator, rateLimitMiddleware.search(), queryAnalyzerMiddleware(), cacheMiddleware.paginated, asyncHandler(async (req, res) => {
  try {
    const filters = {
      status: req.query['status'] ? (req.query['status'] as string).split(',') : undefined,
      source: req.query['source'] ? (req.query['source'] as string).split(',') : undefined,
      priority: req.query['priority'] ? (req.query['priority'] as string).split(',') : undefined,
      has_attachments: req.query['has_attachments'] === 'true',
      operator_id: req.query['operator_id'] ? parseInt(req.query['operator_id'] as string) : undefined,
      page: req.query['page'] ? parseInt(req.query['page'] as string) : 1,
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : 20,
    };

    const chats = await chatService.getChats(filters);
    res.json(chats);
  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    res.status(500).json({ error: 'Не удалось получить чаты' });
  }
}));

// Получение конкретного чата
router.get('/chats/:id', requireOperator, cacheMiddleware.short, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const chat = await chatService.getChatById(chatId);
    if (!chat) {
      res.status(404).json({ error: 'Чат не найден' });
      return;
    }

    res.json(chat);
  } catch (error) {
    console.error('Ошибка получения чата:', error);
    res.status(500).json({ error: 'Не удалось получить чат' });
  }
}));

// Взятие чата в работу
router.post('/chats/:id/take', requireOperator, createCacheInvalidationMiddleware(['short:*', 'paginated:*']), asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const operatorId = Number((req as any).user.id);
    const chat = await chatService.takeChat(chatId, operatorId);

    res.json(chat);
  } catch (error) {
    console.error('Ошибка взятия чата:', error);
    res.status(500).json({ error: 'Не удалось взять чат в работу' });
  }
}));

// Закрытие чата
router.post('/chats/:id/close', requireOperator, createCacheInvalidationMiddleware(['short:*', 'paginated:*']), asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const operatorId = Number((req as any).operator?.id) || 1; // Получаем ID оператора из middleware
    const chat = await chatService.closeChat(chatId, operatorId);
    res.json(chat);
  } catch (error) {
    console.error('Ошибка закрытия чата:', error);
    res.status(500).json({ error: 'Не удалось закрыть чат' });
  }
}));

// Обновление приоритета чата
router.put('/chats/:id/priority', requireOperator, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const { priority } = req.body;
    if (!priority || !['low', 'medium', 'high', 'urgent'].includes(String(priority))) {
      res.status(400).json({ error: 'Недействительный приоритет' });
      return;
    }

    const chat = await chatService.updateChatPriority(chatId, String(priority));
    res.json(chat);
  } catch (error) {
    console.error('Ошибка обновления приоритета:', error);
    res.status(500).json({ error: 'Не удалось обновить приоритет' });
  }
}));

// Получение сообщений чата
router.get('/chats/:id/messages', requireOperator, cacheMiddleware.short, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 50;
    const offset = req.query['offset'] ? parseInt(req.query['offset'] as string) : 0;

    const messages = await messageService.getMessagesByChatId(chatId, limit, offset);
    res.json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: 'Не удалось получить сообщения' });
  }
}));

// Отправка сообщения оператора
router.post('/chats/:id/messages', requireOperator, createCacheInvalidationMiddleware(['short:*']), asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Текст сообщения обязателен' });
      return;
    }

    const operatorId = Number((req as any).user.id);
    const message = await messageService.createMessage({
      chatId: chatId,
      authorType: 'operator',
      authorId: operatorId,
      text,
      metadata: { is_public: true },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Ошибка создания сообщения:', error);
    res.status(500).json({ error: 'Не удалось создать сообщение' });
  }
}));

// Обновление сообщения
router.put('/messages/:id', requireOperator, asyncHandler(async (req, res) => {
  try {
    const messageId = parseInt(req.params['id'] || '0');
    if (isNaN(messageId) || messageId <= 0) {
      res.status(400).json({ error: 'Недействительный ID сообщения' });
    }

    const { text } = req.body;
    const message = await messageService.updateMessage(messageId, { text });

    if (!message) {
      res.status(404).json({ error: 'Сообщение не найдено' });
    }

    res.json(message);
  } catch (error) {
    console.error('Ошибка обновления сообщения:', error);
    res.status(500).json({ error: 'Не удалось обновить сообщение' });
  }
}));

// Получение информации об операторе
router.get('/operators/:id', requireOperator, cacheMiddleware.medium, asyncHandler(async (req, res) => {
  try {
    const operatorId = parseInt(req.params['id'] || '0');
    if (isNaN(operatorId) || operatorId <= 0) {
      res.status(400).json({ error: 'Недействительный ID оператора' });
    }

    const operator = await operatorService.getOperatorById(operatorId);
    if (!operator) {
      res.status(404).json({ error: 'Оператор не найден' });
    }

    res.json(operator);
  } catch (error) {
    console.error('Ошибка получения оператора:', error);
    res.status(500).json({ error: 'Не удалось получить оператора' });
  }
}));

// Обновление статуса оператора
router.put('/operators/:id/status', requireOperator, asyncHandler(async (req, res) => {
  try {
    const operatorId = parseInt(req.params['id'] || '0');
    if (isNaN(operatorId) || operatorId <= 0) {
      res.status(400).json({ error: 'Недействительный ID оператора' });
    }

    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      res.status(400).json({ error: 'Статус активности должен быть boolean' });
      return;
    }

    const operator = await operatorService.updateOperatorStatus(operatorId, Boolean(is_active));
    res.json(operator);
  } catch (error) {
    console.error('Ошибка обновления статуса оператора:', error);
    res.status(500).json({ error: 'Не удалось обновить статус оператора' });
  }
}));

// Поиск чатов
router.get('/search/chats', requireOperator, rateLimitMiddleware.search(), queryAnalyzerMiddleware(), cacheMiddleware.medium, asyncHandler(async (req, res) => {
  try {
    const query = req.query['q'] as string;
    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Поисковый запрос обязателен' });
    }

    const chats = await chatService.searchChats(query);
    res.json(chats);
  } catch (error) {
    console.error('Ошибка поиска чатов:', error);
    res.status(500).json({ error: 'Не удалось выполнить поиск' });
  }
}));

// Поиск сообщений
router.get('/search/messages', requireOperator, cacheMiddleware.medium, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.query['chat_id'] as string);
    const query = req.query['q'] as string;

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Поисковый запрос обязателен' });
    }

    const messages = await messageService.searchMessages(query, chatId);
    res.json(messages);
  } catch (error) {
    console.error('Ошибка поиска сообщений:', error);
    res.status(500).json({ error: 'Не удалось выполнить поиск' });
  }
}));

// Эскалация чата
router.post('/chats/:id/escalate', requireOperator, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const { reason } = req.body;
    const chat = await chatService.escalateChat(chatId, String(reason));

    res.json(chat);
  } catch (error) {
    console.error('Ошибка эскалации чата:', error);
    res.status(500).json({ error: 'Не удалось эскалировать чат' });
  }
}));

// Добавление тегов к чату
router.post('/chats/:id/tags', requireOperator, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      res.status(400).json({ error: 'Теги должны быть массивом' });
      return;
    }

    const chat = await chatService.addTags(chatId, tags as string[]);
    res.json(chat);
  } catch (error) {
    console.error('Ошибка добавления тегов:', error);
    res.status(500).json({ error: 'Не удалось добавить теги' });
  }
}));

// Получение заметок чата
router.get('/chats/:id/notes', requireOperator, cacheMiddleware.short, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const notes = await noteService.getNotesByChatId(chatId);
    res.json(notes);
  } catch (error) {
    console.error('Ошибка получения заметок:', error);
    res.status(500).json({ error: 'Не удалось получить заметки' });
  }
}));

// Создание заметки
router.post('/chats/:id/notes', requireOperator, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const { content, type = 'internal', is_private = true } = req.body;
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Содержание заметки обязательно' });
    }

    const operatorId = Number((req as any).user.id);
    const note = await noteService.createNote({
      chat_id: chatId,
      author_id: operatorId,
      author_name: (req as any).operator?.name || 'Оператор',
      content,
      type,
      is_private,
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Ошибка создания заметки:', error);
    res.status(500).json({ error: 'Не удалось создать заметку' });
  }
}));

// Получение готовых ответов
router.get('/canned-responses', requireOperator, cacheMiddleware.long, asyncHandler(async (req, res) => {
  try {
    const { category } = req.query;
    const responses = await cannedResponseService.getCannedResponses(category as string);
    res.json(responses);
  } catch (error) {
    console.error('Ошибка получения готовых ответов:', error);
    res.status(500).json({ error: 'Не удалось получить готовые ответы' });
  }
}));

// Получение вложений чата
router.get('/chats/:id/attachments', requireOperator, cacheMiddleware.medium, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const attachments = await attachmentService.getAttachmentsByChatId(chatId);
    res.json(attachments);
  } catch (error) {
    console.error('Ошибка получения вложений:', error);
    res.status(500).json({ error: 'Не удалось получить вложения' });
  }
}));

// Получение кейсов чата
router.get('/chats/:id/cases', requireOperator, cacheMiddleware.medium, asyncHandler(async (req, res) => {
  try {
    const chatId = parseInt(req.params['id'] || '0');
    if (isNaN(chatId) || chatId <= 0) {
      res.status(400).json({ error: 'Недействительный ID чата' });
      return;
    }

    const cases = await caseService.getCasesByChatId(chatId);
    res.json(cases);
  } catch (error) {
    console.error('Ошибка получения кейсов:', error);
    res.status(500).json({ error: 'Не удалось получить кейсы' });
  }
}));

// Получение статистики чатов
router.get('/stats', requireOperator, cacheMiddleware.short, asyncHandler(async (req, res) => {
  try {
    const stats = await chatService.getChatStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Ошибка получения статистики чатов:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Не удалось получить статистику чатов' 
    });
  }
}));

// Создание тестового оператора (только для разработки)
router.post('/test-operator', asyncHandler(async (req, res) => {
  try {
    // Проверяем, что это только для разработки
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ 
        success: false, 
        error: 'Создание тестовых операторов запрещено в продакшене' 
      });
      return;
    }

    const operatorService = new OperatorService();
    const testOperator = await operatorService.createOperator({
      name: 'Test Operator',
      email: 'test@operator.com',
      role: 'admin',
      is_active: true,
      max_chats: 10
    });

    // Создаем JWT токен для тестового оператора
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
    
    const token = jwt.sign({
      id: testOperator.id,
      email: testOperator.email,
      role: testOperator.role,
      operatorId: testOperator.id
    }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      data: {
        operator: testOperator,
        token: token
      },
      message: 'Тестовый оператор создан успешно'
    });
  } catch (error) {
    console.error('Ошибка создания тестового оператора:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Не удалось создать тестового оператора' 
    });
  }
}));

// Получение JWT токена для существующего оператора (только для разработки)
router.post('/login-test-operator', asyncHandler(async (req, res) => {
  try {
    // Проверяем, что это только для разработки
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ 
        success: false, 
        error: 'Вход тестовых операторов запрещен в продакшене' 
      });
      return;
    }

    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ 
        success: false, 
        error: 'Email обязателен' 
      });
      return;
    }

    const operatorService = new OperatorService();
    const operator = await operatorService.getOperatorByEmail(email);
    
    if (!operator) {
      res.status(404).json({ 
        success: false, 
        error: 'Оператор не найден' 
      });
      return;
    }

    // Создаем JWT токен для оператора
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
    
    const token = jwt.sign(
      { 
        id: operator.id, 
        email: operator.email, 
        role: operator.role,
        type: 'operator'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        operator: {
          id: operator.id,
          name: operator.name,
          email: operator.email,
          role: operator.role
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Ошибка входа тестового оператора:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось войти в систему'
    });
  }
}));

// Отладочный эндпоинт для проверки JWT_SECRET (только для разработки)
router.get('/debug-jwt', asyncHandler(async (req, res) => {
  try {
    // Проверяем, что это только для разработки
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ 
        success: false, 
        error: 'Отладочные эндпоинты запрещены в продакшене' 
      });
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
    
    // Генерируем тестовый токен
    const testPayload = {
      id: 1,
      email: 'test@operator.com',
      role: 'admin',
      type: 'operator'
    };

    const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      success: true,
      data: {
        process_env_jwt_secret: process.env.JWT_SECRET,
        used_jwt_secret: JWT_SECRET,
        node_env: process.env.NODE_ENV,
        test_token: token,
        test_payload: testPayload
      }
    });
    
  } catch (error) {
    console.error('Ошибка отладки JWT:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось выполнить отладку JWT'
    });
  }
}));

// Отладочный эндпоинт для проверки JWT_SECRET в middleware (только для разработки)
router.get('/debug-auth', asyncHandler(async (req, res) => {
  try {
    // Проверяем, что это только для разработки
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ 
        success: false, 
        error: 'Отладочные эндпоинты запрещены в продакшене' 
      });
      return;
    }

    // Имитируем логику middleware аутентификации
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
    
    // Генерируем тестовый токен с тем же секретом
    const testPayload = {
      id: 1,
      email: 'test@operator.com',
      role: 'admin',
      type: 'operator'
    };

    const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1h' });

    // Теперь попробуем верифицировать токен как в middleware
    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as Record<string, unknown>;
      
      res.json({
        success: true,
        data: {
          process_env_jwt_secret: process.env.JWT_SECRET,
          used_jwt_secret: JWT_SECRET,
          node_env: process.env.NODE_ENV,
          test_token: token,
          test_payload: testPayload,
          verification_success: true,
          decoded_token: decoded
        }
      });
    } catch (verificationError) {
      res.json({
        success: false,
        data: {
          process_env_jwt_secret: process.env.JWT_SECRET,
          used_jwt_secret: JWT_SECRET,
          node_env: process.env.NODE_ENV,
          test_token: token,
          test_payload: testPayload,
          verification_success: false,
          verification_error: verificationError.message
        }
      });
    }
    
  } catch (error) {
    console.error('Ошибка отладки аутентификации:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось выполнить отладку аутентификации'
    });
  }
}));

export default router;
