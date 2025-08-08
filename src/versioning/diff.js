const { diffWords } = require('diff');
const deepEqual = require('fast-deep-equal');

// Produce text diff parts between two strings
function diffText(oldStr, newStr) {
  const a = oldStr || '';
  const b = newStr || '';
  return diffWords(a, b);
}

// Diff two items by fields
function diffItem(oldItem, newItem) {
  return {
    id: newItem.id,
    Question: diffText(oldItem.Question, newItem.Question),
    Answer: diffText(oldItem.Answer, newItem.Answer),
    status: {
      from: oldItem.status,
      to: newItem.status,
      changed: oldItem.status !== newItem.status
    },
    source: {
      from: oldItem.source || null,
      to: newItem.source || null,
      changed: (oldItem.source || null) !== (newItem.source || null)
    },
    metaChanged: !deepEqual(oldItem.meta || {}, newItem.meta || {})
  };
}

// Compare two datasets (arrays of items)
function diffDatasets(prevArray, currArray) {
  const prevMap = new Map(prevArray.map((i) => [i.id, i]));
  const currMap = new Map(currArray.map((i) => [i.id, i]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const id of currMap.keys()) {
    if (!prevMap.has(id)) added.push(id);
  }
  for (const id of prevMap.keys()) {
    if (!currMap.has(id)) removed.push(id);
  }
  for (const id of currMap.keys()) {
    if (prevMap.has(id)) {
      const a = prevMap.get(id);
      const b = currMap.get(id);
      const fieldsChanged = {
        Question: a.Question !== b.Question,
        Answer: a.Answer !== b.Answer,
        status: a.status !== b.status,
        source: (a.source || null) !== (b.source || null),
        meta: !deepEqual(a.meta || {}, b.meta || {})
      };
      if (Object.values(fieldsChanged).some(Boolean)) {
        changed.push({ id, fieldsChanged });
      }
    }
  }

  return { added, removed, changed };
}

module.exports = { diffText, diffItem, diffDatasets };
