import OpenAI from "openai";
import { z } from "zod";
import type { BotDraft } from "../../domain/bot/types.js";

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

// Вспомогательный: аккуратно достать JSON даже если LLM добавил текст вокруг
function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    /* ignore */
  }
  const m = text.match(/\{[\s\S]*\}$/); // ищем последний JSON-объект
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {
      /* ignore */
    }
  }
  return {};
}

export async function refineDraft(
  draft: BotDraft,
  opts: {
    targetLang?: string;
    temperature?: number;
    minConfidenceToEscalate?: number;
  } = {},
) {
  const targetLang = opts.targetLang ?? draft.lang ?? "ru";
  const minConfToEscalate = opts.minConfidenceToEscalate ?? 0.55;
  const temperature =
    typeof opts.temperature === "number" ? opts.temperature : 0.3;

  const instructions = [
    `Ты — ассистент поддержки.`,
    `Перефразируй черновик ответа кратко и ясно на языке: ${targetLang}.`,
    `Используй только факты из черновика/источников. Не выдумывай.`,
    `Если информации мало или уверенность низкая — мягко предложи «связаться с оператором поддержки».`,
    `Верни строго JSON со схемой: { "answer": string, "confidence": number (0..1), "escalate": boolean, "citations": [{"id": string}...] }.`,
  ].join("\n");

  type Src = { id: string; title?: string; url?: string; snippet?: string };
  const userPayload = {
    question: draft.question,
    draft: draft.draft,
    sources: (draft.sources ?? []).map((s: Src) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      snippet: s.snippet,
    })),
  };

  // Используем Chat Completions для совместимости типов SDK.
  const chat = await client.chat.completions.create({
    model: MODEL,
    temperature,
    messages: [
      { role: "system", content: instructions },
      {
        role: "user",
        content:
          "Материалы ниже. Верни СТРОГО JSON по указанной схеме, без пояснений.",
      },
      { role: "user", content: JSON.stringify(userPayload, null, 2) },
    ],
  });

  const raw = chat.choices?.[0]?.message?.content ?? "{}";
  const obj = extractJson(raw);
  const parsed = ResultSchema.safeParse(obj);
  if (!parsed.success) {
    // Фолбэк: эскалируем
    return {
      answer: "Мне нужно уточнить детали. Могу подключить оператора поддержки.",
      confidence: 0,
      escalate: true,
      citations: [],
    };
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
