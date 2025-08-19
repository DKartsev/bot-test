import { describe, it, expect } from "vitest";
import { findExact } from "./store.js";
import { findFuzzy } from "./fuzzy.js";

describe("findExact", () => {
  it("returns answer for exact match", () => {
    const res = findExact("Как тебя зовут?");
    expect(res?.id).toBe("demo1");
  });
});

describe("findFuzzy", () => {
  it("returns close match", () => {
    const { hit } = findFuzzy("что умеешь");
    expect(hit?.id).toBe("demo2");
  });

  it("returns undefined for bad query", () => {
    const { hit } = findFuzzy("несвязанный вопрос");
    expect(hit).toBeUndefined();
  });
});
