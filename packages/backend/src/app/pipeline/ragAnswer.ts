import type { FastifyInstance, FastifyBaseLogger } from "fastify";
import OpenAI from "openai";
import { findExact } from "../../faq/store.js";
import { findFuzzy } from "../../faq/fuzzy.js";
import type {
  SearchSource,
  BotDraft,
  RefineOptions,
} from "../../domain/bot/types.js";
import { refineDraft } from "../llm/llmRefine.js";
import { env } from "../../config/env.js";

interface RagParams {
  text: string;
  lang?: string;
  logger: FastifyBaseLogger;
  pg: FastifyInstance["pg"];
}

export async function ragAnswer({ text, lang, logger, pg }: RagParams) {
  let start = Date.now();
  let embeddingUsed = false;
  let kbResults: SearchSource[] = [];

  // Логируем входной запрос
  logger.info({
    stage: "rag_answer_start",
    query: text,
    lang: lang || "ru",
  });

  // Пытаемся получить embedding через OpenAI
  try {
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    const embedding = embeddingResponse.data[0]?.embedding;
    
    if (embedding && embedding.length > 0) {
      embeddingUsed = true;
      
      // Сначала пробуем вызвать kb_search_json с embedding
      try {
        const q = await pg.query<{ kb_search_json?: any[] }>(
          "select kb_search_json($1, $2, 10, 0.75, 0.25)",
          [text, embedding]
        );
        
        const row = q.rows?.[0];
        if (row && Array.isArray(row.kb_search_json)) {
          kbResults = row.kb_search_json
            .filter((s) => s)
            .map((s) => ({
              id: String(s.article_id),
              title: s.title,
              snippet: s.excerpt,
              score: Number(s.score),
            }));
        }
        
        logger.info({
          stage: "kb_search_with_embedding",
          ms: Date.now() - start,
          hits: kbResults.length,
          embeddingUsed: true,
        });
      } catch (err) {
        // Если kb_search_json недоступна, используем прямой SQL-запрос
        logger.warn({ err }, "kb_search_json function not available, using direct SQL query");
        
        const q = await pg.query<{ id: string; chunk_text: string; title: string }>(
          `SELECT 
            kc.id,
            kc.chunk_text as snippet,
            ka.title
          FROM kb_chunks kc
          JOIN kb_articles ka ON kc.article_id = ka.id
          ORDER BY kc.embedding <=> $1
          LIMIT 10`,
          [embedding]
        );
        
        kbResults = q.rows.map((row) => ({
          id: row.id,
          title: row.title,
          snippet: row.chunk_text,
          score: 0.9,
        }));
        
        logger.info({
          stage: "kb_search_direct_sql",
          ms: Date.now() - start,
          hits: kbResults.length,
          embeddingUsed: true,
        });
      }
    }
  } catch (err) {
    logger.warn({ err }, "OpenAI embedding failed, falling back to text-only search");
    embeddingUsed = false;
  }

  // Если embedding недоступен или произошла ошибка, используем text-only поиск
  if (!embeddingUsed || kbResults.length === 0) {
    try {
      // Сначала пробуем kb_search_json
      const q = await pg.query<{ kb_search_json?: any[] }>(
        "select kb_search_json($1, NULL::real[], 10, 0.0, 1.0)",
        [text]
      );
      
      const row = q.rows?.[0];
      if (row && Array.isArray(row.kb_search_json)) {
        kbResults = row.kb_search_json
          .filter((s) => s)
          .map((s) => ({
            id: String(s.article_id),
            title: s.title,
            snippet: s.excerpt,
            score: Number(s.score),
          }));
      }
      
      logger.info({
        stage: "kb_search_text_only",
        ms: Date.now() - start,
        hits: kbResults.length,
        embeddingUsed: false,
      });
    } catch (err) {
      // Если kb_search_json недоступна, используем прямой SQL-запрос
      logger.warn({ err }, "kb_search_json function not available, using direct SQL query for text search");
      
      try {
        const q = await pg.query<{ id: string; chunk_text: string; title: string }>(
          `SELECT 
            kc.id,
            kc.chunk_text as snippet,
            ka.title
          FROM kb_chunks kc
          JOIN kb_articles ka ON kc.article_id = ka.id
          WHERE 
            kc.chunk_text ILIKE $1
            OR ka.title ILIKE $1
          LIMIT 10`,
          [`%${text}%`]
        );
        
        kbResults = q.rows.map((row) => ({
          id: row.id,
          title: row.title,
          snippet: row.chunk_text,
          score: 0.5,
        }));
        
        logger.info({
          stage: "kb_search_direct_sql_text",
          ms: Date.now() - start,
          hits: kbResults.length,
          embeddingUsed: false,
        });
      } catch (directErr) {
        logger.error({ err: directErr }, "Direct SQL query also failed");
        logger.info({ 
          stage: "kb_search_direct_sql_text", 
          ms: Date.now() - start, 
          hits: 0,
          embeddingUsed: false 
        });
      }
    }
  }

  // Fallback: если KB поиск не дал результатов, пробуем FAQ
  if (kbResults.length === 0) {
    logger.info({
      stage: "fallback_to_faq",
      reason: "kb_search_returned_empty",
    });

    start = Date.now();
    const exact = findExact(text);
    logger.info({
      stage: "faq_exact",
      ms: Date.now() - start,
      hits: exact ? 1 : 0,
    });
    if (exact) {
      return {
        answer: exact.a,
        escalate: false,
        confidence: 1,
        citations: [] as Array<{ id: string }>,
      };
    }

    start = Date.now();
    const fuzzy = findFuzzy(text);
    logger.info({
      stage: "faq_fuzzy",
      ms: Date.now() - start,
      hits: fuzzy.hit ? 1 : 0,
    });
    if (fuzzy.hit) {
      return {
        answer: fuzzy.hit.a,
        escalate: false,
        confidence: 0.9,
        citations: [] as Array<{ id: string }>,
      };
    }

    // Если FAQ тоже не помог, используем LLM fallback
    logger.info({
      stage: "llm_fallback",
      reason: "no_kb_or_faq_results",
    });
  }

  // Логируем финальные результаты
  logger.info({
    stage: "rag_answer_complete",
    total_ms: Date.now() - start,
    kb_hits: kbResults.length,
    embeddingUsed,
    fallback_used: kbResults.length === 0,
  });

  const draftText = kbResults.map((s) => s.snippet ?? "").join("\n");
  start = Date.now();
  const botDraft: BotDraft = {
    question: text,
    draft: draftText,
    sources: kbResults,
    ...(lang !== undefined ? { lang } : {}),
  };
  const opts: RefineOptions = {
    ...(lang !== undefined ? { targetLang: lang } : {}),
    minConfidenceToEscalate: Number(
      process.env.MIN_CONFIDENCE_TO_ESCALATE ?? 0.55,
    ),
    temperature: 0.3,
  };
  const result = await refineDraft(botDraft, opts);
  logger.info({
    stage: "refine",
    ms: Date.now() - start,
    hits: result.citations.length,
  });

  try {
    await pg.query(
      `insert into bot_responses (question, draft, answer, confidence, escalate, lang) values ($1,$2,$3,$4,$5,$6)`,
      [
        text,
        draftText,
        result.answer,
        result.confidence,
        result.escalate,
        lang ?? "ru",
      ],
    );
  } catch (err) {
    logger.error({ err }, "insert bot_responses failed");
  }

  return result;
}

export default ragAnswer;
