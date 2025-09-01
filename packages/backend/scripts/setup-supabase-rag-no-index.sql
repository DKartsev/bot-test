-- Альтернативный скрипт для настройки RAG пайплайна БЕЗ создания индекса
-- Используйте этот скрипт если основной скрипт выдает ошибку с памятью

-- 1. Включаем расширение pgvector (если еще не включено)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Проверяем существование таблицы kb_chunks
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kb_chunks') THEN
        RAISE EXCEPTION 'Таблица kb_chunks не существует. Сначала создайте таблицы через infrastructure/001_create_support_schema.sql';
    END IF;
END $$;

-- 3. Проверяем структуру таблицы kb_chunks
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'kb_chunks' 
ORDER BY ordinal_position;

-- 4. Создаем функцию для поиска похожих чанков
-- Удаляем функцию если она существует
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
    -- Преобразуем cosine distance в similarity (1 - distance)
    -- Оператор <-> возвращает cosine distance (0 = идентичные, 2 = противоположные)
    1 - (kb_chunks.embedding <-> query_embedding) as similarity
  FROM kb_chunks
  WHERE 
    -- Проверяем, что embedding не NULL
    kb_chunks.embedding IS NOT NULL
    AND
    -- Фильтруем по минимальному порогу similarity
    1 - (kb_chunks.embedding <-> query_embedding) > match_threshold
  ORDER BY 
    -- Сортируем по similarity (убывание)
    kb_chunks.embedding <-> query_embedding ASC
  LIMIT match_count;
$$;

-- 5. Пропускаем создание индекса (будет работать медленнее, но без ошибок памяти)
-- Для небольших объемов данных (до 10,000 записей) это нормально

-- 6. Добавляем комментарии
COMMENT ON FUNCTION match_kb_chunks IS 'Поиск похожих чанков в kb_chunks через pgvector с использованием cosine similarity (без индекса)';

-- 7. Предоставляем права на выполнение функции
GRANT EXECUTE ON FUNCTION match_kb_chunks(vector(1536), int, float) TO anon;
GRANT EXECUTE ON FUNCTION match_kb_chunks(vector(1536), int, float) TO authenticated;

-- 8. Проверяем количество записей в таблице
SELECT COUNT(*) as total_chunks FROM kb_chunks;

-- 9. Проверяем, что embeddings не пустые
SELECT 
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embeddings,
  COUNT(*) - COUNT(embedding) as chunks_without_embeddings
FROM kb_chunks;

-- 10. Проверяем, что функция создана успешно
SELECT 
  routine_name, 
  routine_type, 
  data_type
FROM information_schema.routines 
WHERE routine_name = 'match_kb_chunks' 
AND routine_schema = 'public';

-- 11. Информационное сообщение
SELECT 'RAG пайплайн настроен БЕЗ индекса. Для больших объемов данных рекомендуется создать индекс позже.' as message;
