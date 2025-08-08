const mustache = require('mustache');

function selectLocalizedQA(item, lang, fallback) {
  const translations = item.translations || {};
  const pick = (key) => {
    if (translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    if (fallback && translations[fallback] && translations[fallback][key]) {
      return translations[fallback][key];
    }
    return item[key];
  };
  return { questionText: pick('Question'), answerTemplate: pick('Answer') };
}

function validateVars(item, vars = {}) {
  const required = (item.variables || [])
    .filter((v) => v && v.required)
    .map((v) => v.name);
  const missing = required.filter((name) =>
    vars[name] === undefined || vars[name] === null || vars[name] === ''
  );
  return { ok: missing.length === 0, missing };
}

function renderAnswer(answerTemplate, vars = {}) {
  return mustache.render(answerTemplate, vars);
}

function sanitizeVars(vars = {}) {
  const sanitized = {};
  for (const [key, value] of Object.entries(vars)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      let v = value.trim().replace(/\s+/g, ' ');
      if (v.length > 500) v = v.slice(0, 500);
      sanitized[key] = v;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

module.exports = {
  selectLocalizedQA,
  validateVars,
  renderAnswer,
  sanitizeVars
};
