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
