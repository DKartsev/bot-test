export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "и",
  "в",
  "на",
  "по",
  "что",
  "как",
  "для",
  "или",
  "но",
  "если",
  "к",
  "у",
  "о",
  "от",
  "до",
  "под",
  "над",
  "со",
  "же",
  "то",
  "а",
  "не",
  "из",
  "при",
]);

export function tokensRU(s: string): string[] {
  const norm = normalize(s);
  const tokens = norm.match(/[\p{L}\p{N}]+/gu) || [];
  return tokens.filter((t) => !STOP_WORDS.has(t));
}
