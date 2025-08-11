import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalize } from "../nlp/text.js";

export interface FaqPair {
  id: string;
  q: string;
  a: string;
  tags?: string[];
}

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const JSON_PATH = path.join(ROOT_DIR, "data/qa/faq.json");
const CSV_PATH = path.join(ROOT_DIR, "data/qa/faq.csv");

let faqCache: FaqPair[] | null = null;
let faqIndex: Map<string, FaqPair> = new Map();

export function loadFaq(): FaqPair[] {
  if (faqCache) return faqCache;
  try {
    if (fs.existsSync(JSON_PATH)) {
      const raw = fs.readFileSync(JSON_PATH, "utf-8");
      faqCache = JSON.parse(raw);
    } else if (fs.existsSync(CSV_PATH)) {
      const csv = fs.readFileSync(CSV_PATH, "utf-8");
      const lines = csv.trim().split(/\r?\n/);
      const [header, ...rows] = lines;
      if (!/вопрос/i.test(header) || !/ответ/i.test(header)) {
        throw new Error("CSV header must contain 'Вопрос,Ответ'");
      }
      faqCache = rows
        .map((line, idx) => {
          const parts = line.split(",");
          if (parts.length < 2) return undefined;
          const [q, a] = parts;
          return { id: `csv-${idx + 1}`, q: q.trim(), a: a.trim() } as FaqPair;
        })
        .filter(Boolean) as FaqPair[];
      fs.writeFileSync(JSON_PATH, JSON.stringify(faqCache, null, 2), "utf-8");
    } else {
      faqCache = [];
    }
    faqIndex = new Map(faqCache.map((f) => [normalize(f.q), f]));
    return faqCache;
  } catch (err: any) {
    throw new Error(`Failed to load FAQ: ${err.message}`);
  }
}

export function findExact(query: string): FaqPair | undefined {
  loadFaq();
  return faqIndex.get(normalize(query));
}
