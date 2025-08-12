import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { refineDraft } from "../../app/llm/llmRefine.js";
import type { BotDraft } from "../../domain/bot/types.js";

const BodySchema = z.object({
	question: z.string().min(1),
	draft: z.string().min(1),
	sources: z.array(z.object({
		id: z.string(),
		title: z.string().optional(),
		url: z.string().url().optional(),
		snippet: z.string().optional(),
		score: z.number().optional(),
	})).default([]),
	lang: z.string().optional(),
	options: z.object({
		targetLang: z.string().optional(),
		temperature: z.number().min(0).max(2).optional(),
		minConfidenceToEscalate: z.number().min(0).max(1).optional(),
	}).optional()
});

type Body = z.infer<typeof BodySchema>;

const plugin: FastifyPluginAsync = async (app) => {
	app.post<{ Body: Body }>("/api/bot/refine", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
		const parse = BodySchema.safeParse(req.body);
		if (!parse.success) {
			reply.code(400);
			return { error: "ValidationError", details: parse.error.flatten() };
		}
		const body = parse.data;

		const draft: BotDraft = {
			question: body.question,
			draft: body.draft,
			sources: body.sources,
			lang: body.lang ?? "ru",
		};

		try {
			const result = await refineDraft(draft, body.options);

			// Проверка наличия необходимых полей
			if (!result.answer || typeof result.confidence !== "number" || typeof result.escalate !== "boolean") {
				req.log.error({ result }, "refineDraft returned incomplete result");
				reply.code(502);
				return { error: "UpstreamLLMError", message: "LLM refinement returned incomplete result" };
			}

			const inserted = await app.pg.query<{ id: string }>(
				`insert into bot_responses (question, draft, answer, confidence, escalate, lang)
         values ($1, $2, $3, $4, $5, $6)
         returning id`,
				[draft.question, draft.draft, result.answer, result.confidence, result.escalate, draft.lang]
			);

			const id = inserted.rows?.[0]?.id;
			if (!id) {
				req.log.error({ rows: inserted.rows }, "insert bot_responses returned no id");
				reply.code(500);
				return { error: "InternalError" };
			}
			return { id, ...result };
		} catch (e: any) {
			req.log.error({ err: e, stack: e?.stack }, "refine failed");
			reply.code(502);
			return { error: "UpstreamLLMError", message: "LLM refinement failed" };
		}
	});
};

export default plugin;
