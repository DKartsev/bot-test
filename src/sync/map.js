const { v4: uuidv4 } = require('uuid');

function normalizeString(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function parseMeta(metaField) {
  if (typeof metaField === 'string') {
    try {
      return JSON.parse(metaField);
    } catch (e) {
      return { raw: metaField };
    }
  }
  if (metaField && typeof metaField === 'object') {
    return metaField;
  }
  return {};
}

function toLocalItem(row) {
  const now = new Date().toISOString();
  const item = {
    id: row.id ? String(row.id) : uuidv4(),
    Question: normalizeString(row.Question),
    Answer: normalizeString(row.Answer),
    status: ['approved', 'pending', 'rejected'].includes(row.status)
      ? row.status
      : 'approved',
    source: row.source ? String(row.source) : undefined,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : now,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : now,
    meta: parseMeta(row.meta)
  };
  if (!item.Question || !item.Answer) {
    throw new Error('Invalid Question or Answer');
  }
  return item;
}

function toProviderRow(item) {
  return {
    id: item.id,
    Question: normalizeString(item.Question),
    Answer: normalizeString(item.Answer),
    status: item.status,
    source: item.source,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    meta: JSON.stringify(item.meta || {})
  };
}

module.exports = {
  normalizeString,
  parseMeta,
  toLocalItem,
  toProviderRow
};
