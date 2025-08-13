import OpenAI from "openai";
import { logger } from "../../../utils/logger.js";
import { env } from "../../../config/env.js";
import { Embedder } from "./vector-store.js";

// Определяем модель и размерность вектора для OpenAI
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
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
        "OPENAI_API_KEY не установлен. Embedder не может быть инициализирован.",
      );
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.dimension = OPENAI_EMBEDDING_DIMENSION;
    logger.info(
      { model: OPENAI_EMBEDDING_MODEL },
      "Инициализирован OpenAI Embedder.",
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
      (t || "").trim().replace(/\n/g, " "),
    );

    try {
      const response = await this.client.embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input: sanitizedTexts,
      });

      // Нормализуем векторы для использования с косинусным расстоянием
      return response.data.map((item) => this.normalize(item.embedding));
    } catch (err: unknown) {
      logger.error({ err }, "Ошибка при создании векторов с помощью OpenAI");
      // Возвращаем пустые векторы для текстов, которые не удалось обработать
      return texts.map(() => new Array(this.dimension).fill(0));
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
