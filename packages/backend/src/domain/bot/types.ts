export type Lang = 'ru' | 'en' | 'eo' | string;

export interface SearchSource {
	id: string;
	title?: string;
	url?: string;
	snippet?: string;
	score?: number;
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
	minConfidenceToEscalate?: number; // если confidence < порога — предлагаем оператора
}

export interface RefineResult {
	answer: string;
	confidence: number; // 0..1
	escalate: boolean;
	citations: Array<{ id: string }>;
}
