const parser = require('accept-language-parser');

function detectLang({ explicitLang, acceptLanguageHeader, supported = [], fallback }) {
  const supportedLower = supported.map((l) => l.toLowerCase());
  if (explicitLang) {
    const e = explicitLang.toLowerCase();
    if (supportedLower.includes(e)) return e;
  }
  if (acceptLanguageHeader) {
    const picked = parser.pick(supportedLower, acceptLanguageHeader);
    if (picked) return picked;
  }
  return fallback;
}

module.exports = { detectLang };
