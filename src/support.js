const fs = require('fs');
const path = require('path');

// Path to the JSON file with question/answer pairs
const qaFilePath = path.join(__dirname, '..', 'data', 'qa_pairs.json');

// Load and parse the JSON data once when this module is required
let qaPairs = [];
try {
  const rawData = fs.readFileSync(qaFilePath, 'utf-8');
  qaPairs = JSON.parse(rawData);
} catch (error) {
  // If file reading or JSON parsing fails, log the error and keep an empty dataset
  console.error('Error loading QA pairs:', error);
}

/**
 * Returns the answer for a given question.
 * @param {string} question - The exact question to search for in the dataset.
 * @returns {string} - The answer if found, otherwise a default message.
 */
function getAnswer(question) {
  const match = qaPairs.find((item) => item.Question === question);
  return match ? match.Answer : 'Извините, я пока не знаю ответа на этот вопрос.';
}

module.exports = {
  getAnswer,
};
