-- ==============================================
-- РУЧНАЯ МИГРАЦИЯ RAG СИСТЕМЫ
-- Выполните этот SQL в Supabase Dashboard > SQL Editor
-- ==============================================

-- 1. Создаем функцию exec_sql для будущих миграций
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result text;
BEGIN
  EXECUTE sql;
  RETURN 'OK';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- 2. Расширения
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 3. Добавляем колонки
ALTER TABLE public.kb_chunks
  ADD COLUMN IF NOT EXISTS embedding_vec vector(1536);

ALTER TABLE public.kb_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector;

-- 4. Функция триггера
CREATE OR REPLACE FUNCTION kb_chunks_tsv_update() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsv := to_tsvector('simple',
    regexp_replace(unaccent(coalesce(NEW.chunk_text,'')), '\s+', ' ', 'g'));
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql;

-- 5. Триггер
DROP TRIGGER IF EXISTS kb_chunks_tsv_trg ON public.kb_chunks;
CREATE TRIGGER kb_chunks_tsv_trg
  BEFORE INSERT OR UPDATE OF chunk_text ON public.kb_chunks
  FOR EACH ROW EXECUTE FUNCTION kb_chunks_tsv_update();

-- 6. Обновляем tsvector для существующих записей
UPDATE public.kb_chunks
SET content_tsv = to_tsvector('simple',
  regexp_replace(unaccent(coalesce(chunk_text,'')), '\s+', ' ', 'g')
)
WHERE content_tsv IS NULL;

-- 7. Создаем индексы
CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx
  ON public.kb_chunks USING gin(content_tsv);

CREATE INDEX IF NOT EXISTS kb_chunks_vec_ivfflat
  ON public.kb_chunks USING ivfflat (embedding_vec vector_cosine_ops)
  WITH (lists = 100);

-- 8. RPC функция для гибридного поиска
CREATE OR REPLACE FUNCTION public.rag_hybrid_search(
  q_vec vector(1536),
  q_text text,
  k int DEFAULT 8,
  min_sim float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  article_id uuid,
  chunk_index int,
  chunk_text text,
  cos_sim float,
  ts_rank_score float,
  hybrid_score float
)
LANGUAGE sql
STABLE
AS $$
  WITH vec AS (
    SELECT
      id, article_id, chunk_index, chunk_text,
      1 - (embedding_vec <=> q_vec) AS cos_sim   -- cosine similarity
    FROM public.kb_chunks
    WHERE embedding_vec IS NOT NULL
    ORDER BY embedding_vec <=> q_vec
    LIMIT GREATEST(k*4, 32)
  ),
  txt AS (
    SELECT
      id,
      ts_rank_cd(content_tsv, plainto_tsquery('simple', q_text)) AS ts_rank_score
    FROM public.kb_chunks
  ),
  joined AS (
    SELECT
      v.id, v.article_id, v.chunk_index, v.chunk_text,
      v.cos_sim,
      COALESCE(t.ts_rank_score, 0) AS ts_rank_score,
      -- гибридная формула: 0.7 вектор + 0.3 текст
      (0.7 * v.cos_sim) + (0.3 * COALESCE(t.ts_rank_score,0)) AS hybrid_score
    FROM vec v
    LEFT JOIN txt t USING (id)
  )
  SELECT *
  FROM joined
  WHERE cos_sim >= min_sim
  ORDER BY hybrid_score DESC
  LIMIT k;
$$;

-- 9. Настраиваем RLS (Row Level Security)
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

-- Политика для service role (разрешаем чтение)
CREATE POLICY "Allow service role read access" ON public.kb_chunks
  FOR SELECT USING (true);

-- 10. Создаем таблицу для логирования RAG запросов
CREATE TABLE IF NOT EXISTS public.rag_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_hash text NOT NULL,
  question_text text,
  top_k int,
  min_similarity float,
  results_count int,
  search_time_ms int,
  llm_time_ms int,
  total_time_ms int,
  model_used text,
  confidence float,
  created_at timestamp with time zone DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS rag_logs_question_hash_idx 
  ON public.rag_logs(question_hash);

CREATE INDEX IF NOT EXISTS rag_logs_created_at_idx 
  ON public.rag_logs(created_at);

-- ==============================================
-- МИГРАЦИЯ ЗАВЕРШЕНА!
-- Теперь выполните: node migrations/migrate_embeddings.cjs
-- ==============================================
