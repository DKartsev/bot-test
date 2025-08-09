const { randomUUID } = require('crypto');

function normalizeText(text) {
  return text
    .replace(/\r/g, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{2,}/g, '\n\n')
    .trim();
}

function chunkText(text, opts = {}) {
  const size = Number(opts.size || process.env.RAG_CHUNK_SIZE || 1200);
  const overlap = Number(opts.overlap || process.env.RAG_CHUNK_OVERLAP || 200);
  const title = opts.title;
  const headings = opts.headings;
  const norm = normalizeText(text);
  const chunks = [];
  let start = 0;
  const total = norm.length;
  while (start < total) {
    let end = Math.min(total, start + size);
    if (end < total) {
      const nl = norm.lastIndexOf('\n', end);
      if (nl > start + size * 0.5) end = nl;
    }
    const chunkText = norm.slice(start, end).trim();
    if (chunkText) {
      chunks.push({
        id: randomUUID().replace(/-/g, ''),
        text: chunkText,
        start,
        end,
        title,
        headings
      });
    }
    if (end >= total) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}

module.exports = { chunkText };
