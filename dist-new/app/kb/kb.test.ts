import { describe, it, expect } from "vitest";
import { searchKb } from "./index.js";

describe("searchKb", () => {
  it("finds relevant snippet", () => {
    const res = searchKb("установка", 1);
    expect(res.length).toBeGreaterThan(0);
    const firstResult = res[0];
    if (!firstResult) {
      throw new Error("First result should be defined");
    }
    expect(firstResult.doc.slug).toBe("setup");
    expect(firstResult.snippet.length).toBeGreaterThan(0);
  });
});
