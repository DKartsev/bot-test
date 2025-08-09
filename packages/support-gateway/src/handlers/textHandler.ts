import { Context } from 'telegraf';
import logger from '../utils/logger';
import supabase from '../db';
import { generateResponse } from '../services/ragService';

export default async function textHandler(ctx: Context) {
  try {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    logger.info({ text }, 'Received text message');

    // store incoming user message
    await supabase.from('messages').insert({ sender: 'user', content: text });

    // generate answer via rag service
    const answer = await generateResponse(text);

    // store bot response
    await supabase.from('messages').insert({ sender: 'bot', content: answer });

    await ctx.reply(answer);
  } catch (err) {
    logger.error({ err }, 'Error in textHandler');
  }
}
