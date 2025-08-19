import OpenAI from 'openai';

import { env } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

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
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async answer(
    question: string,
    context: string,
    lang: string = 'ru',
  ): Promise<{ text: string; citations: Array<{ sourceId?: string; title?: string; snippet: string }> }> {
    try {
      const systemPrompt = `You are a helpful AI assistant. Answer the question based on the provided context. 
      
Context: ${context}

Question: ${question}

Please provide a clear, concise answer in ${lang}. If the context doesn't contain enough information to answer the question, say so politely.

Return your response in the following JSON format:
{
  "answer": "your answer here",
  "citations": [
    {
      "sourceId": "source_id_if_available",
      "title": "source_title_if_available", 
      "snippet": "relevant_text_snippet"
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Please answer the question based on the context.' },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content ?? '';
      const result = JSON.parse(content) as { answer: string; citations: Array<{ sourceId?: string; title?: string; snippet: string }> };

      logger.info(
        { questionLength: question.length, contextLength: context.length, citationsCount: result.citations.length },
        'Answer generated successfully',
      );

      return {
        text: result.answer,
        citations: result.citations ?? [],
      };
    } catch (error) {
      logger.error({ error }, 'Failed to generate answer');
      return {
        text: 'Извините, произошла ошибка при генерации ответа. Пожалуйста, попробуйте еще раз.',
        citations: [],
      };
    }
  }
}
