import type { TextChunk } from './chunker.js';
import type { Embedder } from './vector-store.js';
import { logger } from '../../../utils/logger.js';

export interface Retriever {
  retrieve(query: string, k: number): Promise<TextChunk[]>;
}

interface VectorSearchable {
  search(query: string, k: number): Promise<TextChunk[]>;
}

export class VectorRetriever implements Retriever {
  constructor(
    private embedder: Embedder,
    private vectorStore: VectorSearchable, // precise interface instead of any
  ) {
    // Vector retriever initialization
  }

  async retrieve(query: string, k: number): Promise<TextChunk[]> {
    try {
      return await this.vectorStore.search(query, k);
    } catch (error) {
      logger.error({ err: error }, 'Vector search failed');
      return [];
    }
  }
}

export class TextRetriever implements Retriever {
  constructor(private chunks: TextChunk[]) {
    // Text retriever initialization
  }

  retrieve(query: string, k: number): Promise<TextChunk[]> {
    const queryLower = query.toLowerCase();
    const scored = this.chunks
      .map((chunk) => {
        const text = chunk.text.toLowerCase();
        const score = text.includes(queryLower) ? 1 : 0;
        return { chunk, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((item) => item.chunk);

    return Promise.resolve(scored);
  }
}

export class HybridRetriever implements Retriever {
  constructor(
    private vectorRetriever: VectorRetriever,
    private textRetriever: TextRetriever,
    private vectorWeight = 0.7,
  ) {
    // Hybrid retriever initialization
  }

  async retrieve(query: string, k: number): Promise<TextChunk[]> {
    try {
      const [vectorResults, textResults] = await Promise.all([
        this.vectorRetriever.retrieve(query, Math.ceil(k * this.vectorWeight)),
        this.textRetriever.retrieve(query, Math.ceil(k * (1 - this.vectorWeight))),
      ]);

      // Combine and deduplicate results
      const allResults = [...vectorResults, ...textResults];
      const seen = new Set<string>();
      const uniqueResults: TextChunk[] = [];

      for (const result of allResults) {
        if (!seen.has(result.id)) {
          seen.add(result.id);
          uniqueResults.push(result);
          if (uniqueResults.length >= k) break;
        }
      }

      return uniqueResults;
    } catch (error) {
      logger.error({ err: error }, 'Hybrid retrieval failed');
      // Fallback to text retrieval
      return this.textRetriever.retrieve(query, k);
    }
  }
}
