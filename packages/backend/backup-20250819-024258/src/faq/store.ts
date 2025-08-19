import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FAQ_PATH } from '../env.js';

// types
export type FaqPair = { id: string; q: string; a: string; tags?: string[] };

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const JSON_PATH = path.resolve(ROOT_DIR, FAQ_PATH);
const CSV_PATH = JSON_PATH.replace(/\.json$/, '.csv');

// кэш всегда массив (не null)
let faqCache: FaqPair[] = [];

// безопасная нормализация — принимает только string
export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

type RawFaqRow = {
  id?: string;
  q?: string;
  question?: string;
  Вопрос?: string;
  a?: string;
  answer?: string;
  Ответ?: string;
  tags?: unknown;
};

// вытянуть q/a из разных возможных полей; пропускать битые записи
function pickQA(row: RawFaqRow): { q: string; a: string } | null {
  const q =
    typeof row?.q === 'string'
      ? row.q
      : typeof row?.question === 'string'
        ? row.question
        : typeof row?.['Вопрос'] === 'string'
          ? row['Вопрос']
          : '';
  const a =
    typeof row?.a === 'string'
      ? row.a
      : typeof row?.answer === 'string'
        ? row.answer
        : typeof row?.['Ответ'] === 'string'
          ? row['Ответ']
          : '';
  if (!q || !a) return null;
  return { q, a };
}

export function loadFaq(): FaqPair[] {
  if (faqCache.length) return faqCache;

  const app = (
    globalThis as {
      app?: {
        log?: {
          info: (p: unknown, m: string) => void;
          warn: (m: string) => void;
        };
      };
    }
  ).app;
  app?.log?.info({ path: FAQ_PATH }, 'FAQ: loading');

  // ...загрузка raw-строк из JSON или CSV (CSV уже конвертирован в объекты)
  let rows: RawFaqRow[] = [];
  try {
    if (fs.existsSync(JSON_PATH)) {
      const raw = fs.readFileSync(JSON_PATH, 'utf-8');
      rows = JSON.parse(raw) as RawFaqRow[];
    } else if (fs.existsSync(CSV_PATH)) {
      const csv = fs.readFileSync(CSV_PATH, 'utf-8');
      const lines = csv.trim().split(/\r?\n/);
      const [header = '', ...rest] = lines;
      if (!/вопрос/i.test(header) || !/ответ/i.test(header)) {
        throw new Error("CSV header must contain 'Вопрос,Ответ'");
      }
      rows = rest.map((line, idx) => {
        const parts = line.split(',');
        if (parts.length < 2) return {};
        const q = parts[0]?.trim() ?? '';
        const a = parts[1]?.trim() ?? '';
        return { id: `csv-${idx + 1}`, q, a };
      });
      fs.writeFileSync(JSON_PATH, JSON.stringify(rows, null, 2), 'utf-8');
    }
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to load FAQ: ${err.message}`);
    }
    throw new Error(`Failed to load FAQ: ${String(err)}`);
  }

  const out: FaqPair[] = [];
  for (const row of rows) {
    const qa = pickQA(row);
    if (!qa) continue;

    const newPair: FaqPair = {
      id:
        typeof row?.id === 'string' && row.id
          ? row.id
          : (globalThis.crypto?.randomUUID?.() ??
            String(Date.now()) + Math.random().toString(16).slice(2)),
      q: qa.q,
      a: qa.a,
    };

    const tags = Array.isArray(row?.tags)
      ? row.tags.filter((t): t is string => typeof t === 'string')
      : undefined;

    if (tags?.length) {
      newPair.tags = tags;
    }

    out.push(newPair);
  }

  faqCache = out;
  app?.log?.info({ count: out.length }, 'FAQ: loaded');
  if (out.length === 0) app?.log?.warn('FAQ: empty');
  return faqCache;
}

// точный поиск — нормализуем вход и не пускаем undefined
export function findExact(query: string): FaqPair | undefined {
  if (!faqCache.length) loadFaq();
  const qn = normalize(query ?? '');
  if (!qn) return;
  return faqCache.find((p) => normalize(p.q) === qn);
}

export function reloadFaq(): FaqPair[] {
  faqCache = [];
  return loadFaq();
}
