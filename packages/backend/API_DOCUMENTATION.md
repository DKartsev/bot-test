# 📚 API Documentation - Admin Panel

## 🔗 Base URL
```
https://bot-test-backend.onrender.com
```

## 🏥 Health Check Endpoints

### GET /health
Проверка состояния backend сервиса
```json
{
  "status": "ok",
  "service": "bot-test-backend",
  "version": "1.0.0",
  "timestamp": "2025-01-17T12:00:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "environment": "production"
}
```

### GET /admin/status
Статус для operator-admin интеграции
```json
{
  "status": "ok",
  "service": "bot-test-backend",
  "endpoints": {
    "health": "/health",
    "conversations": "/admin/conversations",
    "messages": "/admin/conversations/:id/messages",
    "metrics": "/admin/metrics",
    "faq": "/admin/faq"
  },
  "timestamp": "2025-01-17T12:00:00.000Z"
}
```

## 💬 Conversations (Диалоги)

### GET /admin/conversations
Получение списка диалогов
```json
{
  "success": true,
  "data": [
    {
      "id": "conv-1",
      "title": "Проблема с оплатой",
      "status": "open",
      "createdAt": "2025-01-17T12:00:00.000Z",
      "updatedAt": "2025-01-17T12:00:00.000Z",
      "category": "payment",
      "priority": "high",
      "assignedTo": "operator-1"
    }
  ],
  "total": 1
}
```

### GET /admin/conversations/:id/messages
Получение сообщений диалога
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-1",
      "content": "Здравствуйте! У меня проблема с оплатой заказа",
      "role": "user",
      "timestamp": "2025-01-17T12:00:00.000Z"
    }
  ],
  "conversationId": "conv-1"
}
```

### POST /admin/conversations
Создание нового диалога
```json
// Request
{
  "title": "Новый диалог",
  "category": "general",
  "priority": "medium"
}

// Response
{
  "success": true,
  "data": {
    "id": "conv-1234567890",
    "title": "Новый диалог",
    "status": "open",
    "createdAt": "2025-01-17T12:00:00.000Z",
    "updatedAt": "2025-01-17T12:00:00.000Z",
    "category": "general",
    "priority": "medium",
    "assignedTo": null
  }
}
```

### POST /admin/conversations/:id/messages
Отправка сообщения в диалог
```json
// Request
{
  "content": "Текст сообщения",
  "role": "assistant"
}

// Response
{
  "success": true,
  "data": {
    "id": "msg-1234567890",
    "content": "Текст сообщения",
    "role": "assistant",
    "timestamp": "2025-01-17T12:00:00.000Z",
    "conversationId": "conv-1"
  }
}
```

### PUT /admin/conversations/:id/status
Обновление статуса диалога
```json
// Request
{
  "status": "in_progress"
}

// Response
{
  "success": true,
  "data": {
    "id": "conv-1",
    "status": "in_progress",
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

## 📊 Metrics (Метрики)

### GET /admin/metrics
Общие метрики
```json
{
  "success": true,
  "data": {
    "conversations": {
      "total": 156,
      "open": 23,
      "inProgress": 45,
      "closed": 88,
      "escalated": 12
    },
    "performance": {
      "avgResponseTime": "2.3 мин",
      "avgResolutionTime": "45 мин",
      "satisfactionScore": 4.7
    },
    "operators": {
      "active": 8,
      "total": 12,
      "avgLoad": "15 диалогов"
    },
    "categories": {
      "payment": 34,
      "delivery": 28,
      "technical": 45,
      "general": 49
    }
  },
  "timestamp": "2025-01-17T12:00:00.000Z"
}
```

### GET /admin/metrics/period?period=7d
Метрики по периодам
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "data": [
      {
        "date": "2025-01-11",
        "conversations": 12,
        "resolved": 10,
        "avgTime": "38 мин"
      }
    ]
  }
}
```

### GET /admin/metrics/operators
Метрики операторов
```json
{
  "success": true,
  "data": [
    {
      "id": "op-1",
      "name": "Анна Петрова",
      "conversations": 45,
      "resolved": 42,
      "avgResponseTime": "1.8 мин",
      "satisfactionScore": 4.8
    }
  ]
}
```

## ❓ FAQ (Часто задаваемые вопросы)

### GET /admin/faq
Получение списка FAQ
```json
{
  "success": true,
  "data": [
    {
      "id": "faq-1",
      "question": "Как отменить заказ?",
      "answer": "Для отмены заказа обратитесь в службу поддержки...",
      "category": "orders",
      "tags": ["отмена", "заказ"],
      "createdAt": "2025-01-17T12:00:00.000Z",
      "updatedAt": "2025-01-17T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

### GET /admin/faq/category/:category
FAQ по категории
```json
{
  "success": true,
  "data": [...],
  "category": "orders",
  "total": 1
}
```

### GET /admin/faq/search?q=поиск
Поиск по FAQ
```json
{
  "success": true,
  "data": [...],
  "query": "поиск",
  "total": 1
}
```

### POST /admin/faq
Создание нового FAQ
```json
// Request
{
  "question": "Новый вопрос?",
  "answer": "Новый ответ",
  "category": "general",
  "tags": ["новый", "вопрос"]
}

// Response
{
  "success": true,
  "data": {
    "id": "faq-1234567890",
    "question": "Новый вопрос?",
    "answer": "Новый ответ",
    "category": "general",
    "tags": ["новый", "вопрос"],
    "createdAt": "2025-01-17T12:00:00.000Z",
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

### PUT /admin/faq/:id
Обновление FAQ
```json
// Request
{
  "question": "Обновленный вопрос?",
  "answer": "Обновленный ответ"
}

// Response
{
  "success": true,
  "data": {
    "id": "faq-1",
    "question": "Обновленный вопрос?",
    "answer": "Обновленный ответ",
    "category": "general",
    "tags": [],
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

## 👥 Users (Пользователи)

### GET /admin/users
Получение списка пользователей
```json
{
  "success": true,
  "data": [
    {
      "id": "user-1",
      "username": "anna.petrova",
      "email": "anna.petrova@company.com",
      "fullName": "Анна Петрова",
      "role": "operator",
      "status": "active",
      "lastLogin": "2025-01-17T12:00:00.000Z",
      "createdAt": "2025-01-17T12:00:00.000Z",
      "permissions": ["read", "write", "admin"]
    }
  ],
  "total": 1
}
```

### GET /admin/users/:id
Получение пользователя по ID
```json
{
  "success": true,
  "data": {
    "id": "user-1",
    "username": "anna.petrova",
    "email": "anna.petrova@company.com",
    "fullName": "Анна Петрова",
    "role": "operator",
    "status": "active",
    "lastLogin": "2025-01-17T12:00:00.000Z",
    "createdAt": "2025-01-17T12:00:00.000Z",
    "permissions": ["read", "write", "admin"],
    "profile": {
      "phone": "+7 (999) 123-45-67",
      "department": "Поддержка клиентов",
      "position": "Оператор 1-й линии"
    }
  }
}
```

### POST /admin/users
Создание нового пользователя
```json
// Request
{
  "username": "new.user",
  "email": "new.user@company.com",
  "fullName": "Новый пользователь",
  "role": "operator",
  "permissions": ["read", "write"]
}

// Response
{
  "success": true,
  "data": {
    "id": "user-1234567890",
    "username": "new.user",
    "email": "new.user@company.com",
    "fullName": "Новый пользователь",
    "role": "operator",
    "status": "active",
    "lastLogin": null,
    "createdAt": "2025-01-17T12:00:00.000Z",
    "permissions": ["read", "write"],
    "profile": {
      "phone": "",
      "department": "",
      "position": ""
    }
  }
}
```

### PUT /admin/users/:id
Обновление пользователя
```json
// Request
{
  "fullName": "Обновленное имя",
  "role": "supervisor"
}

// Response
{
  "success": true,
  "data": {
    "id": "user-1",
    "username": "anna.petrova",
    "email": "anna.petrova@company.com",
    "fullName": "Обновленное имя",
    "role": "supervisor",
    "status": "active",
    "permissions": ["read", "write", "admin"],
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

### PATCH /admin/users/:id/status
Изменение статуса пользователя
```json
// Request
{
  "status": "inactive"
}

// Response
{
  "success": true,
  "data": {
    "id": "user-1",
    "status": "inactive",
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

### GET /admin/users/stats
Статистика пользователей
```json
{
  "success": true,
  "data": {
    "total": 15,
    "active": 12,
    "inactive": 2,
    "suspended": 1,
    "byRole": {
      "operator": 8,
      "supervisor": 4,
      "admin": 2,
      "manager": 1
    },
    "byDepartment": {
      "Поддержка клиентов": 10,
      "Техническая поддержка": 3,
      "Менеджмент": 2
    }
  }
}
```

## 🏷️ Categories (Категории)

### GET /admin/categories
Получение списка категорий
```json
{
  "success": true,
  "data": [
    {
      "id": "cat-1",
      "name": "Оплата",
      "slug": "payment",
      "description": "Вопросы по оплате заказов и возврату средств",
      "color": "#3B82F6",
      "icon": "credit-card",
      "priority": 1,
      "isActive": true,
      "createdAt": "2025-01-17T12:00:00.000Z",
      "updatedAt": "2025-01-17T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

### GET /admin/categories/:id
Получение категории по ID
```json
{
  "success": true,
  "data": {
    "id": "cat-1",
    "name": "Оплата",
    "slug": "payment",
    "description": "Вопросы по оплате заказов и возврату средств",
    "color": "#3B82F6",
    "icon": "credit-card",
    "priority": 1,
    "isActive": true,
    "createdAt": "2025-01-17T12:00:00.000Z",
    "updatedAt": "2025-01-17T12:00:00.000Z",
    "metadata": {
      "keywords": ["оплата", "карта", "банк", "возврат"],
      "parentCategory": null,
      "subCategories": []
    }
  }
}
```

### POST /admin/categories
Создание новой категории
```json
// Request
{
  "name": "Новая категория",
  "slug": "new-category",
  "description": "Описание новой категории",
  "color": "#10B981",
  "icon": "star",
  "priority": 5
}

// Response
{
  "success": true,
  "data": {
    "id": "cat-1234567890",
    "name": "Новая категория",
    "slug": "new-category",
    "description": "Описание новой категории",
    "color": "#10B981",
    "icon": "star",
    "priority": 5,
    "isActive": true,
    "createdAt": "2025-01-17T12:00:00.000Z",
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

### PUT /admin/categories/:id
Обновление категории
```json
// Request
{
  "name": "Обновленная категория",
  "description": "Новое описание"
}

// Response
{
  "success": true,
  "data": {
    "id": "cat-1",
    "name": "Обновленная категория",
    "slug": "payment",
    "description": "Новое описание",
    "color": "#3B82F6",
    "icon": "credit-card",
    "priority": 1,
    "isActive": true,
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

### PATCH /admin/categories/:id/status
Изменение статуса категории
```json
// Request
{
  "isActive": false
}

// Response
{
  "success": true,
  "data": {
    "id": "cat-1",
    "isActive": false,
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

### GET /admin/categories/stats
Статистика по категориям
```json
{
  "success": true,
  "data": {
    "total": 8,
    "active": 7,
    "inactive": 1,
    "byPriority": {
      "high": 2,
      "medium": 4,
      "low": 2
    },
    "usage": {
      "payment": 156,
      "delivery": 89,
      "technical": 234,
      "general": 67
    }
  }
}
```

## 📝 Notes (Заметки)

### GET /admin/conversations/:conversationId/notes
Получение заметок для диалога
```json
{
  "success": true,
  "data": [
    {
      "id": "note-1",
      "conversationId": "conv-1",
      "content": "Клиент сообщил о проблеме с оплатой картой Visa",
      "author": "anna.petrova",
      "authorName": "Анна Петрова",
      "type": "internal",
      "isPrivate": false,
      "createdAt": "2025-01-17T12:00:00.000Z",
      "updatedAt": "2025-01-17T12:00:00.000Z"
    }
  ],
  "conversationId": "conv-1",
  "total": 1
}
```

### POST /admin/conversations/:conversationId/notes
Создание новой заметки
```json
// Request
{
  "content": "Текст заметки",
  "type": "internal",
  "isPrivate": false
}

// Response
{
  "success": true,
  "data": {
    "id": "note-1234567890",
    "conversationId": "conv-1",
    "content": "Текст заметки",
    "author": "current.user",
    "authorName": "Текущий пользователь",
    "type": "internal",
    "isPrivate": false,
    "createdAt": "2025-01-17T12:00:00.000Z",
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

### PUT /admin/notes/:id
Обновление заметки
```json
// Request
{
  "content": "Обновленный текст заметки",
  "type": "resolution"
}

// Response
{
  "success": true,
  "data": {
    "id": "note-1",
    "content": "Обновленный текст заметки",
    "type": "resolution",
    "isPrivate": false,
    "updatedAt": "2025-01-17T12:00:00.000Z"
  }
}
```

### DELETE /admin/notes/:id
Удаление заметки
```json
{
  "success": true,
  "message": "Note deleted successfully"
}
```

### GET /admin/notes/author/:author
Получение заметок по автору
```json
{
  "success": true,
  "data": [...],
  "author": "anna.petrova",
  "total": 1
}
```

### GET /admin/notes/search?q=поиск&type=internal&isPrivate=false
Поиск по заметкам
```json
{
  "success": true,
  "data": [...],
  "query": "поиск",
  "total": 1
}
```

## 🔧 Error Responses

Все endpoints возвращают ошибки в едином формате:

```json
{
  "success": false,
  "error": "Описание ошибки"
}
```

### HTTP Status Codes
- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Неверный запрос
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

## 📋 Mock Data

Все endpoints в текущей версии используют mock данные для демонстрации. Для production необходимо:

1. Подключить реальную базу данных
2. Реализовать аутентификацию и авторизацию
3. Добавить валидацию входных данных
4. Реализовать логирование и мониторинг
5. Добавить rate limiting и security headers

## 🚀 Next Steps

1. **Database Integration** - Подключение PostgreSQL/Supabase
2. **Authentication** - JWT токены, роли пользователей
3. **Real-time Updates** - WebSocket для live обновлений
4. **File Uploads** - Загрузка изображений и документов
5. **Advanced Search** - Elasticsearch или PostgreSQL full-text search
6. **Analytics** - Детальная аналитика и отчеты
7. **Export** - Экспорт данных в CSV/Excel
8. **Notifications** - Email и push уведомления
