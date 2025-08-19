import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import OpenAI from 'openai';

import { findExact } from '../../faq/store.js';
import { findFuzzy } from '../../faq/fuzzy.js';
import { refineDraft } from '../llm/llmRefine.js';

interface KBSearchResult {
  kb_search_json: Array<{ article_id: string; title: string; excerpt: string; score: number }>;
}

interface DirectSearchResult {
  id: string;
  chunk_text: string;
  title: string | null;
}

export async function ragAnswer({
  text,
  lang,
  logger,
  pg,
}: {
  text: string;
  lang: string;
  logger: FastifyBaseLogger;
  pg: FastifyInstance['pg'];
}): Promise<{
  answer: string;
  confidence: number;
  escalate: boolean;
  citations: Array<{ id: string }>;
}> {
  let embedding: number[] | null = null;

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? '',
    });

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    embedding = response.data[0]?.embedding ?? null;
  } catch (err) {
    logger.warn({ err }, 'OpenAI embedding failed, falling back to text-only search');
  }

  let sources: Array<{ id: string; title?: string; excerpt?: string }> = [];

  try {
    if (embedding) {
      const result = await pg.query<KBSearchResult>(
        'select kb_search_json($1, $2, 10, 0.75, 0.25)',
        [text, embedding],
      );
      const kbResults = result.rows[0]?.kb_search_json ?? [];
      sources = kbResults.map((s) => ({
        id: s.article_id,
        title: s.title,
        excerpt: s.excerpt,
      }));
      logger.info(
        { stage: 'kb_search_with_embedding', hits: sources.length },
        'KB search completed with embedding',
      );
    } else {
      const result = await pg.query<KBSearchResult>(
        'select kb_search_json($1, NULL::real[], 10, 0.0, 1.0)',
        [text],
      );
      const kbResults = result.rows[0]?.kb_search_json ?? [];
      sources = kbResults.map((s) => ({
        id: s.article_id,
        title: s.title,
        excerpt: s.excerpt,
      }));
      logger.info(
        { stage: 'kb_search_text_only', hits: sources.length },
        'KB search completed with text-only',
      );
    }
  } catch (err) {
    logger.warn(
      { err },
      'kb_search_json function not available, using direct SQL query for text search',
    );

    try {
      const result = await pg.query<DirectSearchResult>(
        `SELECT 
          c.id,
          c.chunk_text,
          s.title
        FROM chunks c
        JOIN sources s ON c.source_id = s.id
        WHERE c.chunk_text ILIKE $1
        ORDER BY c.chunk_text <-> $1
        LIMIT 10`,
        [`%${text}%`],
      );

      sources = result.rows.map((row) => ({
        id: row.id,
        title: row.title ?? 'Unknown',
        excerpt: row.chunk_text,
      }));
    } catch (sqlErr) {
      logger.error({ err: sqlErr }, 'Direct SQL query also failed');
      sources = [];
    }
  }

  if (sources.length === 0) {
    logger.info(
      { stage: 'fallback_to_faq', reason: 'kb_search_returned_empty' },
      'No KB results, trying FAQ',
    );

    const exactMatch = findExact(text);
    if (exactMatch) {
      return {
        answer: exactMatch.a,
        escalate: false,
        confidence: 1,
        citations: [],
      };
    }

    const fuzzyMatch = findFuzzy(text);
    if (fuzzyMatch && typeof fuzzyMatch === 'object' && 'hit' in fuzzyMatch && fuzzyMatch.hit) {
      return {
        answer: fuzzyMatch.hit.a,
        escalate: false,
        confidence: 0.9,
        citations: [],
      };
    }
  }

  // Use LLM to generate answer from sources
  const result = await refineDraft(text, '', sources, lang, logger);

  // Log the response for monitoring
  try {
    await pg.query(
      'INSERT INTO bot_responses (question, draft, answer, confidence, escalate, lang) VALUES ($1, $2, $3, $4, $5, $6)',
      [text, '', result.answer, result.confidence, result.escalate, lang],
    );
  } catch (err) {
    logger.warn({ err }, 'Failed to log bot response');
  }

  return result;
}

export default ragAnswer;
