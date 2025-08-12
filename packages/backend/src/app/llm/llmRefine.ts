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

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"; // замените при необходимости

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

	const system = [
		`Ты — ассистент поддержки. Твоя задача:`,
		`1) Перефразировать черновик ответа так, чтобы он был коротким, точным и понятным.`,
		`2) Использовать только факты из предоставленных источников/черновика.`,
		`3) Язык ответа: ${targetLang}.`,
		`4) Если информации недостаточно или уверенность низкая — предложи «связаться с оператором поддержки» без навязывания.`,
		`5) Не выдумывай фактов.`,
	].join("\n");

	const user = {
		question: draft.question,
		draft: draft.draft,
		sources: draft.sources?.map(s => ({
			id: s.id, title: s.title, url: s.url, snippet: s.snippet
		})),
	};

	// Responses API + Structured Outputs (json_schema)
	// Документация: API Reference (Responses) и Structured Outputs. 
	// Результат валидируем через Zod. :contentReference[oaicite:2]{index=2}
	const resp = await client.responses.create({
		model: MODEL,
		temperature,
		input: [
			{ role: "system", content: system },
			{
				role: "user",
				content: [
					{ type: "text", text: "Вопрос и материалы ниже. Верни строго JSON по схеме." },
					{ type: "input_text", text: JSON.stringify(user, null, 2) },
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
	// «Мягкая» эскалация — если уверенность ниже порога.
	const escalate = result.escalate || result.confidence < minConfToEscalate;

	return {
		answer: result.answer,
		confidence: result.confidence,
		escalate,
		citations: result.citations ?? [],
	};
}
