import { describe, it, expect } from "vitest";
import { searchKb } from "./index.js";

describe("searchKb", () => {
  it("finds relevant snippet", () => {
    const res = searchKb("установка", 1);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].doc.slug).toBe("setup");
    expect(res[0].snippet.length).toBeGreaterThan(0);
  });
});
