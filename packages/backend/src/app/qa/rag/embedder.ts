import OpenAI from 'openai';

import { env } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
  getDimension(): number;
}

export class OpenAIEmbedder implements Embedder {
  private client: OpenAI;
  private dimension: number;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    this.dimension = 1536; // text-embedding-ada-002 dimension
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      logger.error({ error }, 'Failed to create embeddings');
      throw new Error('Embedding creation failed');
    }
  }

  getDimension(): number {
    return this.dimension;
  }
}

export class MockEmbedder implements Embedder {
  constructor(private dimension: number = 1536) {
    // Mock embedder for testing
  }

  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map(() => Array(this.dimension).fill(0).map(() => Math.random() - 0.5)));
  }

  getDimension(): number {
    return this.dimension;
  }
}
