import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorStore } from './vector-store.js';
import type { TextChunk } from './chunker.js';

// Мокаем hnswlib-node
vi.mock('hnswlib-node', () => ({
  HierarchicalNSW: vi.fn().mockImplementation(() => ({
    initIndex: vi.fn(),
    addPoint: vi.fn(),
    searchKnn: vi.fn(() => ({ neighbors: [0], distances: [0.1] })),
    getCurrentCount: vi.fn(() => 0),
    writeIndex: vi.fn(),
    readIndex: vi.fn(),
  })),
}));

// Мокаем fs
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    readFile: vi.fn(() => '{"id":"test","text":"test","start":0,"end":4,"metadata":{}}'),
    writeFile: vi.fn(),
    access: vi.fn(),
    appendFile: vi.fn(),
    unlink: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Мокаем path
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
  },
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

// Мокаем logger
vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Мокаем embedder
const mockEmbedder = {
  embed: vi.fn(() => Promise.resolve([[0.1, 0.2, 0.3]])),
  getDimension: vi.fn(() => 1536),
};

describe('VectorStore', () => {
  let vectorStore: VectorStore;
  const mockStorePath = '/test/store';
  const mockEmbedderInstance = mockEmbedder as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vectorStore = new VectorStore(mockStorePath, mockEmbedderInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(vectorStore).toBeDefined();
      expect(mockEmbedder.getDimension).toHaveBeenCalled();
    });
  });

  describe('init', () => {
    it('should initialize successfully with hnswlib-node', async () => {
      await vectorStore.init();
      expect(vectorStore).toBeDefined();
    });

    it('should handle hnswlib-node import error gracefully', async () => {
      // Мокаем ошибку импорта
      vi.doMock('hnswlib-node', () => {
        throw new Error('Module not found');
      });

      await expect(vectorStore.init()).resolves.not.toThrow();
    });
  });

  describe('upsert', () => {
    it('should add chunks successfully', async () => {
      const chunks: TextChunk[] = [{
        id: 'test-chunk',
        text: 'test text',
        start: 0,
        end: 9,
      }];

      await vectorStore.init();
      await vectorStore.upsert(chunks);
      expect(vectorStore).toBeDefined();
    });

    it('should handle empty chunks array', async () => {
      const chunks: TextChunk[] = [];

      await vectorStore.init();
      await expect(vectorStore.upsert(chunks)).resolves.not.toThrow();
    });
  });

  describe('search', () => {
    it('should search similar chunks', async () => {
      const query = 'test query';
      const k = 5;

      await vectorStore.init();
      const result = await vectorStore.search(query, k);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty query', async () => {
      const query = '';
      const k = 5;

      await vectorStore.init();
      const result = await vectorStore.search(query, k);
      expect(result).toEqual([]);
    });

    it('should return empty array when hnswlib-node not available', async () => {
      const query = 'test query';
      const k = 5;

      // Не вызываем init() чтобы hnswlib-node не был доступен
      const result = await vectorStore.search(query, k);
      expect(result).toEqual([]);
    });
  });

  describe('rebuild', () => {
    it('should rebuild index successfully', async () => {
      await vectorStore.init();
      await expect(vectorStore.rebuild()).resolves.not.toThrow();
    });

    it('should handle rebuild when hnswlib-node not available', async () => {
      // Не вызываем init() чтобы hnswlib-node не был доступен
      await expect(vectorStore.rebuild()).resolves.not.toThrow();
    });
  });
});
