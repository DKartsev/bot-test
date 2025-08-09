import { Context } from 'telegraf';
import { z } from 'zod';
import logger from '../utils/logger';
import supabase from '../db';
import { generateResponse } from '../services/ragService';
import { getOrCreateConversation } from '../services/conversation';
import { detectHandoff } from '../utils/detectHandoff';
import { liveBus } from '../lib/liveBus';

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

    const { data: conv } = await supabase
      .from('conversations')
      .select('handoff')
      .eq('id', conversation_id)
      .single();

    const shouldHandoff = conv?.handoff === 'human' || detectHandoff(text);

    const { data: userMsg, error: userError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender: 'user',
        content: text,
      })
      .select('id')
      .single();

    if (userError || !userMsg) {
      logger.error({ err: userError }, 'Failed to insert user message');
      return;
    }

    liveBus.emit('new_user_msg', {
      conversation_id,
      message_id: userMsg.id,
    });

    if (shouldHandoff) {
      if (conv?.handoff !== 'human') {
        await supabase
          .from('conversations')
          .update({ handoff: 'human', status: 'open' })
          .eq('id', conversation_id);
      }

      const notice = 'Передаю ваш вопрос оператору. Пожалуйста, ожидайте 🙌';
      await supabase.from('messages').insert({
        conversation_id,
        sender: 'bot',
        content: notice,
      });
      await ctx.reply(notice);

      liveBus?.emit?.('handoff', {
        conversation_id,
        userTelegramId: String(userId),
        text,
      });
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
