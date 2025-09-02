# Настройка RAG пайплайна для Telegram бота

## Обзор

Этот RAG (Retrieval-Augmented Generation) пайплайн реализует следующий процесс:

1. **Пользователь задает вопрос** в Telegram боте
2. **Создаются embeddings** для вопроса пользователя (ТОЛЬКО для вопроса)
3. **Поиск в Supabase** по таблице `kb_chunks` через pgvector с использованием cosine similarity
4. **Генерация ответа** через GPT на основе найденных чанков
5. **Возврат ответа** пользователю с источниками и метаданными

## Ключевые особенности

✅ **Правильный пайплайн**: Вопрос → Embeddings → Поиск в Supabase → GPT → Ответ  
✅ **Embeddings только для запросов**: Документы уже имеют готовые embeddings  
✅ **Поиск через pgvector**: Использует оператор `<->` для cosine similarity  
✅ **Fallback ответы**: При отсутствии релевантных данных  
✅ **Интеграция с Telegram**: Полная интеграция с ботом  
✅ **Конфигурация в .env**: Все ключи вынесены в переменные окружения  

## Настройка

### 1. Переменные окружения

Убедитесь, что в `.env` файле настроены следующие переменные:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# OpenAI
OPENAI_API_KEY=sk-proj-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# Telegram
TG_BOT_TOKEN=your-telegram-bot-token
```

### 2. Настройка Supabase

Выполните SQL скрипт в Supabase SQL Editor:

```bash
# Запустите скрипт настройки
psql -h your-supabase-host -U postgres -d postgres -f packages/backend/scripts/setup-supabase-rag.sql
```

Или скопируйте содержимое файла `packages/backend/scripts/setup-supabase-rag.sql` в Supabase SQL Editor.

### 3. Структура таблицы kb_chunks

Убедитесь, что таблица `kb_chunks` имеет правильную структуру:

```sql
CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id),
  chunk_text TEXT,
  embedding VECTOR(1536),  -- Векторное представление текста
  chunk_index INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. Загрузка данных

Используйте существующий инструмент для загрузки статей в базу знаний:

```bash
# Загрузка статей с автоматическим созданием embeddings
node packages/kb-tools/index.ts
```

## API Endpoints

### Основной RAG endpoint

```http
POST /api/supabase-rag/query
Content-Type: application/json

{
  "question": "Как пополнить баланс?",
  "userId": "123",
  "chatId": "456",
  "language": "ru",
  "options": {
    "temperature": 0.3,
    "maxTokens": 1000,
    "topK": 5,
    "minSimilarity": 0.5
  }
}
```

### Тестирование

```http
POST /api/supabase-rag/test
Content-Type: application/json

{
  "testQuery": "Как пополнить баланс?"
}
```

### Проверка здоровья

```http
GET /api/supabase-rag/health
```

## Интеграция с Telegram

RAG пайплайн автоматически интегрирован с Telegram ботом. Каждое сообщение пользователя обрабатывается через RAG:

1. Пользователь отправляет сообщение
2. TelegramService вызывает SupabaseRAGService
3. Генерируется ответ на основе базы знаний
4. Ответ отправляется пользователю

## Логирование

Все этапы пайплайна логируются с эмодзи для удобства:

- 🚀 Начало RAG пайплайна
- 📊 Создание embeddings
- 🔍 Поиск в базе знаний
- 🤖 Генерация ответа через GPT
- ✅ Успешное завершение
- ❌ Ошибки
- ⚠️ Предупреждения

## Мониторинг

### Метрики производительности

- `searchTime` - время поиска в Supabase
- `processingTime` - время генерации ответа
- `totalTime` - общее время обработки
- `confidence` - уверенность в ответе (0-1)

### Качество ответов

- `sourcesCount` - количество найденных источников
- `fallbackUsed` - использовался ли fallback ответ
- `similarity` - средняя similarity найденных чанков

## Troubleshooting

### Проблема: "Не найдено подходящих чанков"

**Причины:**
- Низкий порог similarity (по умолчанию 0.5)
- Отсутствие релевантных данных в базе
- Проблемы с embeddings

**Решения:**
1. Уменьшите `minSimilarity` в опциях
2. Проверьте качество данных в `kb_chunks`
3. Убедитесь, что embeddings созданы правильно

### Проблема: "OpenAI API ошибка"

**Причины:**
- Неверный API ключ
- Превышение лимитов
- Проблемы с сетью

**Решения:**
1. Проверьте `OPENAI_API_KEY` в .env
2. Проверьте лимиты в OpenAI Dashboard
3. Увеличьте timeout в коде

### Проблема: "Supabase ошибка"

**Причины:**
- Неверные URL/ключи
- Отсутствие функции `match_kb_chunks`
- Проблемы с pgvector

**Решения:**
1. Проверьте `SUPABASE_URL` и `SUPABASE_KEY`
2. Выполните скрипт настройки Supabase
3. Убедитесь, что расширение pgvector включено

## Производительность

### Оптимизация

1. **Индекс pgvector**: Автоматически создается для ускорения поиска
2. **Кэширование**: Можно добавить Redis для кэширования embeddings
3. **Batch processing**: Для множественных запросов

### Рекомендации

- Используйте `topK=5` для оптимального баланса качества/скорости
- `minSimilarity=0.5` обеспечивает хорошее качество результатов
- `temperature=0.3` для стабильных ответов

## Безопасность

- API ключи хранятся в переменных окружения
- Все запросы логируются (без чувствительных данных)
- Fallback ответы при ошибках
- Валидация входных данных

## Разработка

### Добавление новых функций

1. Создайте новый метод в `SupabaseRAGService`
2. Добавьте соответствующий endpoint в роутер
3. Обновите типы в `types/rag.ts`
4. Добавьте тесты

### Тестирование

```bash
# Тест RAG пайплайна
curl -X POST http://localhost:3000/api/supabase-rag/test \
  -H "Content-Type: application/json" \
  -d '{"testQuery": "Как пополнить баланс?"}'

# Проверка здоровья
curl http://localhost:3000/api/supabase-rag/health
```
