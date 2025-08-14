import { FastifyInstance, FastifyPluginCallback } from "fastify";
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

const plugin: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  app.post<{ Body: Body }>(
    "/api/bot/refine",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parse = BodySchema.safeParse(req.body);
      if (!parse.success) {
        void reply.code(400);
        return { error: "ValidationError", details: parse.error.flatten() };
      }
      const body = parse.data;

      // Формируем sources без явных undefined (важно при exactOptionalPropertyTypes)
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

      // Нормализуем options так, чтобы не было типов вида string | undefined
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
    },
  );
  done();
};

export default plugin;
