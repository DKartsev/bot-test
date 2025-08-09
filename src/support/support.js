const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { fuzzySearch } = require('../search/fuzzySearch');
const { fallbackQuery } = require('../llm/fallback');
const { logger } = require('../utils/logger');
const store = require('../data/store');
const metrics = require('../utils/metrics');
const { detectLang } = require('../i18n/detect');
const {
  selectLocalizedQA,
  validateVars,
  renderAnswer,
  sanitizeVars
} = require('../i18n/renderer');
const { liveBus } = require('../live/bus');

const SEM_ENABLED = process.env.SEM_ENABLED === '1';
let searchSemantic;
let hybridRank;
let MIN_SIM;
if (SEM_ENABLED) {
  ({ searchSemantic } = require('../semantic/index'));
  ({ hybridRank, MIN_SIM } = require('../semantic/rerank'));
}

const OPENAI_MODEL = 'gpt-3.5-turbo';
const DEFAULT_LANG = process.env.DEFAULT_LANG || 'en';
const SUPPORTED_LANGS = (process.env.SUPPORTED_LANGS || 'en')
  .split(',')
  .map((l) => l.trim().toLowerCase())
  .filter(Boolean);
const TOPK = Number(process.env.SEM_TOPK || '5');

async function getAnswer(question, opts = {}) {
  const { lang: explicitLang, vars, acceptLanguageHeader } = opts || {};
  const lang = detectLang({
    explicitLang,
    acceptLanguageHeader,
    supported: SUPPORTED_LANGS,
    fallback: DEFAULT_LANG
  });
  const responseId = uuidv4();
  let result = { responseId, answer: null, source: 'local', method: 'exact', lang };
  if (!question) {
    liveBus.emit('ask', {
      ts: new Date().toISOString(),
      responseId,
      question,
      lang,
      source: result.source,
      method: result.method
    });
    return result;
  }
  try {
    const fuzzyTop = fuzzySearch(question, TOPK);
    const bestExact = fuzzyTop[0];
    if (bestExact && bestExact.score === 0) {
      const { questionText, answerTemplate } = selectLocalizedQA(
        bestExact.item,
        lang,
        DEFAULT_LANG
      );
      const check = validateVars(bestExact.item, vars || {});
      if (!check.ok) {
        const list = check.missing.join(', ');
        const msg = `Чтобы я дал точный ответ, уточните, пожалуйста: ${list} 🙌`;
        result = {
          responseId,
          answer: msg,
          source: 'local',
          method: 'exact',
          lang,
          matchedQuestion: questionText,
          score: bestExact.score,
          itemId: bestExact.item.id,
          needVars: check.missing
        };
      } else {
        const safeVars = sanitizeVars(vars || {});
        const rendered = renderAnswer(answerTemplate, safeVars);
        result = {
          responseId,
          answer: rendered,
          source: 'local',
          method: 'exact',
          lang,
          matchedQuestion: questionText,
          score: bestExact.score,
          itemId: bestExact.item.id,
          variablesUsed: Object.keys(safeVars)
        };
      }
      return result;
    }

    if (SEM_ENABLED) {
      const semTop = await searchSemantic(question, TOPK);
      const ranked = hybridRank({ query: question, fuzzyResults: fuzzyTop, semResults: semTop });
      const candidate = ranked[0];
      if (candidate) {
        const accept = candidate.sem_sim >= MIN_SIM || candidate.fuzzy_score <= 0.2;
        metrics.recordSemantic({ accepted: accept });
        if (accept && candidate.item) {
          const method = candidate.sem_sim >= MIN_SIM ? 'semantic' : 'fuzzy';
          const { questionText, answerTemplate } = selectLocalizedQA(
            candidate.item,
            lang,
            DEFAULT_LANG
          );
          const check = validateVars(candidate.item, vars || {});
          if (!check.ok) {
            const list = check.missing.join(', ');
            const msg = `Чтобы я дал точный ответ, уточните, пожалуйста: ${list} 🙌`;
            result = {
              responseId,
              answer: msg,
              source: 'local',
              method,
              rankMethod: 'hybrid',
              lang,
              matchedQuestion: questionText,
              score: candidate.fuzzy_score,
              semSim: candidate.sem_sim,
              combinedScore: candidate.combined,
              itemId: candidate.item.id,
              needVars: check.missing
            };
          } else {
            const safeVars = sanitizeVars(vars || {});
            const rendered = renderAnswer(answerTemplate, safeVars);
            result = {
              responseId,
              answer: rendered,
              source: 'local',
              method,
              rankMethod: 'hybrid',
              lang,
              matchedQuestion: questionText,
              score: candidate.fuzzy_score,
              semSim: candidate.sem_sim,
              combinedScore: candidate.combined,
              itemId: candidate.item.id,
              variablesUsed: Object.keys(safeVars)
            };
          }
          return result;
        }
      } else {
        metrics.recordSemantic({ accepted: false });
      }
    } else {
      const best = fuzzyTop[0];
      if (best && best.score <= 0.4) {
        const method = 'fuzzy';
        const { questionText, answerTemplate } = selectLocalizedQA(
          best.item,
          lang,
          DEFAULT_LANG
        );
        const check = validateVars(best.item, vars || {});
        if (!check.ok) {
          const list = check.missing.join(', ');
          const msg = `Чтобы я дал точный ответ, уточните, пожалуйста: ${list} 🙌`;
          result = {
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
        } else {
          const safeVars = sanitizeVars(vars || {});
          const rendered = renderAnswer(answerTemplate, safeVars);
          result = {
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
        return result;
      }
    }

    // Fallback to OpenAI
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
    result = { responseId, answer, source: 'openai', method: 'openai', pendingId, lang };
    return result;
  } catch (error) {
    logger.error({ err: error }, 'Error in getAnswer');
    throw error;
  } finally {
    liveBus.emit('ask', {
      ts: new Date().toISOString(),
      responseId,
      question,
      lang,
      source: result.source,
      method: result.method,
      rankMethod: result.rankMethod,
      itemId: result.itemId,
      pendingId: result.pendingId,
      matchedQuestion: result.matchedQuestion,
      score: result.score,
      semSim: result.semSim,
      combinedScore: result.combinedScore,
      answer: result.answer
    });
  }
}

module.exports = { getAnswer };
