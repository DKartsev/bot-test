import Fastify from 'fastify';
import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import { generateResponse } from '../../packages/support-gateway/src/services/ragService';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

const bot = new Telegraf(BOT_TOKEN);
const fastify = Fastify();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Хендлер текста
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;

  const conversationId = await getOrCreateConversation(userId);

  // сохраняем сообщение пользователя
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender: 'user',
    content: text
  });

  // генерируем ответ через RAG-сервис
  const reply = await generateResponse(text);

  // сохраняем ответ ассистента
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender: 'assistant',
    content: reply
  });

  await ctx.reply(reply);
});

// Telegram webhook
fastify.post('/bot', async (req, res) => {
  await bot.handleUpdate(req.body);
  res.send({ status: 'ok' });
});

// Запуск сервера
fastify.listen({ port: 3000 }, () => {
  console.log('Server running on http://localhost:3000');
});

// Хелпер: получить/создать диалог
async function getOrCreateConversation(user_telegram_id: string): Promise<string> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_telegram_id', user_telegram_id)
    .eq('status', 'open')
    .limit(1)
    .maybeSingle();

  if (data) return data.id;

  const { data: created } = await supabase
    .from('conversations')
    .insert({ user_telegram_id })
    .select()
    .single();

  return created.id;
}
