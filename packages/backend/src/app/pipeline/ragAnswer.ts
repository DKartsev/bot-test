import type { FastifyInstance } from "fastify";
import { findExact } from "../../faq/store.js";
import { findFuzzy } from "../../faq/fuzzy.js";
import type { SearchSource } from "../../domain/bot/types.js";
import { refineDraft } from "../llm/llmRefine.js";

interface RagParams {
  text: string;
  lang?: string;
}

export async function ragAnswer(app: FastifyInstance, params: RagParams) {
  const { text, lang } = params;
  const logger = app.log;
  let start = Date.now();

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

  start = Date.now();
  let sources: SearchSource[] = [];
  let draft = "";
  try {
    const q = await app.pg.query<{ draft?: string; sources?: any }>(
      "select draft, sources from kb_search_json($1)",
      [text],
    );
    const row = q.rows?.[0];
    if (row) {
      draft = typeof row.draft === "string" ? row.draft : "";
      if (Array.isArray(row.sources)) {
        sources = row.sources.map((s: any) => ({
          id: String(s.id),
          ...(s.title !== undefined ? { title: s.title } : {}),
          ...(s.url !== undefined ? { url: s.url } : {}),
          ...(s.snippet !== undefined ? { snippet: s.snippet } : {}),
          ...(s.score !== undefined ? { score: Number(s.score) } : {}),
        }));
      }
    }
    logger.info({
      stage: "kb_search",
      ms: Date.now() - start,
      hits: sources.length,
    });
  } catch (err: any) {
    logger.error({ err }, "kb_search failed");
    logger.info({ stage: "kb_search", ms: Date.now() - start, hits: 0 });
  }

  const draftText = draft || sources.map((s) => s.snippet ?? "").join("\n");
  start = Date.now();
  const result = await refineDraft(
    { question: text, draft: draftText, sources, lang },
    {
      targetLang: lang ?? "ru",
      minConfidenceToEscalate: Number(
        process.env.MIN_CONFIDENCE_TO_ESCALATE || 0.55,
      ),
    },
  );
  logger.info({
    stage: "refine",
    ms: Date.now() - start,
    hits: result.citations.length,
  });

  try {
    await app.pg.query(
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
  } catch (err: any) {
    logger.error({ err }, "insert bot_responses failed");
  }

  return result;
}

export default ragAnswer;
