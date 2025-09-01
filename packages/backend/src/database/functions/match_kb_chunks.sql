-- Функция для поиска похожих чанков в kb_chunks через pgvector
-- Использует оператор <-> для cosine distance (чем меньше, тем больше similarity)

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
    -- Фильтруем по минимальному порогу similarity
    1 - (kb_chunks.embedding <-> query_embedding) > match_threshold
  ORDER BY 
    -- Сортируем по similarity (убывание)
    kb_chunks.embedding <-> query_embedding ASC
  LIMIT match_count;
$$;

-- Создаем индекс для ускорения векторного поиска
-- Используем ivfflat индекс для pgvector
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx 
ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Комментарии к функции
COMMENT ON FUNCTION match_kb_chunks IS 'Поиск похожих чанков в kb_chunks через pgvector с использованием cosine similarity';
COMMENT ON INDEX kb_chunks_embedding_idx IS 'Индекс для ускорения векторного поиска по embeddings';
