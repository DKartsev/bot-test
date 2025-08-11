import fetch from "node-fetch";
import logger from "../utils/logger";

// Temporary import of legacy RAG index utilities (CommonJS module)
// TODO: migrate to a dedicated package and remove this import
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ragIndex from "../../../../src/rag/index.js";

const { searchChunks } = ragIndex as {
  searchChunks: (
    query: string,
    k: number,
    tenant?: unknown,
  ) => Promise<ChunkItem[]>;
};

interface ChunkItem {
  sourceId: string;
  text: string;
  title?: string;
  sim?: number;
  [key: string]: unknown;
}

interface RetrieveOptions {
  topK?: number;
  diversify?: boolean;
  tenant?: unknown;
}

interface Citation {
  key: number;
  sourceId: string;
  title?: string;
  snippet: string;
}

interface RetrievalResult {
  contextText: string;
  citations: Citation[];
  items: ChunkItem[];
}

async function retrieve(
  query: string,
  opts: RetrieveOptions = {},
): Promise<RetrievalResult> {
  const topK = opts.topK ?? Number(process.env.RAG_TOPK || "6");
  const diversify =
    opts.diversify ?? process.env.RAG_DIVERSIFY_BY_SOURCE === "1";
  const maxChars = Number(process.env.RAG_MAX_CONTEXT_CHARS || "9000");
  const tenant = opts.tenant as Record<string, unknown> | undefined;

  let items = await searchChunks(query, topK, tenant);
  if (diversify) {
    const perSource: Record<string, number> = {};
    const limited: ChunkItem[] = [];
    for (const it of items) {
      perSource[it.sourceId] = perSource[it.sourceId] || 0;
      if (perSource[it.sourceId] < 2) {
        limited.push(it);
        perSource[it.sourceId] += 1;
      }
    }
    items = limited;
  }

  let contextText = "";
  const citations: Citation[] = [];
  for (const item of items) {
    if (contextText.length + item.text.length > maxChars) break;
    contextText += item.text + "\n\n";
    citations.push({
      key: citations.length + 1,
      sourceId: item.sourceId,
      title: item.title,
      snippet: item.text.slice(0, 200),
    });
  }

  return { contextText: contextText.trim(), citations, items };
}

interface AnswerParams {
  question: string;
  lang?: string;
  contextText: string;
  citations: Citation[];
}

async function answerWithRag({
  question,
  lang,
  contextText,
  citations,
}: AnswerParams): Promise<{ answer: string; citations: Citation[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error("OPENAI_API_KEY not configured");
    throw new Error("OPENAI_API_KEY not configured");
  }

  const MODEL = process.env.RAG_OPENAI_MODEL || "gpt-4o-mini";
  const TEMP = Number(process.env.RAG_TEMPERATURE || "0.2");
  const DEFAULT_LANG = process.env.DEFAULT_LANG || "en";

  const system =
    "Ты — бот поддержки. Отвечай кратко и по делу, используя контекст. Если не хватает данных, прямо скажи об этом. Добавь ссылки на источники в конце в формате [1], [2]... соответствуя списку источников.";
  const srcList = (citations || [])
    .map((c, i) => `${i + 1}. ${c.title || c.sourceId}`)
    .join("\n");
  const user = `Вопрос: ${question}\nКонтекст:\n---\n${contextText}\n---\nИсточники:\n${srcList}\nЯзык ответа: ${lang || DEFAULT_LANG}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: TEMP,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error({ err }, "RAG answer failed");
    throw new Error("OpenAI request failed");
  }

  const data = (await response.json()) as any;
  const answer = data.choices?.[0]?.message?.content?.trim() || "";
  return { answer, citations };
}

export async function generateResponse(message: string): Promise<string> {
  try {
    const { contextText, citations } = await retrieve(message);
    if (!contextText) {
      logger.warn({ message }, "No context found for RAG query");
    }

    const { answer } = await answerWithRag({
      question: message,
      contextText,
      citations,
    });

    logger.debug({ message, answer }, "Generated RAG response");
    return answer;
  } catch (err) {
    logger.error({ err }, "RAG service error");
    throw err;
  }
}

export { retrieve, answerWithRag };
