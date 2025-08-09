const OpenAI = require('openai');
const { logger } = require('../utils/logger');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.RAG_OPENAI_MODEL || 'gpt-4o-mini';
const TEMP = Number(process.env.RAG_TEMPERATURE || '0.2');
const DEFAULT_LANG = process.env.DEFAULT_LANG || 'en';

async function answerWithRag({ question, lang, contextText, citations }) {
  const system =
    'Ты — бот поддержки. Отвечай кратко и по делу, используя контекст. Если не хватает данных, прямо скажи об этом. Добавь ссылки на источники в конце в формате [1], [2]... соответствуя списку источников.';
  const srcList = (citations || [])
    .map((c, i) => `${i + 1}. ${c.title || c.sourceId}`)
    .join('\n');
  const user = `Вопрос: ${question}\nКонтекст:\n---\n${contextText}\n---\nИсточники:\n${srcList}\nЯзык ответа: ${lang || DEFAULT_LANG}`;
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: TEMP
    });
    const answer = completion.choices[0]?.message?.content?.trim() || '';
    return { answer, citations };
  } catch (err) {
    logger.error({ err }, 'RAG answer failed');
    throw err;
  }
}

module.exports = { answerWithRag };
