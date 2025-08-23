import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

/**
 * Конфигурация Swagger/OpenAPI
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Telegram Bot Support API',
      version: '1.0.0',
      description: `
        API для системы поддержки Telegram бота с функциями:
        
        ## 🚀 Основные возможности
        
        - **Управление чатами** - создание, просмотр, обновление чатов
        - **Система операторов** - управление операторами поддержки
        - **Обработка сообщений** - отправка и получение сообщений
        - **Загрузка файлов** - безопасная загрузка и валидация файлов
        - **Redis кэширование** - оптимизация производительности API
        - **Rate Limiting** - защита от DDoS атак
        - **Оптимизация SQL** - мониторинг и анализ производительности
        - **Обработка ошибок** - централизованная система обработки ошибок
        
        ## 🔐 Аутентификация
        
        API использует Bearer токены для аутентификации. Добавьте заголовок:
        \`\`\`
        Authorization: Bearer <your-token>
        \`\`\`
        
        ## 📊 Мониторинг
        
        - Health check: \`GET /health\`
        - Метрики производительности
        - Статистика ошибок
        - Анализ SQL запросов
        
        ## 🛡️ Безопасность
        
        - Валидация входных данных
        - Rate limiting
        - Защита от SQL инъекций
        - Валидация файлов
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
        url: 'https://example.com/support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT || 3000}`,
          description: 'Development server',
        },
        {
          url: 'https://api.production.com',
          description: 'Production server',
        },
      ],
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT токен для аутентификации операторов',
        },
      },
      schemas: {
        // Базовые схемы
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'VALIDATION' },
                code: { type: 'string', example: 'INVALID_INPUT' },
                message: { type: 'string', example: 'Ошибка валидации' },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', example: 'req_1234567890_abc123def' },
              },
            },
          },
        },
        
        // Операторы
        Operator: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'operator1' },
            email: { type: 'string', format: 'email', example: 'operator@example.com' },
            firstName: { type: 'string', example: 'Иван' },
            lastName: { type: 'string', example: 'Иванов' },
            role: { type: 'string', enum: ['operator', 'admin', 'supervisor'], example: 'operator' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        
        // Чаты
        Chat: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            telegramId: { type: 'integer', example: 123456789 },
            title: { type: 'string', example: 'Чат с пользователем' },
            status: { type: 'string', enum: ['open', 'in_progress', 'closed', 'resolved'], example: 'open' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], example: 'medium' },
            operatorId: { type: 'integer', nullable: true, example: 1 },
            userId: { type: 'integer', example: 1 },
            hasAttachments: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            lastMessageAt: { type: 'string', format: 'date-time' },
          },
        },
        
        // Сообщения
        Message: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            chatId: { type: 'integer', example: 1 },
            operatorId: { type: 'integer', nullable: true, example: 1 },
            text: { type: 'string', example: 'Здравствуйте! Чем могу помочь?' },
            type: { type: 'string', enum: ['user', 'operator', 'bot'], example: 'operator' },
            isRead: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        
        // Пользователи
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            telegramId: { type: 'integer', example: 123456789 },
            username: { type: 'string', nullable: true, example: 'user123' },
            firstName: { type: 'string', example: 'Пользователь' },
            lastName: { type: 'string', nullable: true, example: 'Тестовый' },
            language: { type: 'string', example: 'ru' },
            isActive: { type: 'boolean', example: true },
            lastActivityAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        
        // Вложения
        Attachment: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            chatId: { type: 'integer', example: 1 },
            messageId: { type: 'integer', nullable: true, example: 1 },
            fileName: { type: 'string', example: 'document.pdf' },
            filePath: { type: 'string', example: '/uploads/document.pdf' },
            fileSize: { type: 'integer', example: 1024 },
            mimeType: { type: 'string', example: 'application/pdf' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        
        // Заметки
        Note: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            chatId: { type: 'integer', example: 1 },
            operatorId: { type: 'integer', example: 1 },
            text: { type: 'string', example: 'Важная заметка о пользователе' },
            isPrivate: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        
        // Готовые ответы
        CannedResponse: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Приветствие' },
            text: { type: 'string', example: 'Здравствуйте! Чем могу помочь?' },
            category: { type: 'string', example: 'greeting' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        
        // Статистика
        ChatStats: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            open: { type: 'integer', example: 25 },
            inProgress: { type: 'integer', example: 15 },
            closed: { type: 'integer', example: 60 },
            avgResponseTime: { type: 'number', example: 2.5 },
            avgResolutionTime: { type: 'number', example: 15.3 },
          },
        },
        
        // Пагинация
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
        
        // Фильтры чатов
        ChatFilters: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'in_progress', 'closed', 'resolved'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            operatorId: { type: 'integer' },
            hasAttachments: { type: 'boolean' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
            search: { type: 'string' },
          },
        },
        
        // Загрузка файла
        FileUpload: {
          type: 'object',
          properties: {
            file: { type: 'string', format: 'binary' },
            chatId: { type: 'integer', example: 1 },
            messageId: { type: 'integer', nullable: true, example: 1 },
          },
        },
        
        // Rate Limiting
        RateLimitInfo: {
          type: 'object',
          properties: {
            limit: { type: 'integer', example: 100 },
            remaining: { type: 'integer', example: 95 },
            reset: { type: 'integer', example: 1640995200 },
            retryAfter: { type: 'integer', example: 60 },
          },
        },
        
        // Health Check
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', example: 3600 },
            environment: { type: 'string', example: 'development' },
            version: { type: 'string', example: '1.0.0' },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'connected' },
                info: {
                  type: 'object',
                  properties: {
                    connected_clients: { type: 'string', example: '5' },
                    used_memory: { type: 'string', example: '1.2M' },
                    total_commands_processed: { type: 'string', example: '1250' },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        // Общие ответы
        UnauthorizedError: {
          description: 'Ошибка аутентификации',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ForbiddenError: {
          description: 'Ошибка авторизации',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFoundError: {
          description: 'Ресурс не найден',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Ошибка валидации',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        RateLimitError: {
          description: 'Превышен лимит запросов',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        InternalServerError: {
          description: 'Внутренняя ошибка сервера',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Операторы',
        description: 'Управление операторами поддержки',
      },
      {
        name: 'Чаты',
        description: 'Управление чатами с пользователями',
      },
      {
        name: 'Сообщения',
        description: 'Отправка и получение сообщений',
      },
      {
        name: 'Пользователи',
        description: 'Информация о пользователях Telegram',
      },
      {
        name: 'Вложения',
        description: 'Загрузка и управление файлами',
      },
      {
        name: 'Заметки',
        description: 'Заметки операторов по чатам',
      },
      {
        name: 'Готовые ответы',
        description: 'Шаблоны ответов для операторов',
      },
      {
        name: 'Telegram',
        description: 'Интеграция с Telegram Bot API',
      },
      {
        name: 'Кэш',
        description: 'Управление Redis кэшированием',
      },
      {
        name: 'Rate Limiting',
        description: 'Управление ограничениями запросов',
      },
      {
        name: 'SQL Оптимизация',
        description: 'Мониторинг и оптимизация SQL запросов',
      },
      {
        name: 'Обработка ошибок',
        description: 'Система централизованной обработки ошибок',
      },
      {
        name: 'Система',
        description: 'Системные endpoints и мониторинг',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/middleware/*.ts',
    './src/services/*.ts',
    './src/index.ts',
  ],
};

/**
 * Генерируем спецификацию Swagger
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Настройки Swagger UI
 */
export const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6; font-size: 36px; }
    .swagger-ui .info .description { font-size: 16px; line-height: 1.6; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #10b981; }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #3b82f6; }
    .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #f59e0b; }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #ef4444; }
  `,
  customSiteTitle: 'Telegram Bot Support API - Документация',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
  },
};
