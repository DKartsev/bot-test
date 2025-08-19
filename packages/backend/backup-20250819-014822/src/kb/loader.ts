import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

import { KB_DIR } from "../env.js";

export interface KbDoc {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  content: string;
}

interface FrontMatter {
  id?: string;
  title?: string;
  slug?: string;
  tags?: string[];
}

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
let cache: KbDoc[] | null = null;

export function loadKb(): KbDoc[] {
  if (cache) return cache;
  const baseDir = path.resolve(ROOT_DIR, KB_DIR);
  
  if (!fs.existsSync(baseDir)) {
    cache = [];
    console.log("KB: loaded", { count: 0 });
    console.warn("KB: empty");
    return cache;
  }
  
  const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".md"));
  const docs = files.map((file) => {
    const raw = fs.readFileSync(path.join(baseDir, file), "utf-8");
    const parsed = matter(raw);
    const data: FrontMatter = parsed.data;
    const slug = data.slug || file.replace(/\.md$/, "");
    return {
      id: data.id || slug,
      title: data.title || slug,
      slug,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      content: parsed.content.trim(),
    } as KbDoc;
  });
  cache = docs;
  console.log("KB: loaded", { count: docs.length });
  if (!docs.length) console.warn("KB: empty");
  return cache;
}
