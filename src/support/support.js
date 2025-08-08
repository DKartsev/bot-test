const crypto = require('crypto');
const { fuzzySearch } = require('../search/fuzzySearch');
const { fallbackQuery } = require('../llm/fallback');
const { logger } = require('../utils/logger');
const store = require('../data/store');

const OPENAI_MODEL = 'gpt-3.5-turbo';

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
    let pendingId;
    if (process.env.AUTO_CACHE_OPENAI !== '0') {
      try {
        const requestHash = crypto
          .createHash('sha1')
          .update(`${question}\n${answer}`)
          .digest('hex');
        const pending = await store.addPending({
          Question: question,
          Answer: answer,
          source: 'openai',
          meta: { model: OPENAI_MODEL, requestHash }
        });
        pendingId = pending.id;
        logger.info({ id: pendingId }, 'Cached OpenAI answer as pending');
      } catch (err) {
        logger.error({ err }, 'Failed to cache OpenAI answer');
      }
    }
    return { answer, source: 'openai', method: 'openai', pendingId };
  } catch (error) {
    logger.error({ err: error }, 'Error in getAnswer');
    throw error;
  }
}

module.exports = { getAnswer };
