const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const tableName = process.env.AIRTABLE_TABLE_NAME || 'QA';

let base;
function getBase() {
  if (!base) {
    base = new Airtable({ apiKey }).base(baseId);
  }
  return base;
}

async function fetchAll() {
  const b = getBase();
  const records = await b(tableName).select().all();
  return records.map((rec) => ({
    id: rec.get('id') || rec.id,
    Question: rec.get('Question'),
    Answer: rec.get('Answer'),
    status: rec.get('status'),
    source: rec.get('source'),
    createdAt: rec.get('createdAt'),
    updatedAt: rec.get('updatedAt'),
    meta: rec.get('meta')
  }));
}

async function pushChanges({ upserts = [], deletes = [] }) {
  const b = getBase();
  const existing = await b(tableName).select().all();
  const idMap = new Map();
  existing.forEach((rec) => {
    const id = rec.get('id') || rec.id;
    idMap.set(id, rec.id);
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const row of upserts) {
    const recordId = idMap.get(row.id);
    const fields = { ...row, meta: row.meta };
    if (recordId) {
      await b(tableName).update(recordId, fields);
    } else {
      await b(tableName).create(fields);
    }
    await sleep(100);
  }

  if (process.env.SYNC_BIDIRECTIONAL === '1' && process.env.SYNC_ALLOW_DELETES === '1') {
    for (const id of deletes) {
      const recordId = idMap.get(id);
      if (!recordId) continue;
      await b(tableName).destroy(recordId);
      await sleep(100);
    }
  }
}

module.exports = { fetchAll, pushChanges };
