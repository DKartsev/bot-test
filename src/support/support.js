const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { fuzzySearch } = require('../search/fuzzySearch');
const { fallbackQuery } = require('../llm/fallback');
const { logger } = require('../utils/logger');
const store = require('../data/store');
const { detectLang } = require('../i18n/detect');
const {
  selectLocalizedQA,
  validateVars,
  renderAnswer,
  sanitizeVars
} = require('../i18n/renderer');

const OPENAI_MODEL = 'gpt-3.5-turbo';
const DEFAULT_LANG = process.env.DEFAULT_LANG || 'en';
const SUPPORTED_LANGS = (process.env.SUPPORTED_LANGS || 'en')
  .split(',')
  .map((l) => l.trim().toLowerCase())
  .filter(Boolean);

async function getAnswer(question, opts = {}) {
  const { lang: explicitLang, vars, acceptLanguageHeader } = opts || {};
  const lang = detectLang({
    explicitLang,
    acceptLanguageHeader,
    supported: SUPPORTED_LANGS,
    fallback: DEFAULT_LANG
  });
  const responseId = uuidv4();
  if (!question) {
    return { responseId, answer: null, source: 'local', method: 'exact', lang };
  }
  try {
    const [best] = fuzzySearch(question, 1);
    if (best && best.score <= 0.4) {
      const method = best.score === 0 ? 'exact' : 'fuzzy';
      const { questionText, answerTemplate } = selectLocalizedQA(best.item, lang, DEFAULT_LANG);
      const check = validateVars(best.item, vars || {});
      if (!check.ok) {
        const list = check.missing.join(', ');
        const msg = `Чтобы я дал точный ответ, уточните, пожалуйста: ${list} 🙌`;
        return {
          responseId,
          answer: msg,
          source: 'local',
          method,
          lang,
          matchedQuestion: questionText,
          score: best.score,
          itemId: best.item.id,
          needVars: check.missing
        };
      }
      const safeVars = sanitizeVars(vars || {});
      const rendered = renderAnswer(answerTemplate, safeVars);
      return {
        responseId,
        answer: rendered,
        source: 'local',
        method,
        lang,
        matchedQuestion: questionText,
        score: best.score,
        itemId: best.item.id,
        variablesUsed: Object.keys(safeVars)
      };
    }
    const answer = await fallbackQuery(question, lang);
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
    return { responseId, answer, source: 'openai', method: 'openai', pendingId, lang };
  } catch (error) {
    logger.error({ err: error }, 'Error in getAnswer');
    throw error;
  }
}

module.exports = { getAnswer };
