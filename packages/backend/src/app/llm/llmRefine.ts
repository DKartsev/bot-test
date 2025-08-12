import OpenAI from "openai";
import { z } from "zod";
import { BotDraft, RefineOptions, RefineResult } from "../../domain/bot/types";

const ResultSchema = z.object({
	answer: z.string().max(4000),
	confidence: z.number().min(0).max(1),
	escalate: z.boolean(),
	citations: z.array(z.object({ id: z.string() })).default([]),
});

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function refineDraft(
	draft: BotDraft,
	opts: RefineOptions = {}
): Promise<RefineResult> {
	const targetLang = opts.targetLang ?? draft.lang ?? "ru";
	const minConfToEscalate = opts.minConfidenceToEscalate ?? 0.55;
	const temperature = typeof opts.temperature === "number" ? opts.temperature : 0.3;

	const jsonSchema = {
		name: "RefineResult",
		schema: {
			type: "object",
			additionalProperties: false,
			properties: {
				answer: { type: "string", description: "Перефразированный, понятный, лаконичный ответ пользователю на целевом языке." },
				confidence: { type: "number", minimum: 0, maximum: 1, description: "Оценка уверенности модели 0..1." },
				escalate: { type: "boolean", description: "Нужно ли мягко предложить оператора." },
				citations: {
					type: "array",
					items: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
					description: "Список ID источников, на которые опирается ответ."
				}
			},
			required: ["answer", "confidence", "escalate", "citations"]
		},
		strict: true,
	};

	const instructions = [
		`Ты — ассистент поддержки.`,
		`1) Перефразируй черновик ответа: коротко, точно, понятно.`,
		`2) Используй ТОЛЬКО факты из черновика/источников.`,
		`3) Язык ответа: ${targetLang}.`,
		`4) Если информации недостаточно или уверенность низкая — аккуратно предложи «связаться с оператором поддержки».`,
		`5) Не выдумывай фактов.`,
	].join("\n");

	const userPayload = {
		question: draft.question,
		draft: draft.draft,
		sources: draft.sources?.map(s => ({
			id: s.id, title: s.title, url: s.url, snippet: s.snippet
		})),
	};

	// Responses API: используем instructions + content с input_text
	// и Structured Outputs с json_schema. :contentReference[oaicite:1]{index=1}
	const resp = await client.responses.create({
		model: MODEL,
		temperature,
		instructions,
		input: [
			{
				role: "user",
				content: [
					{ type: "input_text", text: "Вопрос и материалы ниже. Верни строго JSON по схеме." },
					{ type: "input_text", text: JSON.stringify(userPayload, null, 2) },
				],
			},
		],
		response_format: {
			type: "json_schema",
			json_schema: jsonSchema,
		},
	});

	const raw = resp.output_text ?? "{}";
	const parsed = ResultSchema.safeParse(JSON.parse(raw));
	if (!parsed.success) {
		throw new Error("LLM structured output validation failed");
	}

	const result = parsed.data;
	const escalate = result.escalate || result.confidence < minConfToEscalate;

	return {
		answer: result.answer,
		confidence: result.confidence,
		escalate,
		citations: result.citations ?? [],
	};
}
