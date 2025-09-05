// Пошаговое выполнение миграций RAG системы
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runStepByStep() {
  console.log('🚀 Пошаговое выполнение миграций RAG системы...\n');

  try {
    // Шаг 1: Расширения
    console.log('📦 Шаг 1: Создаем расширения...');
    const extensions = [
      'CREATE EXTENSION IF NOT EXISTS vector;',
      'CREATE EXTENSION IF NOT EXISTS pg_trgm;',
      'CREATE EXTENSION IF NOT EXISTS unaccent;'
    ];

    for (const ext of extensions) {
      const { error } = await supabase.rpc('exec_sql', { sql: ext });
      if (error) {
        console.log(`⚠️ ${ext}: ${error.message}`);
      } else {
        console.log(`✅ ${ext.split(' ')[2]}`);
      }
    }

    // Шаг 2: Колонки
    console.log('\n📊 Шаг 2: Добавляем колонки...');
    const columns = [
      'ALTER TABLE public.kb_chunks ADD COLUMN IF NOT EXISTS embedding_vec vector(1536);',
      'ALTER TABLE public.kb_chunks ADD COLUMN IF NOT EXISTS content_tsv tsvector;'
    ];

    for (const col of columns) {
      const { error } = await supabase.rpc('exec_sql', { sql: col });
      if (error) {
        console.log(`⚠️ Колонка: ${error.message}`);
      } else {
        console.log(`✅ Колонка добавлена`);
      }
    }

    // Шаг 3: Функция триггера
    console.log('\n🔧 Шаг 3: Создаем функцию триггера...');
    const triggerFunction = `
CREATE OR REPLACE FUNCTION kb_chunks_tsv_update() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsv := to_tsvector('simple',
    regexp_replace(unaccent(coalesce(NEW.chunk_text,'')), '\\s+', ' ', 'g'));
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql;
    `;

    const { error: funcError } = await supabase.rpc('exec_sql', { sql: triggerFunction });
    if (funcError) {
      console.log(`⚠️ Функция триггера: ${funcError.message}`);
    } else {
      console.log(`✅ Функция триггера создана`);
    }

    // Шаг 4: Триггер
    console.log('\n⚡ Шаг 4: Создаем триггер...');
    const trigger = `
DROP TRIGGER IF EXISTS kb_chunks_tsv_trg ON public.kb_chunks;
CREATE TRIGGER kb_chunks_tsv_trg
  BEFORE INSERT OR UPDATE OF chunk_text ON public.kb_chunks
  FOR EACH ROW EXECUTE FUNCTION kb_chunks_tsv_update();
    `;

    const { error: trigError } = await supabase.rpc('exec_sql', { sql: trigger });
    if (trigError) {
      console.log(`⚠️ Триггер: ${trigError.message}`);
    } else {
      console.log(`✅ Триггер создан`);
    }

    // Шаг 5: Обновляем tsvector
    console.log('\n📝 Шаг 5: Обновляем tsvector...');
    const updateTSV = `
UPDATE public.kb_chunks
SET content_tsv = to_tsvector('simple',
  regexp_replace(unaccent(coalesce(chunk_text,'')), '\\s+', ' ', 'g')
)
WHERE content_tsv IS NULL;
    `;

    const { error: updateError } = await supabase.rpc('exec_sql', { sql: updateTSV });
    if (updateError) {
      console.log(`⚠️ Обновление tsvector: ${updateError.message}`);
    } else {
      console.log(`✅ tsvector обновлен`);
    }

    // Шаг 6: Индексы
    console.log('\n🔍 Шаг 6: Создаем индексы...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx ON public.kb_chunks USING gin(content_tsv);',
      'CREATE INDEX IF NOT EXISTS kb_chunks_vec_ivfflat ON public.kb_chunks USING ivfflat (embedding_vec vector_cosine_ops) WITH (lists = 100);'
    ];

    for (const idx of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: idx });
      if (error) {
        console.log(`⚠️ Индекс: ${error.message}`);
      } else {
        console.log(`✅ Индекс создан`);
      }
    }

    // Шаг 7: RPC функция
    console.log('\n🔧 Шаг 7: Создаем RPC функцию...');
    const rpcFunction = `
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
      1 - (embedding_vec <=> q_vec) AS cos_sim
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
    `;

    const { error: rpcError } = await supabase.rpc('exec_sql', { sql: rpcFunction });
    if (rpcError) {
      console.log(`⚠️ RPC функция: ${rpcError.message}`);
    } else {
      console.log(`✅ RPC функция создана`);
    }

    // Шаг 8: RLS
    console.log('\n🔒 Шаг 8: Настраиваем RLS...');
    const rls = [
      'ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY "Allow service role read access" ON public.kb_chunks FOR SELECT USING (true);'
    ];

    for (const policy of rls) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error) {
        console.log(`⚠️ RLS: ${error.message}`);
      } else {
        console.log(`✅ RLS настроен`);
      }
    }

    // Шаг 9: Таблица логов
    console.log('\n📊 Шаг 9: Создаем таблицу логов...');
    const logsTable = `
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

CREATE INDEX IF NOT EXISTS rag_logs_question_hash_idx ON public.rag_logs(question_hash);
CREATE INDEX IF NOT EXISTS rag_logs_created_at_idx ON public.rag_logs(created_at);
    `;

    const { error: logsError } = await supabase.rpc('exec_sql', { sql: logsTable });
    if (logsError) {
      console.log(`⚠️ Таблица логов: ${logsError.message}`);
    } else {
      console.log(`✅ Таблица логов создана`);
    }

    console.log('\n🎉 Миграции выполнены!');
    console.log('\n📋 Следующий шаг: миграция embeddings');
    console.log('Выполните: node migrations/migrate_embeddings.cjs');

  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
  }
}

runStepByStep().catch(console.error);
