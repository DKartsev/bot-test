import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { env } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type { ChunkOptions, TextChunk } from './chunker.js';
import { chunkText } from './chunker.js';

const DATA_DIR = env.KB_DIR;
const SOURCES_FILE = path.join(DATA_DIR, 'sources.json');
const CHUNKS_FILE = path.join(DATA_DIR, 'chunks.jsonl');

interface SourceMetadata {
  title?: string;
  type?: string;
  path?: string;
  url?: string;
  lang?: string;
  mime?: string;
  originalName?: string;
  dlp?: {
    redacted: boolean;
    reasons: string[];
  };
}

interface SourceDocument {
  id: string;
  hash: string;
  tokens: number;
  createdAt: string;
  updatedAt: string;
  title?: string;
  type?: string;
  path?: string;
  url?: string;
  lang?: string;
  dlp?: {
    redacted: boolean;
    reasons: string[];
  };
}

function sha1(str: string): string {
  return createHash('sha1').update(str).digest('hex');
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readSources(): Promise<SourceDocument[]> {
  try {
    const content = await fs.readFile(SOURCES_FILE, 'utf8');
    return JSON.parse(content) as SourceDocument[];
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === 'ENOENT'
    ) {
      return [];
    }
    logger.error({ err }, 'Failed to read sources.json');
    return [];
  }
}

async function writeSources(sources: SourceDocument[]): Promise<void> {
  try {
    const tmp = `${SOURCES_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(sources, null, 2));
    await fs.rename(tmp, SOURCES_FILE);
  } catch (err) {
    logger.error({ err }, 'Failed to write sources.json');
  }
}

async function appendChunks(
  chunks: TextChunk[],
  sourceId: string,
): Promise<void> {
  const lines = chunks.map((c) => JSON.stringify({ ...c, sourceId }));
  await fs.appendFile(CHUNKS_FILE, `${lines.join('\n')}\n`);
}

export async function ingestText(
  text: string,
  meta: SourceMetadata = {},
): Promise<{ source: SourceDocument; chunks: TextChunk[] }> {
  await ensureDir();

  // TODO: Implement DLP sanitization
  const sanitizedText = text;
  const detections: string[] = [];

  if (detections.length) {
    meta.dlp = { redacted: true, reasons: detections };
  }

  const hash = sha1(sanitizedText);
  const now = new Date().toISOString();

  const source: SourceDocument = {
    id: randomUUID().replace(/-/g, ''),
    hash,
    tokens: Math.round(sanitizedText.length / 4),
    createdAt: now,
    updatedAt: now,
  };

  if (meta.title) source.title = meta.title;
  if (meta.type) source.type = meta.type;
  if (meta.path) source.path = meta.path;
  if (meta.url) source.url = meta.url;
  if (meta.lang) source.lang = meta.lang;
  if (meta.dlp) source.dlp = meta.dlp;

  const chunkOpts: ChunkOptions = {};
  if (source.title) {
    chunkOpts.title = source.title;
  }
  const chunks = chunkText(sanitizedText, chunkOpts);
  const sources = await readSources();
  sources.push(source);
  await writeSources(sources);
  await appendChunks(chunks, source.id);
  return { source, chunks };
}

export async function ingestFile(
  filePath: string,
  meta: SourceMetadata = {},
): Promise<{ source: SourceDocument; chunks: TextChunk[] }> {
  await ensureDir();
  const buffer = await fs.readFile(filePath);
  const mime = meta.mime || '';
  const ext = path.extname(meta.originalName || filePath).toLowerCase();
  let text = '';
  let type = 'txt';

  try {
    if (mime.includes('pdf') || ext === '.pdf') {
      type = 'pdf';
      // TODO: Implement PDF parsing
      text = 'PDF content not implemented yet';
    } else if (mime.includes('html') || ext === '.html' || ext === '.htm') {
      type = 'html';
      // TODO: Implement HTML parsing
      text = 'HTML content not implemented yet';
    } else if (ext === '.md' || ext === '.markdown') {
      type = 'md';
      text = buffer.toString('utf8');
    } else {
      type = 'txt';
      text = buffer.toString('utf8');
    }
  } catch (err) {
    logger.error({ err, filePath }, 'Failed to parse file content');
    throw new Error(`Failed to parse file: ${filePath}`);
  }

  meta.type = type;
  const { source, chunks } = await ingestText(text, meta);

  try {
    const dest = path.join(DATA_DIR, `${source.id}${ext || ''}`);
    await fs.copyFile(filePath, dest);
    source.path = dest;
    const sources = await readSources();
    const idx = sources.findIndex((s) => s.id === source.id);
    const sourceToUpdate = sources[idx];
    if (sourceToUpdate) {
      sourceToUpdate.path = dest;
      await writeSources(sources);
    }
  } catch (err) {
    logger.error(
      { err, sourceId: source.id },
      'Failed to store original ingested file',
    );
  }

  return { source, chunks };
}
