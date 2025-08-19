import type { SearchResult } from 'minisearch';
import MiniSearch from 'minisearch';
import { loadKb } from './loader.js';
import { normalize, tokensRU } from '../nlp/text.js';

export interface KbDoc {
  id: string;
  title: string;
  content: string;
  tags: string[];
  slug: string;
}

let mini: MiniSearch<KbDoc> | null = null;
let docs: KbDoc[] = [];

function getIndex(): MiniSearch<KbDoc> {
  if (!mini) {
    docs = loadKb();
    mini = new MiniSearch<KbDoc>({
      idField: 'id',
      fields: ['title', 'content', 'tags'],
      storeFields: ['title', 'slug'],
      tokenize: tokensRU,
      processTerm: (t) => t,
    });
    mini.addAll(docs);
  }
  return mini;
}

function highlight(content: string, queryTokens: string[]): string {
  let snippet = content;
  for (const t of queryTokens) {
    const re = new RegExp(t, 'gi');
    snippet = snippet.replace(re, (m) => `**${m}**`);
  }
  return snippet;
}

export function searchKb(
  query: string,
  limit = 3,
): Array<{ doc: KbDoc; score: number; snippet: string }> {
  if (normalize(query).length < 2) return [];
  const index = getIndex();
  const hitsAll = index.search(query, {
    prefix: true,
    fuzzy: 0.2,
    boost: { title: 3, tags: 2, content: 1 },
  });
  const hits = hitsAll.slice(0, limit);
  const qTokens = tokensRU(query);
  return hits.map((r: SearchResult) => {
    const doc = docs.find((d) => d.id === r.id);
    if (!doc) {
      return { doc: { id: String(r.id), title: '', content: '', tags: [], slug: '' }, score: r.score, snippet: '' };
    }
    const firstToken = qTokens.find((t) => {
      const idx = doc.content.toLowerCase().indexOf(t);
      return idx >= 0;
    });
    let snippet = doc.content;
    if (firstToken) {
      const idx = doc.content.toLowerCase().indexOf(firstToken);
      const start = Math.max(0, idx - 150);
      const end = Math.min(doc.content.length, idx + 350);
      snippet = doc.content.slice(start, end);
    }
    snippet = highlight(snippet, qTokens);
    return { doc, score: r.score, snippet };
  });
}

export function reindexKb() {
  mini = null;
  return getIndex();
}
