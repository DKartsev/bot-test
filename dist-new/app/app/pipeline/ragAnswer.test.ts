import { describe, it, expect, vi, beforeEach } from "vitest";
import { ragAnswer } from "./ragAnswer.js";
import type { FastifyInstance, FastifyBaseLogger } from "fastify";

// Mock OpenAI
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn().mockRejectedValue(new Error("OpenAI API error")),
    },
  })),
}));

// Mock FAQ functions
vi.mock("../../faq/store.js", () => ({
  findExact: vi.fn(),
}));

vi.mock("../../faq/fuzzy.js", () => ({
  findFuzzy: vi.fn(),
}));

// Mock LLM refine
vi.mock("../llm/llmRefine.js", () => ({
  refineDraft: vi.fn(),
}));

// Mock environment
vi.mock("../../config/env.js", () => ({
  env: {
    OPENAI_API_KEY: "test-key",
  },
}));

describe("ragAnswer", () => {
  let mockLogger: FastifyBaseLogger;
  let mockPg: any;
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQuery = vi.fn();
    mockPg = {
      query: mockQuery,
    } as any;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;
  });

  it("should fallback to text-only search when OpenAI embedding fails and return results", async () => {
    // Mock successful text-only search
    const mockSources = [
      {
        article_id: "1",
        title: "Test Document",
        excerpt: "This is a test document content",
        score: 0.95,
      },
    ];

    mockQuery.mockResolvedValue({
      rows: [{ kb_search_json: mockSources }],
    });

    // Mock LLM refine result
    const { refineDraft } = await import("../llm/llmRefine.js");
    (refineDraft as any).mockResolvedValue({
      answer: "Test answer",
      confidence: 0.8,
      escalate: false,
      citations: [{ id: "1" }],
    });

    // Mock successful database insert
    mockQuery.mockResolvedValueOnce({
      rows: [{ kb_search_json: mockSources }],
    }).mockResolvedValueOnce({
      rows: [],
    });

    const result = await ragAnswer({
      text: "test query",
      lang: "ru",
      logger: mockLogger,
      pg: mockPg,
    });

    // Verify OpenAI embedding was attempted and failed
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "OpenAI embedding failed, falling back to text-only search"
    );

    // Verify text-only search was called with NULL::real[]
    expect(mockQuery).toHaveBeenCalledWith(
      "select kb_search_json($1, NULL::real[], 10, 0.0, 1.0)",
      ["test query"]
    );

    // Verify logging
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "kb_search_text_only",
        hits: 1,
        embeddingUsed: false,
      })
    );

    // Verify final result
    expect(result).toEqual({
      answer: "Test answer",
      confidence: 0.8,
      escalate: false,
      citations: [{ id: "1" }],
    });
  });

  it("should fallback to direct SQL when kb_search_json function is not available", async () => {
    // Mock OpenAI embedding failure
    const { default: OpenAI } = await import("openai");
    vi.mocked(OpenAI).mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockRejectedValue(new Error("OpenAI API error")),
      },
    }) as any);

    // Mock kb_search_json function not available
    mockQuery.mockRejectedValueOnce(new Error("function kb_search_json does not exist"));

    // Mock successful direct SQL query
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          chunk_text: "This is a test chunk",
          title: "Test Article",
        },
      ],
    });

    // Mock LLM refine result
    const { refineDraft } = await import("../llm/llmRefine.js");
    vi.mocked(refineDraft).mockResolvedValue({
      answer: "Test answer",
      confidence: 0.8,
      escalate: false,
      citations: [{ id: "1" }],
    });

    const result = await ragAnswer({
      text: "test query",
      lang: "ru",
      logger: mockLogger,
      pg: mockPg,
    });

    // Verify fallback to direct SQL was logged
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "kb_search_json function not available, using direct SQL query for text search"
    );

    // Verify direct SQL query was executed
    expect(mockQuery).toHaveBeenNthCalledWith(2,
      expect.stringContaining("SELECT"),
      ["%test query%"]
    );

    // Verify result
    expect(result).toEqual({
      answer: "Test answer",
      confidence: 0.8,
      escalate: false,
      citations: [{ id: "1" }],
    });
  });

  it("should use embedding when OpenAI succeeds", async () => {
    // Mock successful OpenAI embedding
    const { default: OpenAI } = await import("openai");
    vi.mocked(OpenAI).mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }),
      },
    }) as any);

    const mockSources = [
      {
        article_id: "1",
        title: "Test Document",
        excerpt: "This is a test document content",
        score: 0.95,
      },
    ];

    mockQuery.mockResolvedValue({
      rows: [{ kb_search_json: mockSources }],
    });

    const { refineDraft } = await import("../llm/llmRefine.js");
    vi.mocked(refineDraft).mockResolvedValue({
      answer: "Test answer",
      confidence: 0.8,
      escalate: false,
      citations: [{ id: "1" }],
    });

    await ragAnswer({
      text: "test query",
      lang: "ru",
      logger: mockLogger,
      pg: mockPg,
    });

    // Verify embedding was used
    expect(mockQuery).toHaveBeenCalledWith(
      "select kb_search_json($1, $2, 10, 0.75, 0.25)",
      ["test query", [0.1, 0.2, 0.3]]
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "kb_search_with_embedding",
        hits: 1,
        embeddingUsed: true,
      })
    );
  });

  it("should fallback to FAQ when KB search returns empty results", async () => {
    // Mock empty KB search results
    mockQuery.mockResolvedValue({
      rows: [{ kb_search_json: [] }],
    });

    // Mock successful FAQ exact match
    const { findExact } = await import("../../faq/store.js");
    vi.mocked(findExact).mockReturnValue({
      id: "test-1",
      q: "test question",
      a: "test answer",
    });

    const result = await ragAnswer({
      text: "test query",
      lang: "ru",
      logger: mockLogger,
      pg: mockPg,
    });

    // Verify fallback to FAQ was logged
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "fallback_to_faq",
        reason: "kb_search_returned_empty",
      })
    );

    // Verify FAQ exact search was called
    expect(findExact).toHaveBeenCalledWith("test query");

    // Verify result from FAQ
    expect(result).toEqual({
      answer: "test answer",
      escalate: false,
      confidence: 1,
      citations: [],
    });
  });

  it("should handle database errors gracefully", async () => {
    // Mock database error for both kb_search_json and direct SQL
    mockQuery.mockRejectedValue(new Error("Database connection failed"));

    // Mock empty FAQ results
    const { findExact } = await import("../../faq/store.js");
    const { findFuzzy } = await import("../../faq/fuzzy.js");
    vi.mocked(findExact).mockReturnValue(undefined);
    vi.mocked(findFuzzy).mockReturnValue({});

    // Mock LLM refine result
    const { refineDraft } = await import("../llm/llmRefine.js");
    vi.mocked(refineDraft).mockResolvedValue({
      answer: "Fallback answer",
      confidence: 0.5,
      escalate: true,
      citations: [],
    });

    const result = await ragAnswer({
      text: "test query",
      lang: "ru",
      logger: mockLogger,
      pg: mockPg,
    });

    // Verify error was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Direct SQL query also failed"
    );

    // Verify LLM fallback was used
    expect(refineDraft).toHaveBeenCalled();

    // Verify result
    expect(result).toEqual({
      answer: "Fallback answer",
      confidence: 0.5,
      escalate: true,
      citations: [],
    });
  });
});
