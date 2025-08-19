// TODO: These should be defined in a shared types/domain file
interface FuzzyResult {
  item: { id: string; Question: string; Answer: string };
  score: number; // 0 is a perfect match
}

interface SemanticResult {
  id: string;
  similarity: number; // 1 is a perfect match
}

interface Candidate {
  item: { id: string; Question: string; Answer: string };
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

  // 1. Populate with all items from fuzzy results to ensure we have full item data
  for (const { item } of fuzzyResults) {
    if (item?.id && !candidates.has(item.id)) {
      candidates.set(item.id, { item });
    }
  }

  // 2. Add fuzzy scores
  for (const { item, score } of fuzzyResults) {
    if (!item?.id) continue;
    const entry = candidates.get(item.id);
    if (entry) {
      // Инвертируем score, т.к. в fuzzy 0 - лучший результат
      entry.fuzzyScore = 1 - score;
    }
  }

  // 3. Add semantic scores
  for (const { id, similarity } of semResults) {
    const entry = candidates.get(id);
    if (entry) {
      entry.semanticScore = similarity;
    }
  }

  // Считаем комбинированный скор и сортируем
  const rankedList: Candidate[] = [];
  for (const partialCandidate of candidates.values()) {
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
