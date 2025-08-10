import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { supabaseService } from '../database/connection';
import { createStore } from '../data/store';

const embedder = new OpenAIEmbeddings();
const TABLE = 'faq_questions';
const indexed = new Set<string>();

export async function buildIndex(basePath?: string) {
  const store = createStore(basePath);
  const items = store.getApproved();
  if (items.length === 0) return 0;
  const texts = items.map((item) => {
    const arr: string[] = [item.Question];
    if (item.translations) {
      for (const t of Object.values(item.translations)) {
        if (t && t.Question) arr.push(t.Question);
      }
    }
    return arr.join('\n');
  });
  const vectors = await embedder.embedDocuments(texts);
  const records = items.map((item, i) => ({
    id: item.id,
    question: item.Question,
    embedding: vectors[i]
  }));
  const { error } = await supabaseService.from(TABLE).upsert(records);
  if (error) throw error;
  if (basePath) {
    indexed.add(basePath);
    store.onUpdated(() => indexed.delete(basePath));
  }
  return records.length;
}

export async function semanticSearch(query: string, limit = 5, tenant?: any) {
  if (!query) return [];
  const basePath = tenant?.basePath;
  if (basePath && !indexed.has(basePath)) {
    await buildIndex(basePath);
  }
  const [queryVec] = await embedder.embedDocuments([query]);
  const { data, error } = await supabaseService.rpc('match_faq_questions', {
    query_embedding: queryVec,
    match_count: limit
  });
  if (error || !data) return [];
  const store = createStore(basePath);
  return data.map((row: any) => {
    const item = store.getById(row.id);
    const sim = row.similarity ?? row.sim ?? 0;
    return { item, score: 1 - sim, sim };
  });
}

export async function getIndexSize() {
  const { count, error } = await supabaseService
    .from(TABLE)
    .select('id', { count: 'exact', head: true });
  if (error) return 0;
  return count || 0;
}

export default { buildIndex, semanticSearch, getIndexSize };
