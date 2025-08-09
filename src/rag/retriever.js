const { searchChunks } = require('./index');

function retrieve(query, opts = {}) {
  const topK = opts.topK || Number(process.env.RAG_TOPK || '6');
  const diversify = opts.diversify === undefined ? process.env.RAG_DIVERSIFY_BY_SOURCE === '1' : opts.diversify;
  const maxChars = Number(process.env.RAG_MAX_CONTEXT_CHARS || '9000');
  const tenant = opts.tenant;
  return searchChunks(query, topK, tenant).then((items) => {
    if (diversify) {
      const perSource = {};
      const limited = [];
      for (const it of items) {
        perSource[it.sourceId] = perSource[it.sourceId] || 0;
        if (perSource[it.sourceId] < 2) {
          limited.push(it);
          perSource[it.sourceId] += 1;
        }
      }
      items = limited;
    }
    let contextText = '';
    const citations = [];
    for (const item of items) {
      if (contextText.length + item.text.length > maxChars) break;
      contextText += item.text + '\n\n';
      citations.push({
        key: citations.length + 1,
        sourceId: item.sourceId,
        title: item.title,
        snippet: item.text.slice(0, 200)
      });
    }
    return { contextText: contextText.trim(), citations, items };
  });
}

function formatCitations(citations, style = process.env.RAG_CITATIONS_STYLE || 'brackets') {
  return citations.map((c, i) => {
    if (style === 'inline') {
      return `(Source: ${c.title || c.sourceId})`;
    }
    return `[${i + 1}]`;
  });
}

module.exports = { retrieve, formatCitations };
