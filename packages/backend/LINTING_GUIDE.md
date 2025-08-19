# Руководство по предотвращению ошибок линтинга

## 🎯 Цель

Этот документ описывает правила и практики для предотвращения ошибок линтинга в будущем, обеспечивая высокое качество кода и соответствие стандартам проекта.

## 🚀 Быстрый старт

### Автоматическое исправление
```bash
# Linux/Mac
npm run lint:fix:auto

# Windows
npm run lint:fix:auto:win

# Ручное исправление
npm run lint:fix
```

### Проверка линтинга
```bash
npm run lint
```

## 📋 Основные правила

### 1. Типизация TypeScript

#### ✅ Правильно
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // implementation
}

// Явная типизация для сложных объектов
const config: {
  apiUrl: string;
  timeout: number;
  retries: number;
} = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
};
```

#### ❌ Неправильно
```typescript
// Избегайте any
function processData(data: any): any {
  return data;
}

// Избегайте неявной типизации
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
} as any;
```

### 2. Обработка Promise

#### ✅ Правильно
```typescript
// Всегда обрабатывайте Promise
async function handleRequest() {
  try {
    const result = await fetchData();
    return result;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

// Используйте void для игнорирования Promise
void app.addHook('onRequest', (request, reply) => {
  // hook logic
});

// Или используйте .catch()
app.start().catch((error) => {
  console.error('Failed to start app:', error);
  process.exit(1);
});
```

#### ❌ Неправильно
```typescript
// Не оставляйте необработанные Promise
app.addHook('onRequest', (request, reply) => {
  // hook logic
});

// Не игнорируйте ошибки
app.start();
```

### 3. Async/Await

#### ✅ Правильно
```typescript
// Используйте async только когда есть await
async function fetchUserData(id: string) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// Синхронные функции без async
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

#### ❌ Неправильно
```typescript
// Не используйте async без await
async function validateEmail(email: string): Promise<boolean> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

### 4. Переменные и импорты

#### ✅ Правильно
```typescript
// Используйте const для неизменяемых значений
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRIES = 3;

// Используйте let для изменяемых значений
let retryCount = 0;

// Префикс _ для неиспользуемых параметров
function processData(_unusedParam: string, data: string) {
  return data.toUpperCase();
}

// Сортировка импортов
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { DatabaseService } from '../services/database.js';
import { Logger } from '../utils/logger.js';
```

#### ❌ Неправильно
```typescript
// Не используйте var
var apiUrl = 'https://api.example.com';

// Не оставляйте неиспользуемые переменные
function processData(unusedParam: string, data: string) {
  return data.toUpperCase();
}

// Не смешивайте импорты
import { DatabaseService } from '../services/database.js';
import { z } from 'zod';
import { FastifyInstance } from 'fastify';
```

### 5. Обработка ошибок

#### ✅ Правильно
```typescript
// Используйте типизированные ошибки
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Правильная обработка ошибок
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    throw new ValidationError(`Invalid ${error.field}`, error.field);
  }
  throw new Error('Operation failed');
}
```

#### ❌ Неправильно
```typescript
// Не бросайте литералы
throw 'Something went wrong';

// Не игнорируйте ошибки
try {
  await riskyOperation();
} catch (error) {
  // Пустой catch блок
}
```

## 🔧 Настройка IDE

### VS Code

#### Extensions
- ESLint
- TypeScript Importer
- Prettier (опционально)

#### Settings
```json
{
  "eslint.validate": ["typescript"],
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true
}
```

### WebStorm/IntelliJ

#### Settings
- Enable ESLint
- Run ESLint on file save
- Enable TypeScript strict mode

## 📝 Шаблоны кода

### Fastify Route
```typescript
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const requestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const responseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

export default async function userRoutes(app: FastifyInstance) {
  app.post('/users', {
    schema: {
      body: requestSchema,
      response: {
        200: responseSchema,
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { name, email } = request.body as z.infer<typeof requestSchema>;
        
        // Business logic here
        
        return reply.code(200).send({
          success: true,
          data: { id: 'generated-id', name, email },
        });
      } catch (error) {
        app.log.error({ error }, 'Failed to create user');
        return reply.code(500).send({ success: false, error: 'Internal server error' });
      }
    },
  });
}
```

### Service Class
```typescript
import { Logger } from '../utils/logger.js';

interface ServiceConfig {
  apiUrl: string;
  timeout: number;
}

export class UserService {
  private readonly logger: Logger;
  private readonly config: ServiceConfig;

  constructor(config: ServiceConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async getUser(id: string): Promise<User | null> {
    try {
      this.logger.info({ userId: id }, 'Fetching user');
      
      const response = await fetch(`${this.config.apiUrl}/users/${id}`, {
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        this.logger.warn({ userId: id, status: response.status }, 'User not found');
        return null;
      }

      const user = await response.json();
      this.logger.info({ userId: id }, 'User fetched successfully');
      
      return user;
    } catch (error) {
      this.logger.error({ error, userId: id }, 'Failed to fetch user');
      throw new Error('Failed to fetch user');
    }
  }
}
```

## 🚨 Частые ошибки и их исправление

### 1. `@typescript-eslint/no-floating-promises`
```typescript
// ❌ Неправильно
app.addHook('onRequest', async (request, reply) => {
  reply.header('X-Custom-Header', 'value');
});

// ✅ Правильно
app.addHook('onRequest', (request, reply) => {
  void reply.header('X-Custom-Header', 'value');
});
```

### 2. `@typescript-eslint/require-await`
```typescript
// ❌ Неправильно
async function validateInput(input: string): Promise<boolean> {
  return input.length > 0;
}

// ✅ Правильно
function validateInput(input: string): boolean {
  return input.length > 0;
}
```

### 3. `@typescript-eslint/no-unsafe-assignment`
```typescript
// ❌ Неправильно
const data = response.json() as any;

// ✅ Правильно
interface ApiResponse {
  data: unknown;
}

const response = await fetch('/api/data');
const data = (await response.json()) as ApiResponse;
```

### 4. `@typescript-eslint/no-unused-vars`
```typescript
// ❌ Неправильно
function processData(data: string, unusedParam: string) {
  return data.toUpperCase();
}

// ✅ Правильно
function processData(data: string, _unusedParam: string) {
  return data.toUpperCase();
}
```

## 📊 Мониторинг качества

### Pre-commit хуки
```bash
# Автоматическая проверка при коммите
git add .
git commit -m "feat: add new feature"
# ESLint и тесты запустятся автоматически
```

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yaml
- name: Run linting
  run: npm run lint

- name: Run tests with coverage
  run: npm run test:coverage
```

### Еженедельные отчеты
- Количество ошибок линтинга
- Покрытие тестами
- Время исправления ошибок

## 🎓 Лучшие практики

### 1. Разработка
- Пишите код с учетом правил линтинга
- Используйте TypeScript strict mode
- Документируйте сложную логику

### 2. Code Review
- Проверяйте линтинг в PR
- Требуйте исправления ошибок
- Используйте автоматические проверки

### 3. Обучение команды
- Регулярные сессии по линтингу
- Документация правил
- Примеры хорошего кода

## 🔗 Полезные ссылки

- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Fastify Best Practices](https://www.fastify.io/docs/latest/Guides/Best-Practices/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📞 Поддержка

При возникновении вопросов:
1. Проверьте этот документ
2. Запустите `npm run lint:fix:auto`
3. Обратитесь к команде разработки
4. Создайте issue в репозитории

---

**Помните**: Качественный код = меньше багов + легче поддерживать + быстрее разрабатывать! 🚀
