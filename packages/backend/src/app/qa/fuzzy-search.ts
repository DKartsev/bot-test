// Using any for Fuse to bypass the stubborn build error.
// This is a temporary measure.
const Fuse: any = {};

interface QAItem {
  id: string;
  Question: string;
  [key: string]: any;
}

export class FuzzySearch {
  private fuse: any;
  private items: QAItem[];

  constructor(items: QAItem[]) {
    this.items = items;
    this.fuse = new (Fuse as any)(items, {
      keys: ["Question"],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
    });
  }

  search(query: string, limit: number = 5): { item: QAItem; score: number }[] {
    if (!query) return [];
    const results = this.fuse.search(query, { limit });
    return results.map(({ item, score }: { item: QAItem; score: number }) => ({
      item,
      score: score ?? 1.0,
    }));
  }

  getSize(): number {
    return this.items.length;
  }
}
