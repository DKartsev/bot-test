import OpenAI from 'openai';
import { logger } from '../../../utils/logger.js';
import type { RetrievalResult } from './retriever.js';
import { env } from '../../../config/env.js';

/**
 * Результат работы Answerer.
 */
export interface Answer {
  text: string;
  citations: RetrievalResult['citations'];
}

/**
 * Класс Answerer использует LLM (в данном случае, OpenAI) для генерации
 * ответа на основе вопроса и контекста, полученного от Retriever.
 */
export class Answerer {
  private client: OpenAI;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY не установлен; RAG-ответы будут отключены.');
      // Создаем "пустышку" клиента, чтобы избежать ошибок.
      // В реальном приложении можно использовать более сложную логику,
      // например, возвращать ошибку или использовать fallback-механизм.
      this.client = {
        chat: {
          completions: {
            create: () => Promise.reject(new Error('No API Key')),
          },
        },
      } as unknown as OpenAI;
    } else {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  /**
   * Генерирует ответ с помощью LLM.
   * @param question - Исходный вопрос пользователя.
   * @param retrievalResult - Результат работы Retriever (контекст и цитаты).
   * @param lang - Язык ответа.
   */
  async answer(
    question: string,
    retrievalResult: RetrievalResult,
    lang: string = 'ru',
  ): Promise<Answer> {
    const { contextText, citations } = retrievalResult;

    const systemPrompt =
      'Ты — бот поддержки. Отвечай кратко и по делу, используя предоставленный контекст. Если в контексте нет ответа, прямо скажи об этом. В конце ответа обязательно добавь ссылки на источники в формате [1], [2]...';

    const sourceList = (citations || [])
      .map((c) => `${c.key}. ${c.title || c.sourceId}`)
      .join('\n');

    const userPrompt = `Вопрос: ${question}\n\nКонтекст:\n---\n${contextText}\n---\nИсточники:\n${sourceList}\n\nОтвет (на ${lang} языке):`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // TODO: Сделать настраиваемым через env
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2, // TODO: Сделать настраиваемым через env
        max_tokens: 1000,
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      return { text, citations };
    } catch (err) {
      logger.error({ err }, 'Ошибка при генерации RAG-ответа от OpenAI');
      // В случае ошибки возвращаем заглушку, а не падаем
      return {
        text: 'К сожалению, не удалось сгенерировать ответ. Попробуйте позже.',
        citations: [],
      };
    }
  }
}
