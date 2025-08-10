const OpenAI = require('openai');
const dotenv = require('dotenv');
const { logger } = require('../utils/logger');

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
let client = null;

if (apiKey) {
  client = new OpenAI({ apiKey });
} else {
  logger.warn('OPENAI_API_KEY is not set; OpenAI fallback disabled');
}

async function fallbackQuery(question, lang) {
  if (!question) {
    return '';
  }
  if (!client) {
    logger.error('OpenAI client not initialized');
    return '';
  }
  try {
    const system = lang
      ? `You are a helpful support bot. Respond in ${lang}. Use provided QA context when possible.`
      : 'You are a helpful support bot. Use provided QA context when possible.';
    const completion = await client.chat.completions.create({
      model: process.env.RAG_OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question }
      ],
      temperature: 0.2,
      max_tokens: 500
    });
    const answer = completion.choices[0]?.message?.content || '';
    return answer.trim();
  } catch (error) {
    logger.error({ err: error }, 'OpenAI fallback failed');
    throw error;
  }
}

module.exports = { fallbackQuery };
