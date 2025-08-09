const alpha = Number(process.env.SEM_ALPHA || '0.7');
const MIN_SIM = Number(process.env.SEM_MIN_SIM || '0.6');

function hybridRank({ query, fuzzyResults = [], semResults = [], alpha: a = alpha }) {
  const candidates = new Map();

  for (const { item, score } of fuzzyResults) {
    if (!item || !item.id) continue;
    const entry = candidates.get(item.id) || { item };
    entry.fuzzy_score = typeof score === 'number' ? score : 1;
    candidates.set(item.id, entry);
  }

  for (const { id, sim } of semResults) {
    const entry = candidates.get(id) || { item: null };
    entry.sem_sim = sim;
    entry.sem_score = typeof sim === 'number' ? 1 - sim : 1;
    if (!entry.item) entry.item = { id };
    candidates.set(id, entry);
  }

  const arr = [];
  for (const entry of candidates.values()) {
    const fs = entry.fuzzy_score !== undefined ? entry.fuzzy_score : 1;
    const ss = entry.sem_score !== undefined ? entry.sem_score : 1;
    entry.combined = a * ss + (1 - a) * fs;
    arr.push(entry);
  }
  arr.sort((a, b) => a.combined - b.combined);
  return arr;
}

module.exports = { hybridRank, MIN_SIM };
