export type Intent = 'question' | 'ticket' | 'operator';

export function intentClassifier(text: string): Intent {
  const lower = text.toLowerCase();
  if (lower.includes('оператор') || lower.includes('operator') || lower.includes('человек')) {
    return 'operator';
  }
  if (lower.includes('ticket') || lower.includes('проблем') || lower.includes('ошибк')) {
    return 'ticket';
  }
  return 'question';
}
