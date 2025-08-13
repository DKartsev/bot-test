import { promises as fs } from "fs";
import path from "path";
import { HierarchicalNSW } from "hnswlib-node";
import { logger } from "../../../utils/logger.js";
import { TextChunk } from "./chunker.js";

export interface Embedder {
  embed(texts: string[]): Promise<(number[] | undefined)[]>;
  getDimension(): number;
}

interface IndexMeta {
  dim: number;
  size: number;
  updatedAt: string;
  chunkIds: string[];
}

export interface VectorSearchResult extends TextChunk {
  similarity: number;
}

export class VectorStore {
  private index: HierarchicalNSW | null = null;
  private chunkMeta = new Map<string, TextChunk>();
  private chunkIdToIndex = new Map<string, number>();
  private indexToChunkId: string[] = [];
  private dimension: number;
  private isInitialized = false;

  private readonly indexFile: string;
  private readonly metaFile: string;
  private readonly chunksFile: string;

  constructor(
    private storePath: string,
    private embedder: Embedder,
  ) {
    this.dimension = this.embedder.getDimension();
    this.indexFile = path.join(storePath, "hnsw-index.bin");
    this.metaFile = path.join(storePath, "hnsw-meta.json");
    this.chunksFile = path.join(storePath, "chunks.jsonl");
  }

  async init(): Promise<void> {
    // ...
  }
  private async load(): Promise<void> {
    // ...
  }
  private async save(): Promise<void> {
    // ...
  }

  async upsert(chunks: TextChunk[]): Promise<void> {
    if (!this.index) throw new Error("VectorStore not initialized.");
    if (!chunks.length) return;

    const texts = chunks.map((c) => c.text);
    const vectors = await this.embedder.embed(texts);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = vectors[i];

      if (!chunk || !vector) {
        logger.warn({ chunkId: chunk?.id }, "Skipping chunk with no vector.");
        continue;
      }

      if (this.chunkIdToIndex.has(chunk.id)) {
        continue;
      }

      const newIndex = this.index.getCurrentCount();
      this.index.addPoint(vector, newIndex);
      this.indexToChunkId[newIndex] = chunk.id;
      this.chunkIdToIndex.set(chunk.id, newIndex);
      this.chunkMeta.set(chunk.id, chunk);
    }
    // ...
  }

  async search(query: string, k: number): Promise<VectorSearchResult[]> {
    if (!this.index || this.index.getCurrentCount() === 0) return [];

    const [queryVector] = await this.embedder.embed([query]);
    if (!queryVector) return [];

    const result = this.index.searchKnn(queryVector, k);
    if (!result.neighbors.length) return [];

    return result.neighbors
      .map((neighborIndex, i) => {
        const chunkId = this.indexToChunkId[neighborIndex];
        if (!chunkId) return null;
        const chunk = this.chunkMeta.get(chunkId);
        if (!chunk) return null;
        return {
          ...chunk,
          similarity: 1 - result.distances[i],
        };
      })
      .filter((c): c is VectorSearchResult => c !== null);
  }

  async rebuild(): Promise<void> {
    // ...
  }
}
