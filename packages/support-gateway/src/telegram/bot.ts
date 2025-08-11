import { Telegraf } from "telegraf";
import logger from "../utils/logger";
import { TG_BOT_TOKEN, TG_WEBHOOK_PATH } from "../config/env";

export function makeBot() {
  const token = TG_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");
  const bot = new Telegraf(token);
  bot.start(async (ctx) => {
    await ctx.reply("hello");
  });
  bot.on("text", async (ctx) => {
    await ctx.reply("ok");
  });
  const botWebhookCallback = bot.webhookCallback(TG_WEBHOOK_PATH);
  return { bot, botWebhookCallback };
}

export type Bot =
  ReturnType<typeof makeBot> extends { bot: infer B } ? B : never;
