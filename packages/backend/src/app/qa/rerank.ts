import { env } from "../../config/env.js";

// TODO: These should be defined in a shared types/domain file
interface FuzzyResult {
  item: { id: string; [key: string]: any };
  score: number; // 0 is a perfect match
}

interface SemanticResult {
  id: string;
  similarity: number; // 1 is a perfect match
}

interface Candidate {
  item: { id: string; [key: string]: any };
  fuzzyScore?: number;
  semanticScore?: number;
  combinedScore: number;
}

/**
 * Выполняет гибридное ранжирование, комбинируя результаты
 * полнотекстового (fuzzy) и семантического (vector) поиска.
 * @param fuzzyResults - Результаты от FuzzySearch.
 * @param semResults - Результаты от VectorStore.
 * @param alpha - Коэффициент, определяющий вес семантического поиска (от 0 до 1).
 * @returns Отсортированный список кандидатов.
 */
export function hybridRank(
  fuzzyResults: FuzzyResult[],
  semResults: SemanticResult[],
  alpha: number = 0.7,
): Candidate[] {
  const candidates = new Map<string, Partial<Candidate>>();

  // Обрабатываем результаты полнотекстового поиска
  for (const { item, score } of fuzzyResults) {
    if (!item || !item.id) continue;
    const entry = candidates.get(item.id) || { item };
    // Инвертируем score, т.к. в fuzzy 0 - лучший результат
    entry.fuzzyScore = 1 - score;
    candidates.set(item.id, entry);
  }

  // Обрабатываем результаты семантического поиска
  for (const { id, similarity } of semResults) {
    const entry = candidates.get(id) || { item: { id } };
    entry.semanticScore = similarity;
    candidates.set(id, entry);
  }

  // Считаем комбинированный скор и сортируем
  const rankedList: Candidate[] = [];
  for (const [id, partialCandidate] of candidates.entries()) {
    const fuzzyScore = partialCandidate.fuzzyScore ?? 0;
    const semanticScore = partialCandidate.semanticScore ?? 0;

    // Формула взвешенного среднего
    const combinedScore = alpha * semanticScore + (1 - alpha) * fuzzyScore;

    if (partialCandidate.item) {
      rankedList.push({
        ...partialCandidate,
        item: partialCandidate.item,
        combinedScore,
      });
    }
  }

  // Сортируем по убыванию комбинированного скора (чем больше, тем лучше)
  rankedList.sort((a, b) => b.combinedScore - a.combinedScore);

  return rankedList;
}
