import supabase from '../db';
import logger from '../utils/logger';
import { z } from 'zod';

const paramsSchema = z.object({
  userTelegramId: z.string(),
  chatTelegramId: z.string(),
  username: z.string().nullable().optional(),
});

export async function getOrCreateConversation({
  userTelegramId,
  chatTelegramId,
  username,
}: z.infer<typeof paramsSchema>): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_telegram_id', userTelegramId)
    .eq('chat_telegram_id', chatTelegramId)
    .eq('status', 'open')
    .maybeSingle();

  if (error) {
    logger.error({ error }, 'Failed to fetch conversation');
  }

  if (data?.id) {
    return { id: data.id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('conversations')
    .insert({
      user_telegram_id: userTelegramId,
      chat_telegram_id: chatTelegramId,
      username,
      status: 'open',
      handoff: 'bot',
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    logger.error({ error: insertError }, 'Failed to create conversation');
    throw insertError;
  }

  return { id: inserted.id };
}
