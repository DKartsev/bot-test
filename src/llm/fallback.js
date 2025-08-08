const OpenAI = require('openai');
const dotenv = require('dotenv');
const { logger } = require('../utils/logger');

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fallbackQuery(question) {
  if (!question) {
    return '';
  }
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful support bot. Use provided QA context when possible.'
        },
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
