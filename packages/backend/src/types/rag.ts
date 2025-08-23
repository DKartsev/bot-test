export interface RAGQuery {
  question: string;
  context?: string;
  userId?: number;
  chatId?: number;
  language?: string;
  options?: RAGOptions;
}

export interface RAGOptions {
  temperature?: number;
  maxTokens?: number;
  useHybridSearch?: boolean;
  searchThreshold?: number;
  refineIterations?: number;
  includeSources?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  url?: string;
  score: number;
  source: 'vector' | 'keyword' | 'hybrid';
  metadata?: Record<string, any>;
}

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  searchTime: number;
  processingTime: number;
  totalTime: number;
  metadata: {
    queryRephrased?: string;
    searchStrategy: string;
    refineIterations: number;
    modelUsed: string;
  };
}

export interface QueryRephraseResult {
  originalQuery: string;
  rephrasedQuery: string;
  intent: string;
  confidence: number;
}

export interface DraftGenerationResult {
  draft: string;
  sources: SearchResult[];
  searchStrategy: string;
  confidence: number;
}

export interface RefinementResult {
  refinedAnswer: string;
  confidence: number;
  changes: string[];
  sourcesUsed: string[];
}

export interface HybridSearchConfig {
  vectorWeight: number;
  keywordWeight: number;
  semanticThreshold: number;
  maxResults: number;
  minScore: number;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}
