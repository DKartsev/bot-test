export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ёе]/g, 'е')
    .replace(/[ЁЕ]/g, 'Е')
    .replace(/[йи]/g, 'и')
    .replace(/[ЙИ]/g, 'И')
    .replace(/[ъь]/g, '')
    .replace(/[ЪЬ]/g, '')
    .replace(/[^а-яa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokensRU(text: string): string[] {
  const normalized = normalize(text ?? '');
  return normalized.split(/\s+/).filter(Boolean);
}
