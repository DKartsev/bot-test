// Basic type declarations for hnswlib-node
// This is not exhaustive but covers the usage in this project.

declare module "hnswlib-node" {
  export class HierarchicalNSW {
    constructor(space: "l2" | "ip" | "cosine", dimensions: number);
    initIndex(maxElements: number): void;
    readIndex(path: string): Promise<void>;
    writeIndex(path: string): Promise<void>;
    addPoint(point: number[], label: number): void;
    searchKnn(
      point: number[],
      k: number,
    ): { distances: number[]; neighbors: number[] };
    getCurrentCount(): number;
  }
}
