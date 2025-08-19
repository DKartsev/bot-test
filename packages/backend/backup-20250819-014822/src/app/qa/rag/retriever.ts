import { VectorStore, VectorSearchResult } from "./vector-store.js";

export interface RetrievalResult {
  contextText: string;
  citations: {
    key: number;
    sourceId?: string;
    title?: string;
    snippet: string;
  }[];
  items: VectorSearchResult[];
}

export class Retriever {
  constructor(private vectorStore: VectorStore) {}

  async retrieve(
    query: string,
    opts: { topK?: number; diversify?: boolean } = {},
  ): Promise<RetrievalResult> {
    const topK = opts.topK ?? 6;
    const shouldDiversify = opts.diversify ?? true;
    const maxChars = 9000;

    let items = await this.vectorStore.search(query, topK);

    if (shouldDiversify) {
      const perSourceCount: Record<string, number> = {};
      items = items.filter((item) => {
        const title = item.title;
        if (!title) return true;
        perSourceCount[title] = (perSourceCount[title] || 0) + 1;
        return perSourceCount[title] <= 2;
      });
    }

    let contextText = "";
    const citations: RetrievalResult["citations"] = [];
    for (const item of items) {
      if (contextText.length + item.text.length > maxChars) break;
      contextText += item.text + "\n\n";
      const citation: RetrievalResult["citations"][0] = {
        key: citations.length + 1,
        snippet: item.text.slice(0, 200),
      };
      if (item.id) citation.sourceId = item.id;
      if (item.title) citation.title = item.title;
      citations.push(citation);
    }

    return {
      contextText: contextText.trim(),
      citations,
      items,
    };
  }
}
