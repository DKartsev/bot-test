const { maskEmail, maskPhone } = require('./patterns');

function maskGeneric(str, partial) {
  if (!partial) return '*'.repeat(str.length);
  if (str.length <= 4) return '*'.repeat(str.length);
  return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
}

function applyMask(value, key, partial) {
  if (key === 'email') return maskEmail(value);
  if (key === 'phone') return maskPhone(value);
  return maskGeneric(value, partial);
}

function redact(text, detections, opts = {}) {
  const { style = 'tag', partialMask = true } = opts;
  if (!detections || !detections.length) return text;
  const arr = [...detections].sort((a, b) => a.span[0] - b.span[0]);
  let offset = 0;
  let result = text;
  for (const det of arr) {
    const start = det.span[0] + offset;
    const end = det.span[1] + offset;
    const original = result.slice(start, end);
    let replacement;
    if (style === 'mask') {
      replacement = applyMask(original, det.key, partialMask);
    } else {
      replacement = `[${det.type.toUpperCase()}:${det.key.toUpperCase()}]`;
    }
    result = result.slice(0, start) + replacement + result.slice(end);
    offset += replacement.length - (end - start);
  }
  return result;
}

module.exports = { redact };
