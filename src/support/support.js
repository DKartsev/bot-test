const { fuzzySearch } = require('../search/fuzzySearch');
const { fallbackQuery } = require('../llm/fallback');
const { logger } = require('../utils/logger');

async function getAnswer(question) {
  if (!question) {
    return { answer: null, source: 'local', method: 'exact' };
  }
  try {
    const [best] = fuzzySearch(question, 1);
    if (best && best.score === 0) {
      return {
        answer: best.item.Answer,
        source: 'local',
        method: 'exact',
        matchedQuestion: best.item.Question,
        score: best.score
      };
    }
    if (best && best.score <= 0.4) {
      return {
        answer: best.item.Answer,
        source: 'local',
        method: 'fuzzy',
        matchedQuestion: best.item.Question,
        score: best.score
      };
    }
    const answer = await fallbackQuery(question);
    return { answer, source: 'openai', method: 'openai' };
  } catch (error) {
    logger.error({ err: error }, 'Error in getAnswer');
    throw error;
  }
}

module.exports = { getAnswer };
