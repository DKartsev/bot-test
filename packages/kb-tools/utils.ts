// packages/kb-tools/utils.ts

/**
 * Приблизительно оценивает кол-во токенов в тексте: 
 * 1 токен ≈ 0.75 слова, но мы берём 1 слово = 1 токен для простоты.
 */
function estimateTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Разбивает Markdown-текст на чанки не более maxTokens токенов
 */
export function chunkMarkdown(
  markdown: string,
  maxTokens: number = 500
): string[] {
  // разбиваем по двойным переводу строки (абзацам)
  const paragraphs = markdown.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    const currentTokens = estimateTokens(current);

    // если добавление перезагрузит порог — сохраняем текущий и начинаем новый
    if (current && currentTokens + paraTokens > maxTokens) {
      chunks.push(current.trim());
      current = para;
    } else {
      // иначе наращиваем
      current = current ? current + '\n\n' + para : para;
    }
  }

  // последний чанок
  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}
