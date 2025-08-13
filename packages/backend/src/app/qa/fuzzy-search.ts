import Fuse from "fuse.js";

interface QAItem {
  id: string;
  Question: string;
  Answer: string;
}

export class FuzzySearch {
  private fuse: Fuse<QAItem>;
  private items: QAItem[];

  constructor(items: QAItem[]) {
    this.items = items;
    this.fuse = new Fuse(items, {
      keys: ["Question"],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
    });
  }

  search(query: string, limit: number = 5): { item: QAItem; score: number }[] {
    if (!query) return [];
    const results = this.fuse.search(query, { limit });
    return results.map(({ item, score }) => ({
      item,
      score: score ?? 1.0,
    }));
  }

  getSize(): number {
    return this.items.length;
  }
}
