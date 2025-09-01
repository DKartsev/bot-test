# Инструкция по настройке RAG пайплайна

## Проблема с SQL скриптом

Если вы получили ошибку `Unable to find snippet with ID 22401bb5-2201-4b1b-99fc-8d97ae746f9a`, это означает, что в Supabase есть проблемы с правами доступа или структурой базы данных.

## Пошаговая настройка

### Шаг 1: Проверка структуры базы данных

Сначала убедитесь, что у вас есть необходимые таблицы. Выполните в Supabase SQL Editor:

```sql
-- Проверяем существующие таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Должны быть таблицы:
- `kb_articles`
- `kb_chunks`
- `conversations`
- `messages`

### Шаг 2: Создание таблиц (если их нет)

Если таблиц нет, выполните скрипт создания схемы:

```sql
-- Включаем расширение pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Создаем таблицы
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  slug TEXT UNIQUE,
  body_md TEXT,
  tags TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  chunk_text TEXT,
  embedding VECTOR(1536),
  chunk_index INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Шаг 3: Создание функции поиска

Выполните обновленный SQL скрипт:

```sql
-- Создаем функцию для поиска похожих чанков
DROP FUNCTION IF EXISTS match_kb_chunks(vector(1536), int, float);

CREATE OR REPLACE FUNCTION match_kb_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  article_id uuid,
  chunk_text text,
  chunk_index int,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    kb_chunks.id,
    kb_chunks.article_id,
    kb_chunks.chunk_text,
    kb_chunks.chunk_index,
    1 - (kb_chunks.embedding <-> query_embedding) as similarity
  FROM kb_chunks
  WHERE 
    kb_chunks.embedding IS NOT NULL
    AND
    1 - (kb_chunks.embedding <-> query_embedding) > match_threshold
  ORDER BY 
    kb_chunks.embedding <-> query_embedding ASC
  LIMIT match_count;
$$;

-- Создаем индекс для ускорения поиска
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx 
ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Предоставляем права на выполнение функции
GRANT EXECUTE ON FUNCTION match_kb_chunks(vector(1536), int, float) TO anon;
GRANT EXECUTE ON FUNCTION match_kb_chunks(vector(1536), int, float) TO authenticated;
```

### Шаг 4: Проверка настройки

Запустите тестовый скрипт:

```bash
node test-rag-pipeline.js
```

Этот скрипт проверит:
- ✅ Подключение к Supabase
- ✅ Наличие данных в kb_chunks
- ✅ Работу функции match_kb_chunks
- ✅ Доступность OpenAI API

### Шаг 5: Загрузка данных (если нужно)

Если в таблице kb_chunks нет данных, используйте существующий инструмент:

```bash
# Загрузка статей с автоматическим созданием embeddings
node packages/kb-tools/index.ts
```

### Шаг 6: Тестирование RAG пайплайна

После настройки протестируйте пайплайн:

```bash
# Запустите сервер
npm run dev

# В другом терминале протестируйте API
curl -X POST http://localhost:3000/api/supabase-rag/test \
  -H "Content-Type: application/json" \
  -d '{"testQuery": "Как пополнить баланс?"}'
```

## Возможные проблемы и решения

### Проблема: "memory required is 61 MB, maintenance_work_mem is 32 MB"

**Решение:** Ошибка возникает при создании индекса pgvector. Используйте альтернативный скрипт:

1. **Вариант 1:** Выполните обновленный основной скрипт (он теперь увеличивает memory_work_mem)
2. **Вариант 2:** Используйте скрипт без индекса: `packages/backend/scripts/setup-supabase-rag-no-index.sql`
3. **Вариант 3:** Создайте индекс позже вручную:

```sql
-- Увеличьте memory_work_mem в Supabase Dashboard > Settings > Database
-- Или выполните:
SET maintenance_work_mem = '256MB';
CREATE INDEX kb_chunks_embedding_idx 
ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);
```

**Примечание:** Без индекса поиск будет работать медленнее, но для небольших объемов данных (до 10,000 записей) это приемлемо.

### Проблема: "permission denied for table kb_chunks"

**Решение:** Убедитесь, что вы используете правильные ключи Supabase:
- `SUPABASE_URL` - URL вашего проекта
- `SUPABASE_KEY` - anon key (не service role key)

### Проблема: "Could not find the function public.match_kb_chunks"

**Решение:** Функция не создана. Выполните SQL скрипт из Шага 3.

### Проблема: "No data in kb_chunks"

**Решение:** Загрузите данные через `packages/kb-tools/index.ts` или добавьте тестовые данные:

```sql
-- Добавляем тестовую статью
INSERT INTO kb_articles (title, slug, body_md) VALUES 
('Тестовая статья', 'test-article', 'Это тестовая статья для проверки RAG пайплайна.');

-- Добавляем тестовый чанк (без embedding для начала)
INSERT INTO kb_chunks (article_id, chunk_text, chunk_index) 
SELECT id, 'Это тестовый чанк для проверки работы RAG пайплайна.', 0 
FROM kb_articles WHERE slug = 'test-article';
```

### Проблема: "OpenAI API ошибка"

**Решение:** Проверьте:
1. Правильность `OPENAI_API_KEY` в .env
2. Наличие средств на аккаунте OpenAI
3. Доступность API (проверьте статус на status.openai.com)

## Проверка работоспособности

После настройки все должно работать следующим образом:

1. **Пользователь отправляет сообщение** в Telegram бот
2. **Создается embedding** для вопроса через OpenAI
3. **Выполняется поиск** в Supabase через функцию `match_kb_chunks`
4. **Генерируется ответ** через GPT на основе найденных чанков
5. **Отправляется ответ** пользователю

## Логирование

Все этапы пайплайна логируются с эмодзи:
- 🚀 Начало RAG пайплайна
- 📊 Создание embeddings
- 🔍 Поиск в базе знаний
- 🤖 Генерация ответа через GPT
- ✅ Успешное завершение
- ❌ Ошибки

Проверьте логи сервера для диагностики проблем.
