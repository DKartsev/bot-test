import { supabaseService } from '../database/connection';

export type InteractionType = 'view' | 'answer' | 'feedback_like' | 'feedback_dislike';

interface Interaction {
  user_id: string;
  question_id: string;
  action: InteractionType;
}

export async function logInteraction(interaction: Interaction) {
  const { error } = await supabaseService.from('user_interactions').insert({
    user_id: interaction.user_id,
    question_id: interaction.question_id,
    action: interaction.action,
  });
  if (error) throw error;
}

export async function getRecommendations(userId: string, limit = 5) {
  const { data: interactions, error } = await supabaseService
    .from('user_interactions')
    .select('user_id, question_id');
  if (error || !interactions) return [];

  const seen = new Set(
    interactions.filter((i) => i.user_id === userId).map((i) => i.question_id)
  );

  const counts = new Map<string, number>();
  for (const row of interactions) {
    if (row.user_id === userId) continue;
    counts.set(row.question_id, (counts.get(row.question_id) || 0) + 1);
  }

  const candidates = Array.from(counts.entries())
    .filter(([id]) => !seen.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (candidates.length === 0) return [];

  const { data: questions } = await supabaseService
    .from('faq_questions')
    .select('id, question')
    .in('id', candidates);
  return questions || [];
}

export default { logInteraction, getRecommendations };
