import { randomUUID } from "crypto";

export interface ChunkOptions {
  size?: number;
  overlap?: number;
  title?: string;
  headings?: string[];
}

export interface TextChunk {
  id: string;
  text: string;
  start: number;
  end: number;
  title?: string;
  headings?: string[];
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

export function chunkText(text: string, opts: ChunkOptions = {}): TextChunk[] {
  const size = opts.size ?? 1200;
  const overlap = opts.overlap ?? 200;
  const { title, headings } = opts;

  const normalizedText = normalizeText(text);
  const chunks: TextChunk[] = [];
  let start = 0;
  const totalLength = normalizedText.length;

  while (start < totalLength) {
    let end = Math.min(totalLength, start + size);

    if (end < totalLength) {
      const lastNewline = normalizedText.lastIndexOf("\n", end);
      if (lastNewline > start + size * 0.5) {
        end = lastNewline;
      }
    }

    const chunkContent = normalizedText.slice(start, end).trim();
    if (chunkContent) {
      const chunk: TextChunk = {
        id: randomUUID().replace(/-/g, ""),
        text: chunkContent,
        start,
        end,
      };
      if (title) {
        chunk.title = title;
      }
      if (headings) {
        chunk.headings = headings;
      }
      chunks.push(chunk);
    }

    if (end >= totalLength) {
      break;
    }

    start = end - overlap;
    if (start < 0) {
      start = 0;
    }
  }

  return chunks;
}
