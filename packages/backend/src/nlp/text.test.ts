import { describe, it, expect } from "vitest";
import { normalize, tokensRU } from "./text.js";

describe("normalize", () => {
  it("lowercases, trims and removes punctuation", () => {
    expect(normalize(" Привет, Мир! ")).toBe("привет мир");
  });
  it("replaces ё", () => {
    expect(normalize("Ёжик")).toBe("ежик");
  });
});

describe("tokensRU", () => {
  it("splits and removes stop words", () => {
    expect(tokensRU("И в доме 123")).toEqual(["доме", "123"]);
  });
});
