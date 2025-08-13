import { promises as fs } from "fs";
import path from "path";
import { HierarchicalNSW } from "hnswlib-node";
import { logger } from "../../../utils/logger.js";
import { TextChunk } from "./chunker.js";

/**
 * Абстракция для любого движка, который может превращать текст в векторы.
 * Это позволяет легко заменять модели в будущем (например, OpenAI, Cohere, etc.).
 */
export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
  getDimension(): number;
}

/**
 * Метаданные, описывающие состояние векторного индекса на диске.
 */
interface IndexMeta {
  dim: number;
  size: number;
  updatedAt: string;
  // Сохраняем ID чанков в порядке их индексации
  chunkIds: string[];
}

/**
 * Результат поиска по вектору.
 */
export interface VectorSearchResult extends TextChunk {
  similarity: number;
}

/**
 * Класс VectorStore управляет жизненным циклом HNSW-индекса для векторного поиска.
 * Он отвечает за создание, загрузку, сохранение индекса и поиск по нему.
 * Все файловые операции выполняются асинхронно.
 */
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

  /**
   * Инициализирует VectorStore.
   * Пытается загрузить существующий индекс с диска, если он есть.
   * Если индекса нет или загрузка не удалась, создает новый.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    logger.info(
      { path: this.storePath },
      "Инициализация векторного хранилища...",
    );
    await fs.mkdir(this.storePath, { recursive: true });

    try {
      await this.load();
      logger.info("Векторное хранилище успешно загружено с диска.");
    } catch (err) {
      logger.warn(
        { err },
        "Не удалось загрузить существующий индекс. Создается новый.",
      );
      this.index = new HierarchicalNSW("cosine", this.dimension);
      this.index.initIndex(0);
    }
    this.isInitialized = true;
  }

  /**
   * Загружает индекс и метаданные с диска.
   */
  private async load(): Promise<void> {
    const meta: IndexMeta = JSON.parse(
      await fs.readFile(this.metaFile, "utf8"),
    );
    if (meta.dim !== this.dimension) {
      throw new Error(
        `Dimension mismatch: index has ${meta.dim}, embedder has ${this.dimension}`,
      );
    }

    const index = new HierarchicalNSW("cosine", this.dimension);
    await index.readIndex(this.indexFile);
    this.index = index;

    this.indexToChunkId = meta.chunkIds;
    this.chunkIdToIndex = new Map(this.indexToChunkId.map((id, i) => [id, i]));

    // Загружаем метаданные чанков
    const lines = (await fs.readFile(this.chunksFile, "utf8")).split("\n");
    for (const line of lines) {
      if (!line) continue;
      const chunk: TextChunk = JSON.parse(line);
      this.chunkMeta.set(chunk.id, chunk);
    }
  }

  /**
   * Сохраняет индекс и метаданные на диск.
   */
  private async save(): Promise<void> {
    if (!this.index) return;
    await this.index.writeIndex(this.indexFile);
    const meta: IndexMeta = {
      dim: this.dimension,
      size: this.index.getCurrentCount(),
      updatedAt: new Date().toISOString(),
      chunkIds: this.indexToChunkId,
    };
    await fs.writeFile(this.metaFile, JSON.stringify(meta));
  }

  /**
   * Добавляет или обновляет чанки в индексе.
   */
  async upsert(chunks: TextChunk[]): Promise<void> {
    if (!this.index) throw new Error("VectorStore не инициализирован.");
    if (!chunks.length) return;

    logger.info(
      { count: chunks.length },
      "Добавление чанков в векторный индекс...",
    );
    const texts = chunks.map((c) => c.text);
    const vectors = await this.embedder.embed(texts);

    const newChunks: TextChunk[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = vectors[i];

      if (!chunk || !vector) {
        logger.warn(
          { chunkIndex: i },
          "Skipping empty chunk or vector during upsert.",
        );
        continue;
      }

      if (this.chunkIdToIndex.has(chunk.id)) {
        // TODO: Implement update logic if needed
        logger.warn(
          { chunkId: chunk.id },
          "Chunk already exists. Update not implemented.",
        );
      } else {
        const newIndex = this.index.getCurrentCount();
        this.index.addPoint(vector, newIndex);
        this.indexToChunkId[newIndex] = chunk.id;
        this.chunkIdToIndex.set(chunk.id, newIndex);
        this.chunkMeta.set(chunk.id, chunk);
        newChunks.push(chunk);
      }
    }

    // Дописываем только новые чанки в файл
    if (newChunks.length) {
      const lines = newChunks.map((c) => JSON.stringify(c)).join("\n") + "\n";
      await fs.appendFile(this.chunksFile, lines);
    }

    await this.save();
    logger.info("Векторный индекс успешно обновлен.");
  }

  /**
   * Выполняет поиск ближайших соседей по заданному запросу.
   */
  async search(query: string, k: number): Promise<VectorSearchResult[]> {
    if (!this.index || this.index.getCurrentCount() === 0) return [];

    const [queryVector] = await this.embedder.embed([query]);
    if (!queryVector) return [];

    const result = this.index.searchKnn(queryVector, k);
    if (!result.neighbors.length) return [];

    const searchResults = result.neighbors
      .map((neighborIndex, i) => {
        const chunkId = this.indexToChunkId[neighborIndex];
        if (!chunkId) return null;

        const chunk = this.chunkMeta.get(chunkId);
        if (!chunk) return null;

        const distance = result.distances[i];
        if (distance === undefined) return null;

        return {
          ...chunk,
          similarity: 1 - distance, // HNSW-библиотека возвращает расстояние, а не сходство
        };
      })
      .filter((res): res is VectorSearchResult => res !== null);

    return searchResults;
  }

  /**
   * Полностью перестраивает индекс из файла чанков.
   * Это дорогая операция.
   */
  async rebuild(): Promise<void> {
    logger.warn("Полная перестройка векторного индекса...");
    this.index = new HierarchicalNSW("cosine", this.dimension);
    this.index.initIndex(0);
    this.chunkMeta.clear();
    this.chunkIdToIndex.clear();
    this.indexToChunkId = [];

    // Удаляем старые файлы индекса, метаданных и чанков
    await Promise.all([
      fs
        .unlink(this.indexFile)
        .catch(
          (e: unknown) =>
            e &&
            typeof e === "object" &&
            "code" in e &&
            e.code !== "ENOENT" &&
            Promise.reject(e),
        ),
      fs
        .unlink(this.metaFile)
        .catch(
          (e: unknown) =>
            e &&
            typeof e === "object" &&
            "code" in e &&
            e.code !== "ENOENT" &&
            Promise.reject(e),
        ),
    ]);
    const lines = (await fs.readFile(this.chunksFile, "utf8")).split("\n");
    const chunks: TextChunk[] = lines
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TextChunk);

    await this.upsert(chunks);
    logger.info("Перестройка индекса завершена.");
  }
}
