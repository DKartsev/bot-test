# План улучшения покрытия тестами

## Текущее состояние

- **Statements**: 14.34% → Цель: 80%
- **Branches**: 43.89% → Цель: 80%
- **Functions**: 25.22% → Цель: 80%
- **Lines**: 14.34% → Цель: 80%

## Приоритеты тестирования

### 🔴 Высокий приоритет (критический путь)

#### 1. RAG Pipeline (ragAnswer.ts)
- **Текущее покрытие**: 92.33%
- **Цель**: 95%
- **Что добавить**:
  - Тесты для всех fallback сценариев
  - Тесты ошибок OpenAI API
  - Тесты для различных форматов ответов БД

#### 2. Vector Store (vector-store.ts)
- **Текущее покрытие**: 0%
- **Цель**: 90%
- **Что добавить**:
  - Тесты инициализации HNSW
  - Тесты добавления векторов
  - Тесты поиска
  - Тесты fallback без hnswlib-node

#### 3. Embedder (embedder.ts)
- **Текущее покрытие**: 89.51%
- **Цель**: 95%
- **Что добавить**:
  - Тесты ошибок OpenAI
  - Тесты валидации ответов
  - Тесты нормализации векторов

### 🟡 Средний приоритет (важный функционал)

#### 4. Admin Routes
- **Текущее покрытие**: 0%
- **Цель**: 85%
- **Что добавить**:
  - Тесты CRUD операций
  - Тесты валидации входных данных
  - Тесты авторизации
  - Тесты multipart загрузки

#### 5. Middleware
- **Текущее покрытие**: 0%
- **Цель**: 90%
- **Что добавить**:
  - Тесты IP allowlist
  - Тесты rate limiting
  - Тесты аутентификации
  - Тесты авторизации

#### 6. Error Handler
- **Текущее покрытие**: 0%
- **Цель**: 95%
- **Что добавить**:
  - Тесты всех типов ошибок
  - Тесты валидации
  - Тесты логирования

### 🟢 Низкий приоритет (вспомогательный код)

#### 7. Utils
- **Текущее покрытие**: 0%
- **Цель**: 80%
- **Что добавить**:
  - Тесты helper функций
  - Тесты валидации
  - Тесты форматирования

#### 8. Config
- **Текущее покрытие**: 0%
- **Цель**: 80%
- **Что добавить**:
  - Тесты загрузки env
  - Тесты валидации конфигурации
  - Тесты fallback значений

## План реализации

### Фаза 1: Критический путь (1-2 недели)
1. ✅ Улучшить тесты ragAnswer.ts
2. 🔄 Добавить тесты vector-store.ts
3. 🔄 Добавить тесты embedder.ts

### Фаза 2: Основной функционал (2-3 недели)
4. 🔄 Добавить тесты admin routes
5. 🔄 Добавить тесты middleware
6. 🔄 Добавить тесты error handler

### Фаза 3: Вспомогательный код (1-2 недели)
7. 🔄 Добавить тесты utils
8. 🔄 Добавить тесты config

## Метрики прогресса

### Еженедельные цели
- **Неделя 1**: 25% покрытия
- **Неделя 2**: 45% покрытия
- **Неделя 3**: 65% покрытия
- **Неделя 4**: 80% покрытия

### Критерии готовности
- ✅ Все критические пути покрыты
- ✅ Основной функционал протестирован
- ✅ Edge cases покрыты
- ✅ Error scenarios протестированы

## Инструменты и подходы

### Стратегия тестирования
1. **Unit тесты** - для отдельных функций
2. **Integration тесты** - для API endpoints
3. **Mock тесты** - для внешних зависимостей
4. **Error тесты** - для обработки ошибок

### Моки и фикстуры
- OpenAI API - мок responses
- PostgreSQL - мок queries
- Redis - мок cache operations
- HNSW - мок vector operations

### Автоматизация
- Pre-commit хуки
- CI/CD pipeline
- Coverage thresholds
- Automated testing

## Примеры тестов

### Vector Store
```typescript
describe('HNSW Vector Store', () => {
  it('should initialize index', () => {
    // Test initialization
  });
  
  it('should add vectors', () => {
    // Test adding vectors
  });
  
  it('should search vectors', () => {
    // Test vector search
  });
  
  it('should fallback without hnswlib-node', () => {
    // Test fallback behavior
  });
});
```

### Admin Routes
```typescript
describe('Admin Conversations', () => {
  it('should create conversation', async () => {
    // Test POST /admin/conversations
  });
  
  it('should get conversations list', async () => {
    // Test GET /admin/conversations
  });
  
  it('should handle validation errors', async () => {
    // Test error handling
  });
});
```

## Отчет покрытия (обновлено)
- Statements: 14.34%
- Branches: 43.89%
- Functions: 25.22%
- Lines: 14.34%
