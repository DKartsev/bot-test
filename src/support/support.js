const { fuzzySearch } = require('../search/fuzzySearch');

function getAnswer(question) {
  if (!question) {
    return null;
  }
  const results = fuzzySearch(question);
  const exact = results.find((r) => r.score === 0);
  if (exact) {
    return exact.item.Answer;
  }
  const best = results.find((r) => r.score <= 0.4);
  return best ? best.item.Answer : null;
}

module.exports = { getAnswer };
