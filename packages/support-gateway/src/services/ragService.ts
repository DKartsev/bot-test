import logger from '../utils/logger';

// Import repository RAG utilities (commonjs modules)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { retrieve } = require('../../../../src/rag/retriever');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { answerWithRag } = require('../../../../src/rag/answerer');

export async function generateResponse(message: string): Promise<string> {
  try {
    // Retrieve relevant context for the incoming message
    const { contextText, citations } = await retrieve(message);
    if (!contextText) {
      logger.warn({ message }, 'No context found for RAG query');
    }

    // Ask OpenAI for an answer using the retrieved context
    const { answer } = await answerWithRag({
      question: message,
      contextText,
      citations
    });

    logger.debug({ message, answer }, 'Generated RAG response');
    return answer;
  } catch (err) {
    logger.error({ err }, 'RAG service error');
    throw err;
  }
}
