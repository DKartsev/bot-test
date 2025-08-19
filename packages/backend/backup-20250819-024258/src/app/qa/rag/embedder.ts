import OpenAI from 'openai';
// Runtime type guards to avoid unsafe casts
function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'number');
}

function isEmbeddingItems(value: unknown): value is Array<{ embedding: number[] }> {
  return Array.isArray(value) && value.every((item) =>
    item !== null && typeof item === 'object' && isNumberArray((item as { embedding?: unknown }).embedding),
  );
}
import { logger } from '../../../utils/logger.js';
import { env } from '../../../config/env.js';
import type { Embedder } from './vector-store.js';

// Определяем модель и размерность вектора для OpenAI
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENAI_EMBEDDING_DIMENSION = 1536;

/**
 * Реализация Embedder с использованием OpenAI API.
 * Отвечает за превращение текста в числовые векторы.
 */
export class OpenAIEmbedder implements Embedder {
  private client: OpenAI;
  private dimension: number;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY не установлен. Embedder не может быть инициализирован.',
      );
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.dimension = OPENAI_EMBEDDING_DIMENSION;
    logger.info(
      { model: OPENAI_EMBEDDING_MODEL },
      '🧠 Инициализирован OpenAI Embedder.',
    );
  }

  getDimension(): number {
    return this.dimension;
  }

  /**
   * Превращает массив текстов в массив векторов.
   * @param texts - Массив строк для векторизации.
   * @returns Промис, который разрешается в массив векторов.
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // OpenAI API может выбрасывать ошибку, если на вход подан пустой текст.
    // Заменяем пустые строки на пробел, чтобы избежать этого.
    const sanitizedTexts = texts.map((t) =>
      (t || '').trim().replace(/\n/g, ' '),
    );

    try {
      const response = await this.client.embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input: sanitizedTexts,
      });

      // Нормализуем векторы для использования с косинусным расстоянием
      const raw: unknown = response.data;
      if (!isEmbeddingItems(raw)) {
        throw new Error('Invalid embeddings format from OpenAI');
      }
      const items = raw as Array<{ embedding: number[] }>; // safe after guard
      const normalized: number[][] = [];
      for (const item of items) {
        normalized.push(this.normalize(item.embedding));
      }
      return normalized;
    } catch (err) {
      logger.error({ err }, '❌ Ошибка при создании векторов с помощью OpenAI');
      // Возвращаем пустые векторы для текстов, которые не удалось обработать
      const emptyVectors: number[][] = [];
      for (let i = 0; i < texts.length; i++) {
        const zeroVector: number[] = Array<number>(this.dimension).fill(0);
        emptyVectors.push(zeroVector);
      }
      return emptyVectors;
    }
  }

  async embedText(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding returned from OpenAI');
      }

      return embedding;
    } catch (error) {
      throw new Error(`Failed to embed text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: 1536,
      });

      const raw: unknown = response.data;
      if (!isEmbeddingItems(raw)) {
        throw new Error('Invalid embeddings format from OpenAI');
      }
      const items = raw as Array<{ embedding: number[] }>; // safe after guard
      const vectors: number[][] = [];
      for (const item of items) {
        vectors.push(item.embedding);
      }
      if (!vectors.length) {
        throw new Error('No embeddings returned from OpenAI');
      }

      return vectors;
    } catch (error) {
      throw new Error(`Failed to embed texts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Нормализует вектор (делит на его длину).
   * Это необходимо для корректной работы косинусного расстояния.
   */
  private normalize(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    // Избегаем деления на ноль
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
  }
}
