# RAG Пайплайн - Документация

## Обзор

Реализован полноценный пайплайн гибридного RAG (Retrieval-Augmented Generation) с использованием OpenAI GPT-4o mini для интеллектуальной обработки запросов пользователей.

## Архитектура пайплайна

```
Вопрос пользователя → Переформулировка → Гибридный поиск → Формирование draft → RAG / refine → Ответ пользователю
```

### Этапы обработки:

1. **Переформулировка запроса** - улучшение исходного вопроса для лучшего поиска
2. **Гибридный поиск** - комбинация векторного и ключевого поиска
3. **Генерация черновика** - создание базового ответа на основе найденных источников
4. **RAG улучшение** - финальная доработка ответа с использованием контекста

## Компоненты системы

### 1. RAGService (`packages/backend/src/services/ragService.ts`)
Основной сервис, координирующий весь пайплайн.

**Основные методы:**
- `processQuery()` - полный цикл обработки запроса
- `testPipeline()` - тестирование пайплайна
- `getPipelineStats()` - получение статистики

### 2. OpenAIService (`packages/backend/src/services/openai.ts`)
Сервис для работы с OpenAI API.

**Возможности:**
- Переформулировка запросов
- Генерация черновиков ответов
- Улучшение ответов через RAG

### 3. HybridSearchService (`packages/backend/src/services/hybridSearch.ts`)
Сервис гибридного поиска.

**Особенности:**
- Объединение векторного и ключевого поиска
- Ранжирование результатов по релевантности
- Настраиваемые веса для разных типов поиска

## API Endpoints

### Основные endpoints

#### `POST /api/rag/query`
Основной endpoint для обработки RAG запросов.

**Request Body:**
```json
{
  "question": "Как пополнить баланс через QR-код?",
  "context": "Дополнительный контекст",
  "userId": 123,
  "chatId": 456,
  "language": "ru",
  "options": {
    "temperature": 0.3,
    "maxTokens": 2000,
    "useHybridSearch": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Финальный ответ...",
    "sources": [...],
    "confidence": 0.85,
    "searchTime": 150,
    "processingTime": 300,
    "totalTime": 450,
    "metadata": {
      "queryRephrased": "Переформулированный вопрос",
      "searchStrategy": "hybrid",
      "refineIterations": 1,
      "modelUsed": "gpt-4o-mini"
    }
  }
}
```

#### `POST /api/rag/test`
Тестирование RAG пайплайна.

#### `GET /api/rag/stats`
Получение статистики пайплайна.

#### `GET /api/rag/health`
Проверка здоровья сервиса.

#### `GET /api/rag/model-info`
Информация о модели.

#### `PUT /api/rag/config`
Обновление конфигурации поиска.

## Конфигурация

### Переменные окружения

```bash
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3
OPENAI_TIMEOUT=30000
```

### Конфигурация гибридного поиска

```typescript
interface HybridSearchConfig {
  vectorWeight: number;        // Вес векторного поиска (0.7)
  keywordWeight: number;       // Вес ключевого поиска (0.3)
  semanticThreshold: number;   // Порог семантической релевантности (0.6)
  maxResults: number;          // Максимальное количество результатов (10)
  minScore: number;            // Минимальный порог релевантности (0.3)
}
```

## Использование

### Python клиент

```python
from tools.bot_search import RAGClient

# Создание клиента
client = RAGClient("http://localhost:3000")

# Обработка запроса
response = client.process_query(
    question="Как пополнить баланс через QR-код?",
    context="Пользователь интересуется способами пополнения",
    user_id=123,
    chat_id=456,
    options={
        "temperature": 0.3,
        "maxTokens": 2000,
        "useHybridSearch": True
    }
)

print(response["data"]["answer"])
```

### JavaScript/TypeScript

```typescript
import { RAGService } from './services/ragService';

const ragService = new RAGService();

const response = await ragService.processQuery({
  question: "Как пополнить баланс через QR-код?",
  context: "Пользователь интересуется способами пополнения",
  userId: 123,
  chatId: 456,
  options: {
    temperature: 0.3,
    maxTokens: 2000,
    useHybridSearch: true
  }
});

console.log(response.answer);
```

## Тестирование

### Запуск демонстрации

```bash
cd tools
python bot_search.py
```

### Тестирование API

```bash
# Проверка здоровья
curl http://localhost:3000/api/rag/health

# Тестирование пайплайна
curl -X POST http://localhost:3000/api/rag/test \
  -H "Content-Type: application/json" \
  -d '{"testQuery": "Как пополнить баланс через QR-код?"}'

# Получение статистики
curl http://localhost:3000/api/rag/stats
```

## Мониторинг и метрики

### Метрики пайплайна

- Время поиска
- Время обработки
- Общее время
- Уверенность ответа
- Количество источников
- Стратегия поиска

### Логирование

Все этапы пайплайна логируются с детальной информацией:
- Входные параметры
- Промежуточные результаты
- Временные метки
- Ошибки и предупреждения

## Расширение функциональности

### Добавление новых провайдеров поиска

1. Создать новый сервис поиска
2. Реализовать интерфейс `SearchProvider`
3. Интегрировать в `HybridSearchService`

### Кастомизация промптов

Промпты для OpenAI настраиваются в `OpenAIService`:
- Переформулировка запросов
- Генерация черновиков
- Улучшение ответов

### Добавление новых моделей

1. Обновить конфигурацию в `env.ts`
2. Добавить поддержку в `OpenAIService`
3. Обновить типы и интерфейсы

## Производительность

### Оптимизации

- Асинхронная обработка поиска
- Кэширование результатов
- Настраиваемые таймауты
- Graceful fallback при ошибках

### Масштабирование

- Stateless архитектура
- Горизонтальное масштабирование
- Load balancing готовность
- Мониторинг ресурсов

## Безопасность

### Защита API

- Валидация входных данных
- Rate limiting
- Аутентификация (если требуется)
- Логирование подозрительной активности

### Обработка ошибок

- Graceful degradation
- Fallback ответы
- Детальное логирование ошибок
- Пользовательские сообщения об ошибках

## Troubleshooting

### Частые проблемы

1. **OpenAI API недоступен**
   - Проверить API ключ
   - Проверить сетевое подключение
   - Проверить лимиты API

2. **Медленная работа**
   - Проверить конфигурацию поиска
   - Увеличить таймауты
   - Оптимизировать промпты

3. **Низкое качество ответов**
   - Настроить веса поиска
   - Улучшить промпты
   - Проверить качество источников

### Логи и отладка

```bash
# Включить детальное логирование
LOG_LEVEL=debug

# Проверить логи
tail -f logs/app.log
```

## Лицензия

MIT License

## Поддержка

Для вопросов и предложений создавайте issues в репозитории проекта.
