import { Context } from 'telegraf';
import { z } from 'zod';
import logger from '../utils/logger';
import supabase from '../db';
import { generateResponse } from '../services/ragService';
import { getOrCreateConversation } from '../services/conversation';

export default async function textHandler(ctx: Context) {
  try {
    const schema = z.object({
      userId: z.number(),
      chatId: z.number(),
      username: z.string().nullable().optional(),
      text: z.string().min(1),
    });

    const { userId, chatId, username, text } = schema.parse({
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
      username: ctx.from?.username ?? null,
      text: ctx.message && 'text' in ctx.message ? ctx.message.text : undefined,
    });

    logger.info({ text }, 'Received text message');

    const { id: conversation_id } = await getOrCreateConversation({
      userTelegramId: String(userId),
      chatTelegramId: String(chatId),
      username,
    });

    const { error: userError } = await supabase.from('messages').insert({
      conversation_id,
      sender: 'user',
      content: text,
    });
    if (userError) {
      logger.error({ err: userError }, 'Failed to insert user message');
      return;
    }

    const answer = await generateResponse(text);

    const { error: botError } = await supabase.from('messages').insert({
      conversation_id,
      sender: 'bot',
      content: answer,
    });
    if (botError) {
      logger.error({ err: botError }, 'Failed to insert bot message');
      return;
    }

    await ctx.reply(answer);
  } catch (err) {
    logger.error({ err }, 'Error in textHandler');
  }
}
