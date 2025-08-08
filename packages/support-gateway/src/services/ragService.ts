import logger from '../utils/logger';

export async function generateResponse(message: string): Promise<string> {
  try {
    // TODO: implement RAG logic
    return `Echo: ${message}`;
  } catch (err) {
    logger.error({ err }, 'RAG service error');
    throw err;
  }
}
