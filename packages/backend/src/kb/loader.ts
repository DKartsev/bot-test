import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { fileURLToPath } from "node:url";

export interface KbDoc {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  content: string;
}

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const KB_DIRS = [
  path.join(ROOT_DIR, "kb"),
  path.join(ROOT_DIR, "docs/kb"),
  path.join(ROOT_DIR, "knowledge_base"),
  path.join(ROOT_DIR, "data/kb"),
];
let cache: KbDoc[] | null = null;

export function loadKb(): KbDoc[] {
  if (cache) return cache;
  const baseDir = KB_DIRS.map((p) => path.resolve(p)).find((p) =>
    fs.existsSync(p),
  );
  if (!baseDir) {
    cache = [];
    return cache;
  }
  const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".md"));
  cache = files.map((file) => {
    const raw = fs.readFileSync(path.join(baseDir, file), "utf-8");
    const parsed = matter(raw);
    const data: any = parsed.data || {};
    const slug = data.slug || file.replace(/\.md$/, "");
    return {
      id: data.id || slug,
      title: data.title || slug,
      slug,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      content: parsed.content.trim(),
    } as KbDoc;
  });
  return cache;
}
