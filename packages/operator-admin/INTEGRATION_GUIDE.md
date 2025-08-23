
# Руководство по интеграции панели операторов

## 1. Настройка Backend API

### Требуемые эндпоинты

Создайте следующие API эндпоинты в вашем backend:

```typescript
// POST /api/chats - получение списка чатов
interface GetChatsRequest {
  status?: 'waiting' | 'in_progress' | 'closed';
  source?: 'telegram' | 'website' | 'p2p';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  has_attachments?: boolean;
  operator_id?: number;
  page?: number;
  limit?: number;
}

// GET /api/chats/:id - получение конкретного чата
// GET /api/chats/:id/messages - получение сообщений чата
// POST /api/chats/:id/messages - отправка сообщения
// POST /api/chats/:id/take - принятие чата в работу
// POST /api/chats/:id/close - закрытие чата

// GET /api/operators - получение списка операторов
// GET /api/operators/me - получение текущего оператора

// GET /api/health - проверка состояния
// GET /api/stats - статистика
```

### Структура ответов

```typescript
// GET /api/chats
interface ChatResponse {
  id: number;
  user: User;
  last_message: Message;
  status: string;
  priority: string;
  source: string;
  operator_id?: number;
  is_pinned: boolean;
  is_important: boolean;
  unread_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
}

// GET /api/chats/:id/messages
interface MessageResponse {
  id: number;
  chat_id: number;
  author_type: 'user' | 'bot' | 'operator';
  author_id: number;
  text: string;
  timestamp: string;
  is_read: boolean;
  metadata?: {
    source: string;
    channel: string;
    telegram_message_id?: number;
  };
}
```

## 2. Интеграция с Telegram Bot API

### Настройка бота

1. Создайте бота через @BotFather
2. Получите токен бота
3. Настройте webhook URL

### Webhook обработчик

```typescript
// POST /webhook/telegram
app.post('/webhook/telegram', (req, res) => {
  const { body } = req;
  
  if (body.message) {
    // Обработка нового сообщения
    handleNewMessage(body.message);
  } else if (body.callback_query) {
    // Обработка callback query
    handleCallbackQuery(body.callback_query);
  }
  
  res.sendStatus(200);
});
```

### Логика эскалации

```typescript
const escalationKeywords = [
  'оператор', 'человек', 'живой', 'жалоба', 'спор', 
  'проблема', 'ошибка', 'не работает', 'помогите'
];

function checkEscalation(text: string): boolean {
  const lowerText = text.toLowerCase();
  return escalationKeywords.some(keyword => lowerText.includes(keyword));
}
```

## 3. WebSocket для Real-time обновлений

### Подключение

```typescript
// Клиент подключается к WebSocket
const ws = new WebSocket('ws://localhost:3000/ws');

// Подписка на обновления чата
ws.send(JSON.stringify({
  type: 'subscribe_to_chat',
  chatId: 123
}));
```

### Типы сообщений

```typescript
interface WebSocketMessage {
  type: 'new_message' | 'chat_status_change' | 'chat_update';
  data: any;
  timestamp: string;
}
```

### Уведомления

```typescript
// Новое сообщение
{
  type: 'new_message',
  data: { chatId: 123, message: {...} }
}

// Изменение статуса чата
{
  type: 'chat_status_change',
  data: { chatId: 123, status: 'in_progress', operatorId: 456 }
}
```

## 4. Переменные окружения

Создайте файл `.env.local`:

```bash
# API настройки
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws

# Telegram Bot
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your_bot_token_here

# Настройки приложения
NEXT_PUBLIC_APP_NAME=Панель операторов
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 5. Аутентификация операторов

### JWT токены

```typescript
// Middleware для проверки токена
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
};
```

### Роли операторов

```typescript
enum OperatorRole {
  OPERATOR = 'operator',
  SENIOR_OPERATOR = 'senior_operator',
  ADMIN = 'admin'
}

interface Operator {
  id: number;
  name: string;
  email: string;
  role: OperatorRole;
  is_active: boolean;
  created_at: string;
}
```

## 6. База данных

### Основные таблицы

```sql
-- Пользователи
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  avatar_url TEXT,
  balance DECIMAL(10,2) DEFAULT 0,
  deals_count INTEGER DEFAULT 0,
  flags TEXT[],
  is_blocked BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);

-- Чаты
CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'waiting',
  priority VARCHAR(20) DEFAULT 'medium',
  source VARCHAR(50),
  operator_id INTEGER REFERENCES operators(id),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  unread_count INTEGER DEFAULT 0,
  escalation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Сообщения
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id),
  author_type VARCHAR(20),
  author_id INTEGER,
  text TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB
);

-- Операторы
CREATE TABLE operators (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50) DEFAULT 'operator',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 7. Развертывание

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./packages/backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/support
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis

  operator-admin:
    build: ./packages/operator-admin
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
      - NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=support
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## 8. Тестирование

### API тесты

```typescript
// Тест получения чатов
describe('GET /api/chats', () => {
  it('should return list of chats', async () => {
    const response = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

### WebSocket тесты

```typescript
// Тест WebSocket соединения
describe('WebSocket', () => {
  it('should connect and receive messages', (done) => {
    const ws = new WebSocket('ws://localhost:3000/ws');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe_to_chat',
        chatId: 123
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      expect(data.type).toBe('connection_established');
      ws.close();
      done();
    };
  });
});
```

## 9. Мониторинг и логирование

### Логирование

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Метрики

```typescript
// Prometheus метрики
import prometheus from 'prom-client';

const chatCounter = new prometheus.Counter({
  name: 'chats_total',
  help: 'Total number of chats'
});

const messageHistogram = new prometheus.Histogram({
  name: 'message_processing_duration_seconds',
  help: 'Duration of message processing'
});
```

## 10. Безопасность

### CORS настройки

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true
}));
```

### Rate limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов с одного IP
});

app.use('/api/', limiter);
```

### Валидация входных данных

```typescript
import { body, validationResult } from 'express-validator';

app.post('/api/chats/:id/messages', [
  body('text').isLength({ min: 1, max: 1000 }),
  body('attachments').optional().isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // обработка запроса
});
```

Это руководство поможет вам успешно интегрировать панель операторов с вашим backend и Telegram Bot API.
