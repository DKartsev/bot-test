import path from 'path';
import { promises as fs } from 'fs';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

// Import the RAG pipeline components
import { OpenAIEmbedder } from './rag/embedder.js';
import { VectorStore } from './rag/vector-store.js';
import { Retriever } from './rag/retriever.js';
import { Answerer } from './rag/answerer.js';
import { FuzzySearch } from './fuzzy-search.js';
// Define a standard format for QA data
interface QAItem {
  id: string;
  Question: string;
  Answer: string;
}

interface QAResponse {
  answer: string;
  source: string;
  citations?: { id: string }[];
}

/**
 * QAService (Question Answering Service)
 *
 * This class orchestrates the entire process of answering a user's question.
 * It combines fuzzy search, vector search, and a final answer generation step with an LLM.
 * Это основной сервис, который управляет всем процессом ответа на вопрос.
 */
export class QAService {
  private embedder: OpenAIEmbedder;
  private vectorStore: VectorStore;
  private retriever: Retriever;
  private answerer: Answerer;
  private fuzzySearch?: FuzzySearch;
  private isInitialized = false;

  constructor() {
    this.embedder = new OpenAIEmbedder();
    // TODO: The store path should be tenant-specific in a multi-tenant setup.
    const storePath = path.join(process.cwd(), 'data', 'default-tenant', 'rag');
    this.vectorStore = new VectorStore(storePath, this.embedder);
    this.retriever = new Retriever(this.vectorStore);
    this.answerer = new Answerer();
  }

  /**
   * Initializes all the components of the service.
   * Загружает данные для нечеткого поиска и инициализирует векторное хранилище.
   */
  async init() {
    if (this.isInitialized) return;
    logger.info('🤖 Инициализация QAService...');

    const faqData = await this.loadFaqData();
    this.fuzzySearch = new FuzzySearch(faqData);
    logger.info(
      `🔍 FuzzySearch инициализирован с ${this.fuzzySearch.getSize()} элементами.`,
    );

    await this.vectorStore.init();

    this.isInitialized = true;
    logger.info('✅ QAService успешно инициализирован.');
  }

  /**
   * The main method to ask a question.
   * Основной метод для обработки вопроса пользователя.
   */
  async ask(question: string, lang: string = 'ru'): Promise<QAResponse> {
    if (!this.isInitialized || !this.fuzzySearch) {
      throw new Error('QAService is not initialized.');
    }

    // 1. Perform fuzzy and vector searches in parallel
    const [fuzzyResults] = await Promise.all([
      this.fuzzySearch.search(question, 10),
      this.vectorStore.search(question, 10),
    ]);

    // 2. Combine results using hybrid ranking
    // TODO: The vector results need to be mapped to QAItem IDs.
    // For now, we'll just use the fuzzy results. This will be fixed later.
    // const rankedCandidates = hybridRank(fuzzyResults, vectorResults);

    // For now, just use the top fuzzy result if it's good enough
    const topFuzzy = fuzzyResults[0];
    if (topFuzzy && topFuzzy.score < 0.1) {
      // 0.1 is a good threshold for a direct answer
      logger.info(
        { question, match: topFuzzy.item.Question },
        '✅ Найдено точное совпадение по FAQ.',
      );
      return { answer: topFuzzy.item.Answer, source: 'faq-exact' };
    }

    // 3. Use the retriever to get context from the top vector search results
    const retrievalResult = await this.retriever.retrieve(question, {
      topK: 5,
    });
    if (!retrievalResult.contextText.trim()) {
      logger.warn(
        { question },
        '⚠️ Не удалось найти релевантный контекст в базе знаний.',
      );
      return {
        answer:
          'К сожалению, я не нашел ответа в своей базе знаний. Попробуйте переформулировать вопрос.',
        source: 'no-context',
      };
    }

    // 4. Use the answerer to generate a final response from the context
    logger.info({ question }, '🤖 Генерация ответа с помощью LLM...');
    const finalAnswer = await this.answerer.answer(
      question,
      retrievalResult,
      lang,
    );

    const citations = finalAnswer.citations
      ?.map((c) => (c.sourceId ? { id: c.sourceId } : null))
      .filter((c): c is { id: string } => c !== null);

    return {
      answer: finalAnswer.text,
      citations,
      source: 'rag',
    };
  }

  /**
   * Loads the FAQ data from the JSON file specified in the environment.
   * Загружает данные FAQ из JSON-файла.
   */
  private async loadFaqData(): Promise<QAItem[]> {
    try {
      const filePath = path.resolve(env.FAQ_PATH);
      const fileContent = await fs.readFile(filePath, 'utf8');
      // The file is an array of objects with "q" and "a" properties.
      const data = JSON.parse(fileContent) as { q: string; a: string }[];
      return data.map((item, index) => ({
        id: `faq-${index}`,
        Question: item.q,
        Answer: item.a,
      }));
    } catch (err) {
      logger.error(
        { err, path: env.FAQ_PATH },
        '❌ Не удалось загрузить или прочитать FAQ-файл.',
      );
      // Return an empty array if the file doesn't exist or is invalid
      return [];
    }
  }
}
