import { LRUCache } from "lru-cache";
import type pino from "pino";
import { normalize } from "../nlp/text.js";
import { findExact, loadFaq } from "../faq/store.js";
import { findFuzzy } from "../faq/fuzzy.js";
import { searchKb, reindexKb } from "../kb/index.js";

export interface AnswerResult {
  text: string;
  sources?: Array<{ title: string; slug: string }>;
}

const cache = new LRUCache<string, AnswerResult>({
  max: 500,
  ttl: 15 * 60 * 1000,
});

export async function buildContext() {
  loadFaq();
  reindexKb();
}

function log(
  logger: pino.Logger | undefined,
  rid: string | undefined,
  stage: string,
  ms: number,
  hits: number,
) {
  logger?.info({ rid, stage, ms, hits });
}

export async function answer(
  query: string,
  opts: { rid?: string; logger?: pino.Logger } = {},
): Promise<AnswerResult> {
  const key = normalize(query);
  const cached = cache.get(key);
  if (cached) return cached;

  const { rid, logger } = opts;

  let start = Date.now();
  const exact = findExact(query);
  log(logger, rid, "faq_exact", Date.now() - start, exact ? 1 : 0);
  if (exact) {
    const res = { text: exact.a };
    cache.set(key, res);
    return res;
  }

  start = Date.now();
  const fuzzy = findFuzzy(query);
  log(logger, rid, "faq_fuzzy", Date.now() - start, fuzzy.hit ? 1 : 0);
  if (fuzzy.hit) {
    const res = { text: `${fuzzy.hit.a} (по FAQ)` };
    cache.set(key, res);
    return res;
  }

  start = Date.now();
  const kbRes = searchKb(query, 3);
  log(logger, rid, "kb_search", Date.now() - start, kbRes.length);
  if (kbRes.length) {
    const text =
      kbRes.map((r, i) => `${r.snippet}`).join("\n---\n") +
      `\n\nИсточники: ${kbRes
        .map((r, i) => `[${i + 1}] ${r.doc.title}`)
        .join(", ")}`;
    const res: AnswerResult = {
      text,
      sources: kbRes.map((r) => ({ title: r.doc.title, slug: r.doc.slug })),
    };
    cache.set(key, res);
    return res;
  }

  const res = {
    text: "Не нашёл ответа в базе. Попробуйте переформулировать вопрос или создайте запрос /ticket.",
  };
  cache.set(key, res);
  return res;
}

export function invalidateCache() {
  cache.clear();
}
