const express = require('express');
const { getAnswer } = require('./support');

const app = express();
app.use(express.json());

// POST /ask route to fetch answers based on the question provided
app.post('/ask', (req, res) => {
  const { question } = req.body;
  const answer = getAnswer(question);
  res.json({ answer });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
