const crypto = require('crypto');

function luhnValid(number) {
  const digits = (number || '').replace(/\D+/g, '').split('').reverse();
  if (!digits.length) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = parseInt(digits[i], 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function ibanValid(text) {
  const s = (text || '').replace(/\s+/g, '').toUpperCase();
  const rearranged = s.slice(4) + s.slice(0, 4);
  const expanded = rearranged
    .split('')
    .map((ch) => (ch >= 'A' && ch <= 'Z' ? ch.charCodeAt(0) - 55 : ch))
    .join('');
  let remainder = 0;
  for (let i = 0; i < expanded.length; i += 6) {
    const part = remainder + expanded.substr(i, 6);
    remainder = parseInt(part, 10) % 97;
  }
  return remainder === 1;
}

function maskEmail(str) {
  const [user, domain] = str.split('@');
  if (!user || !domain) return '***';
  return `${user[0]}***@${domain[0]}***${domain.includes('.') ? domain.slice(domain.indexOf('.')) : ''}`;
}

function maskPhone(str) {
  const digits = str.replace(/\D+/g, '');
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return digits.slice(0, 2) + '*'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-2);
}

function compileRegex(p) {
  const src = p.regex;
  const flags = src.startsWith('(?i)') ? 'gi' : 'g';
  const body = src.replace('(?i)', '');
  return new RegExp(body, flags);
}

function detectAll(text, policies) {
  const detections = [];
  const allowEmails = new Set([...(policies.allow?.email_domains || []), ...(process.env.DLP_ALLOW_EMAIL_DOMAINS || '').split(',').map((d) => d.trim()).filter(Boolean)]);
  const allowBins = policies.allow?.test_cards_bin || [];
  const allowTestCards = process.env.DLP_ALLOW_TEST_CARDS === '1';
  const normalizedText = text || '';
  ['pii', 'secrets', 'profanity'].forEach((type) => {
    const rules = policies[type] || {};
    Object.entries(rules).forEach(([key, rule]) => {
      if (!rule.regex) return;
      const regex = rule._regex || (rule._regex = compileRegex(rule));
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(normalizedText))) {
        const value = m[0];
        const span = [m.index, m.index + value.length];
        if (type === 'pii' && key === 'email' && allowEmails.size) {
          const domain = value.split('@')[1]?.toLowerCase();
          if (domain && allowEmails.has(domain)) continue;
        }
        if (type === 'pii' && key === 'credit_card') {
          const digits = value.replace(/\D+/g, '');
          if (!luhnValid(digits)) continue;
          if (allowTestCards && allowBins.some((bin) => digits.startsWith(bin))) continue;
        }
        if (type === 'pii' && key === 'iban') {
          const clean = value.replace(/\s+/g, '');
          if (!ibanValid(clean)) continue;
        }
        detections.push({ type, key, value, span, severity: rule.severity || 'low', rule });
      }
    });
  });
  return detections;
}

module.exports = {
  luhnValid,
  ibanValid,
  maskEmail,
  maskPhone,
  detectAll
};
