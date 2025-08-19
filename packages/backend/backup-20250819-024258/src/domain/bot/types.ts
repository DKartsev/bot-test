export type Lang = string;

export interface SearchSource {
  id: string;
  title?: string; // опционально
  url?: string; // опционально
  snippet?: string; // опционально
  score?: number; // опционально
}

export interface BotDraft {
  question: string;
  draft: string;
  sources: SearchSource[];
  lang?: Lang;
}

export interface RefineOptions {
  targetLang?: Lang;
  temperature?: number;
  minConfidenceToEscalate?: number;
}

export interface RefineResult {
  answer: string;
  confidence: number; // 0..1
  escalate: boolean;
  citations: Array<{ id: string }>;
}
