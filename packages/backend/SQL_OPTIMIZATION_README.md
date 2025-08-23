# 🚀 Система оптимизации SQL запросов

## Обзор

Система оптимизации SQL запросов обеспечивает автоматический анализ производительности, выявление медленных запросов и предоставление рекомендаций по оптимизации. Система интегрируется с существующими API endpoints и предоставляет детальную статистику и аналитику.

## 🏗️ Архитектура

### 1. QueryOptimizerService (`src/services/queryOptimizer.ts`)

Основной сервис для анализа и оптимизации SQL запросов:

```typescript
interface QueryAnalysisResult {
  query: string;                    // SQL запрос
  executionTime: number;            // Время выполнения (мс)
  rowsReturned: number;             // Количество возвращенных строк
  rowsScanned: number;              // Количество отсканированных строк
  indexUsage: string[];             // Используемые индексы
  suggestions: string[];            // Рекомендации по оптимизации
  warnings: string[];               // Предупреждения
  performance: 'excellent' | 'good' | 'poor' | 'critical';
}
```

### 2. Query Analyzer Middleware (`src/middleware/queryAnalyzer.ts`)

Автоматический анализ SQL запросов в реальном времени:

- **queryAnalyzerMiddleware** - основной middleware для анализа
- **analyzeEndpoint** - анализ конкретного endpoint
- **forceQueryAnalysis** - принудительный анализ медленных запросов

### 3. Query Optimizer Routes (`src/routes/queryOptimizer.ts`)

API endpoints для управления оптимизацией:

- `GET /query-optimizer/stats` - статистика производительности
- `GET /query-optimizer/slow-queries` - топ медленных запросов
- `GET /query-optimizer/index-recommendations` - рекомендации по индексам
- `GET /query-optimizer/config` - текущая конфигурация
- `PUT /query-optimizer/config` - обновление конфигурации
- `POST /query-optimizer/stats/reset` - сброс статистики

## 🚀 Использование

### Базовая интеграция

```typescript
import { queryAnalyzerMiddleware } from '../middleware/queryAnalyzer';

// Применение к конкретному роуту
router.get('/chats', 
  requireOperator, 
  queryAnalyzerMiddleware(), 
  cacheMiddleware.paginated, 
  asyncHandler(async (req, res) => {
    // Логика получения чатов
  })
);
```

### Принудительный анализ медленных запросов

```typescript
import { forceQueryAnalysis } from '../middleware/queryAnalyzer';

// Анализ запросов медленнее 2 секунд
router.use('/api', forceQueryAnalysis(2000));
```

### Анализ конкретного endpoint

```typescript
import { analyzeEndpoint } from '../middleware/queryAnalyzer';

router.get('/search', 
  analyzeEndpoint('search'), 
  asyncHandler(async (req, res) => {
    // Логика поиска
  })
);
```

## 🔧 Конфигурация

### Переменные окружения

```env
# SQL Query Optimization
SLOW_QUERY_THRESHOLD=1000           # Порог для медленных запросов (мс)
ENABLE_QUERY_LOGGING=true           # Логирование всех запросов
ENABLE_EXPLAIN_ANALYSIS=true        # Анализ EXPLAIN для медленных запросов
MAX_QUERY_LENGTH=1000               # Максимальная длина запроса для логирования
ENABLE_INDEX_RECOMMENDATIONS=true   # Рекомендации по индексам
```

### Динамическое обновление конфигурации

```bash
# Обновление порога медленных запросов
PUT /query-optimizer/config
{
  "slowQueryThreshold": 2000,
  "enableQueryLogging": false
}
```

## 📊 Мониторинг и аналитика

### Статистика производительности

```bash
# Общая статистика
GET /query-optimizer/stats

# Сводка производительности
GET /query-optimizer/summary

# Топ медленных запросов
GET /query-optimizer/slow-queries?limit=20

# Статистика по индексам
GET /query-optimizer/index-stats
```

### Пример ответа статистики

```json
{
  "success": true,
  "data": {
    "totalQueries": 1250,
    "averageExecutionTime": 45,
    "slowQueriesCount": 12,
    "indexEfficiency": 0.85,
    "performance": {
      "excellent": 800,
      "good": 300,
      "poor": 120,
      "critical": 30
    },
    "topIssues": [
      "Часто выполняемый медленный запрос: SELECT * FROM chats WHERE...",
      "Много table scans - рассмотрите создание индексов"
    ],
    "recommendationsCount": 5
  }
}
```

## 🛡️ Анализ безопасности и производительности

### Автоматические проверки

1. **SELECT *** - предупреждение о потенциально неэффективном запросе
2. **Отсутствие LIMIT** - предупреждение о возможном возврате большого количества строк
3. **LIKE с wildcard в начале** - предупреждение о неэффективном использовании индексов
4. **Отсутствие WHERE** - предупреждение о table scan
5. **ORDER BY без LIMIT** - предупреждение о сортировке большого количества строк

### Рекомендации по оптимизации

```typescript
// Примеры рекомендаций
[
  "Укажите только необходимые колонки вместо SELECT *",
  "Добавьте LIMIT для ограничения количества возвращаемых строк",
  "Используйте полнотекстовый поиск или перестройте запрос",
  "Добавьте условия WHERE для фильтрации данных",
  "Создайте индексы для колонок в WHERE, ORDER BY, JOIN"
]
```

## 📈 Метрики производительности

### Классификация запросов

- **excellent** - < 100ms, эффективное использование индексов
- **good** - < 500ms, умеренное использование ресурсов
- **poor** - < 2000ms, требует оптимизации
- **critical** - ≥ 2000ms, критически медленный

### Эффективность индексов

```typescript
// Расчет эффективности
const indexEfficiency = indexScans / (indexScans + tableScans);

// Рекомендации на основе эффективности
if (indexEfficiency < 0.5) {
  recommendations.push('Низкая эффективность индексов - рассмотрите создание новых');
}
```

## 🔍 Анализ конкретных типов запросов

### Запросы к чатам

```sql
-- Анализируемый запрос
SELECT * FROM chats 
WHERE status IN (?) AND priority IN (?) 
ORDER BY created_at DESC 
LIMIT ?

-- Рекомендуемые индексы
idx_chats_status
idx_chats_priority
idx_chats_operator_id
idx_chats_attachments
```

### Поисковые запросы

```sql
-- Анализируемый запрос
SELECT * FROM chats 
WHERE title LIKE '%query%' OR description LIKE '%query%'

-- Рекомендации
"LIKE с wildcard в начале не может использовать индексы",
"Используйте полнотекстовый поиск или перестройте запрос"
```

### Запросы к сообщениям

```sql
-- Анализируемый запрос
SELECT * FROM messages 
WHERE chat_id = ? 
ORDER BY created_at DESC 
LIMIT ? OFFSET ?

-- Рекомендуемые индексы
idx_messages_chat_id
idx_messages_created_at
```

## 🚨 Обработка ошибок

### Типы ошибок

```typescript
// Ошибки анализа
{
  "error": "Анализ запроса не найден",
  "code": "ANALYSIS_NOT_FOUND"
}

// Ошибки конфигурации
{
  "error": "slowQueryThreshold должен быть положительным числом",
  "code": "INVALID_THRESHOLD"
}
```

### HTTP заголовки

```http
X-Query-Performance: good
X-Query-Execution-Time: 150
X-Query-Warnings: 2
```

## 🔮 Планы развития

### Краткосрочные улучшения

- [ ] Интеграция с EXPLAIN ANALYZE для PostgreSQL
- [ ] Автоматическое создание индексов на основе анализа
- [ ] Уведомления о критически медленных запросах
- [ ] Экспорт статистики в CSV/JSON

### Долгосрочные улучшения

- [ ] Машинное обучение для предсказания производительности
- [ ] Интеграция с системами мониторинга (Prometheus, Grafana)
- [ ] Автоматическая оптимизация запросов
- [ ] Поддержка различных СУБД (MySQL, SQLite, MongoDB)

## 📚 Дополнительные ресурсы

- [SQL Performance Tuning](https://use-the-index-luke.com/)
- [PostgreSQL Query Optimization](https://www.postgresql.org/docs/current/performance-tips.html)
- [MySQL Query Optimization](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [Database Indexing Strategies](https://www.oreilly.com/library/view/high-performance-mysql/9780596101718/ch05.html)

## 🎯 Лучшие практики

### 1. Создание индексов

```sql
-- Составные индексы для часто используемых комбинаций
CREATE INDEX idx_chats_status_priority ON chats(status, priority);
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);

-- Частичные индексы для фильтров
CREATE INDEX idx_chats_active ON chats(id) WHERE status = 'active';
```

### 2. Оптимизация запросов

```sql
-- Вместо SELECT *
SELECT id, title, status, created_at FROM chats WHERE status = 'open';

-- Использование LIMIT
SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 50;

-- Избегание LIKE с wildcard в начале
SELECT * FROM chats WHERE title LIKE 'query%'; -- Хорошо
SELECT * FROM chats WHERE title LIKE '%query'; -- Плохо
```

### 3. Мониторинг производительности

```bash
# Регулярная проверка статистики
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/query-optimizer/summary"

# Анализ медленных запросов
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/query-optimizer/slow-queries?limit=10"
```

## 🎉 Заключение

Система оптимизации SQL запросов предоставляет комплексный подход к мониторингу и улучшению производительности базы данных. Автоматический анализ, детальная статистика и практические рекомендации помогают разработчикам и администраторам БД поддерживать высокую производительность приложения.
