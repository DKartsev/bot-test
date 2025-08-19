import path from 'path';
import { promises as fs } from 'fs';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ragAnswer } from '../pipeline/ragAnswer.js';
import { findExact } from '../../faq/store.js';
import { findFuzzy } from '../../faq/fuzzy.js';

interface FAQItem {
  q: string;
  a: string;
}

interface KBDoc {
  id: string;
  title: string;
  content: string;
}

export class QAService {
  private faqData: FAQItem[] = [];
  private kbData: KBDoc[] = [];

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.loadFAQ();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.loadKB();
  }

  private async loadFAQ() {
    try {
      const faqPath = path.join(process.cwd(), 'data', 'qa', 'faq.json');
      const data = await fs.readFile(faqPath, 'utf8');
      this.faqData = JSON.parse(data);
      logger.info({ count: this.faqData.length }, 'FAQ data loaded');
    } catch (error) {
      logger.warn({ error }, 'Failed to load FAQ data');
      this.faqData = [];
    }
  }

  private async loadKB() {
    try {
      const kbPath = path.join(process.cwd(), env.KB_DIR);
      const files = await fs.readdir(kbPath);
      const markdownFiles = files.filter((file) => file.endsWith('.md'));

      for (const file of markdownFiles) {
        const content = await fs.readFile(path.join(kbPath, file), 'utf8');
        this.kbData.push({
          id: file.replace('.md', ''),
          title: file.replace('.md', ''),
          content: content,
        });
      }

      logger.info({ count: this.kbData.length }, 'KB data loaded');
    } catch (error) {
      logger.warn({ error }, 'Failed to load KB data');
      this.kbData = [];
    }
  }

  async answerQuestion(
    question: string,
    lang: string = 'ru',
    logger: FastifyBaseLogger,
    pg: FastifyInstance['pg'],
  ): Promise<{
    answer: string;
    confidence: number;
    escalate: boolean;
    citations: Array<{ id: string }>;
  }> {
    // Try RAG first
    try {
      const ragResult = await ragAnswer({
        text: question,
        lang,
        logger,
        pg,
      });

      if (ragResult.confidence > 0.7) {
        return ragResult;
      }
    } catch (error) {
      logger.warn({ error }, 'RAG failed, falling back to FAQ');
    }

    // Fallback to FAQ
    const exactMatch = findExact(question);
    if (exactMatch) {
      return {
        answer: exactMatch.a,
        confidence: 1,
        escalate: false,
        citations: [],
      };
    }

    const fuzzyMatch = findFuzzy(question);
    if (fuzzyMatch && typeof fuzzyMatch === 'object' && 'hit' in fuzzyMatch && fuzzyMatch.hit) {
      return {
        answer: fuzzyMatch.hit.a,
        confidence: 0.8,
        escalate: false,
        citations: [],
      };
    }

    // Final fallback
    return {
      answer: 'Извините, я не могу найти ответ на ваш вопрос. Пожалуйста, обратитесь к оператору поддержки.',
      confidence: 0,
      escalate: true,
      citations: [],
    };
  }

  async searchFAQ(query: string): Promise<FAQItem[]> {
    const results = this.faqData.filter((item) => {
      const question = item.q?.toLowerCase() ?? '';
      const answer = item.a?.toLowerCase() ?? '';
      const queryLower = query.toLowerCase();

      return question.includes(queryLower) || answer.includes(queryLower);
    });

    return results.slice(0, 5);
  }

  async searchKB(query: string): Promise<KBDoc[]> {
    const results = this.kbData.filter((item) => {
      const title = item.title?.toLowerCase() ?? '';
      const content = item.content?.toLowerCase() ?? '';
      const queryLower = query.toLowerCase();

      return title.includes(queryLower) || content.includes(queryLower);
    });

    return results.slice(0, 3);
  }
}
