import { promises as fs } from "fs";
import path from "path";
// import { HierarchicalNSW } from "hnswlib-node"; // Заменено на динамический импорт
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
 * Если модуль hnswlib-node недоступен (например, отсутствует в окружении билда),
 * векторный поиск будет отключён (graceful fallback), а методы будут no-op/возвращать пустые результаты.
 */
export class VectorStore {
  private index: any | null = null;
  private chunkMeta = new Map<string, TextChunk>();
  private chunkIdToIndex = new Map<string, number>();
  private indexToChunkId: string[] = [];
  private dimension: number;
  private isInitialized = false;
  private hnswAvailable = false;

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
   * Если индекса нет или загрузка не удалась, создаёт новый.
   * Если hnswlib-node недоступен — отключает векторный индекс без падения.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    logger.info(
      { path: this.storePath },
      "🧠 Инициализация векторного хранилища...",
    );
    await fs.mkdir(this.storePath, { recursive: true });

    let HierarchicalNSWCtor: any;
    try {
      const mod: any = await import("hnswlib-node");
      HierarchicalNSWCtor = mod?.HierarchicalNSW;
      if (!HierarchicalNSWCtor) {
        throw new Error("HierarchicalNSW export not found");
      }
      this.hnswAvailable = true;
      logger.info("✅ hnswlib-node успешно загружен. Векторный поиск включен.");
    } catch (err) {
      const code = (err as any)?.code;
      if (code === "ERR_MODULE_NOT_FOUND") {
        logger.info(
          "ℹ️ Векторный поиск отключён: модуль hnswlib-node не установлен (ожидаемо на Render).",
        );
      } else {
        logger.warn(
          { err },
          "⚠️ hnswlib-node недоступен. Векторный поиск будет отключён.",
        );
      }
      this.hnswAvailable = false;
      this.isInitialized = true;
      return;
    }

    try {
      await this.load();
      logger.info("✅ Векторное хранилище успешно загружено с диска.");
    } catch (err) {
      logger.warn(
        { err },
        "⚠️ Не удалось загрузить существующий индекс. Создаётся новый.",
      );
      this.index = new HierarchicalNSWCtor("cosine", this.dimension);
      this.index.initIndex(0);
    }
    this.isInitialized = true;
  }

  /**
   * Загружает индекс и метаданные с диска.
   */
  private async load(): Promise<void> {
    if (!this.hnswAvailable) return; // нет индекса — ничего не грузим

    const meta = JSON.parse(
      await fs.readFile(this.metaFile, "utf8"),
    ) as IndexMeta;
    if (meta.dim !== this.dimension) {
      throw new Error(
        `Dimension mismatch: index has ${meta.dim}, embedder has ${this.dimension}`,
      );
    }

    const mod: any = await import("hnswlib-node");
    const HierarchicalNSWCtor = mod.HierarchicalNSW;
    const index = new HierarchicalNSWCtor("cosine", this.dimension);
    await index.readIndex(this.indexFile);
    this.index = index;

    this.indexToChunkId = meta.chunkIds;
    this.chunkIdToIndex = new Map(this.indexToChunkId.map((id, i) => [id, i]));

    // Загружаем метаданные чанков
    const lines = (await fs.readFile(this.chunksFile, "utf8")).split("\n");
    for (const line of lines) {
      if (!line) continue;
      const chunk = JSON.parse(line) as TextChunk;
      this.chunkMeta.set(chunk.id, chunk);
    }
  }

  /**
   * Сохраняет индекс и метаданные на диск.
   */
  private async save(): Promise<void> {
    if (!this.hnswAvailable || !this.index) return;
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
    if (!this.hnswAvailable) return; // no-op
    if (!this.index) throw new Error("VectorStore не инициализирован.");
    if (!chunks.length) return;

    logger.info(
      { count: chunks.length },
      "📝 Добавление чанков в векторный индекс...",
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
    logger.info("Векторный индекс успешно обновлён.");
  }

  /**
   * Выполняет поиск ближайших соседей по заданному запросу.
   */
  async search(query: string, k: number): Promise<VectorSearchResult[]> {
    if (!this.hnswAvailable || !this.index || this.index.getCurrentCount?.() === 0) return [];

    const [queryVector] = await this.embedder.embed([query]);
    if (!queryVector) return [];

    const result = this.index.searchKnn(queryVector, k);
    if (!result.neighbors.length) return [];

    const searchResults = result.neighbors
      .map((neighborIndex: number, i: number) => {
        const chunkId = this.indexToChunkId[neighborIndex];
        if (!chunkId) return null;

        const chunk = this.chunkMeta.get(chunkId);
        if (!chunk) return null;

        const distance = result.distances[i];
        if (distance === undefined) return null;

        return {
          ...chunk,
          similarity: 1 - distance, // HNSW-lib возвращает расстояние, а не сходство
        } as VectorSearchResult;
      })
      .filter((res: VectorSearchResult | null): res is VectorSearchResult => res !== null);

    return searchResults;
  }

  /**
   * Полностью перестраивает индекс из файла чанков.
   */
  async rebuild(): Promise<void> {
    if (!this.hnswAvailable) return; // no-op
    logger.warn("Полная перестройка векторного индекса...");

    const mod: any = await import("hnswlib-node");
    const HierarchicalNSWCtor = mod.HierarchicalNSW;
    this.index = new HierarchicalNSWCtor("cosine", this.dimension);
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
            // @ts-ignore
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
            // @ts-ignore
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
