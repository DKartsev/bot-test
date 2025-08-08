import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { createClient } from '@supabase/supabase-js';
import { chunkMarkdown } from './utils';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const embedder = new OpenAIEmbeddings();

export async function indexKB(articleId: string, markdown: string) {
  const chunks = chunkMarkdown(markdown); // разбивка по 500–800 токенов
  const embeddings = await embedder.embedDocuments(chunks);

  const records = chunks.map((chunk, i) => ({
    article_id: articleId,
    chunk_text: chunk,
    chunk_index: i,
    embedding: embeddings[i]
  }));

  await supabase.from('kb_chunks').insert(records);
}
// packages/kb-tools/index.ts
import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { chunkMarkdown } from './utils';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const embedder = new OpenAIEmbeddings();

export async function indexKB(articleId: string, markdown: string) {
  // 1) разбиваем на чанки
  const chunks = chunkMarkdown(markdown, 500);
  // 2) считаем эмбеддинги
  const embeddings = await embedder.embedDocuments(chunks);

  // 3) готовим записи
  const records = chunks.map((chunk, i) => ({
    article_id: articleId,
    chunk_text: chunk,
    chunk_index: i,
    embedding: embeddings[i]
  }));

  // 4) вставляем в Supabase
  const { error } = await supabase.from('kb_chunks').insert(records);
  if (error) {
    console.error('Error indexing KB:', error);
    throw error;
  }
}
