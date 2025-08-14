import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
<<<<<<< HEAD

const plugin: FastifyPluginAsync = async (app: FastifyInstance, _opts) => {
  app.get(
    "/bot",
    async (req, _reply) => {
      // TODO: Implement bot status logic
      return { status: "ok" };
=======
import { z } from "zod";
import { refineDraft } from "../../app/llm/llmRefine.js";
import type {
  BotDraft,
  RefineOptions,
  SearchSource,
} from "../../domain/bot/types.js";

const BodySchema = z.object({
  question: z.string().min(1),
  draft: z.string().min(1),
  sources: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        url: z.string().url().optional(),
        snippet: z.string().optional(),
        score: z.number().optional(),
      }),
    )
    .default([]),
  lang: z.string().optional(),
  options: z
    .object({
      targetLang: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      minConfidenceToEscalate: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

type Body = z.infer<typeof BodySchema>;

const botRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: Body }>(
    "/bot/refine",
    { 
      schema: { body: BodySchema },
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } } 
    },
    async (req, reply) => {
      const body = req.body;

      const srcs: SearchSource[] = body.sources.map((s) => ({
        id: s.id,
        ...(s.title !== undefined ? { title: s.title } : {}),
        ...(s.url !== undefined ? { url: s.url } : {}),
        ...(s.snippet !== undefined ? { snippet: s.snippet } : {}),
        ...(s.score !== undefined ? { score: s.score } : {}),
      }));

      const draft: BotDraft = {
        question: body.question,
        draft: body.draft,
        sources: srcs,
        ...(body.lang !== undefined ? { lang: body.lang } : {}),
      };

      let opts: RefineOptions | undefined = undefined;
      if (body.options) {
        opts = {
          ...(body.options.targetLang !== undefined
            ? { targetLang: body.options.targetLang }
            : {}),
          ...(body.options.temperature !== undefined
            ? { temperature: body.options.temperature }
            : {}),
          ...(body.options.minConfidenceToEscalate !== undefined
            ? { minConfidenceToEscalate: body.options.minConfidenceToEscalate }
            : {}),
        };
      }

      try {
        const result = await refineDraft(draft, opts);
        const inserted = await app.pg.query<{ id: string }>(
          `insert into bot_responses (question, draft, answer, confidence, escalate, lang)
           values ($1, $2, $3, $4, $5, $6)
           returning id`,
          [
            draft.question,
            draft.draft,
            result.answer,
            result.confidence,
            result.escalate,
            draft.lang,
          ],
        );

        const id = inserted.rows?.[0]?.id;
        if (!id) {
          req.log.error(
            { rows: inserted.rows },
            "insert bot_responses returned no id",
          );
          void reply.code(500);
          return { error: "InternalError" };
        }
        return { id, ...result };
      } catch (e: unknown) {
        req.log.error({ err: e }, "refine failed");
        void reply.code(502);
        return { error: "UpstreamLLMError", message: "LLM refinement failed" };
      }
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
    },
  );
};

<<<<<<< HEAD
export default fp(plugin as any);
=======
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
