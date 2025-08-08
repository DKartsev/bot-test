const { fuzzySearch } = require('../search/fuzzySearch');
const { fallbackQuery } = require('../llm/fallback');
const logger = require('../utils/logger');

async function getAnswer(question) {
  if (!question) {
    return { answer: null, source: 'local' };
  }
  try {
    const results = fuzzySearch(question);
    const exact = results.find((r) => r.score === 0);
    if (exact) {
      return { answer: exact.item.Answer, source: 'local' };
    }
    const best = results.find((r) => r.score <= 0.4);
    if (best) {
      return { answer: best.item.Answer, source: 'local' };
    }
    const answer = await fallbackQuery(question);
    return { answer, source: 'openai' };
  } catch (error) {
    logger.error('Error in getAnswer', error);
    throw error;
  }
}

module.exports = { getAnswer };
