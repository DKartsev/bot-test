import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { Update } from "telegraf/types";
import { makeBot } from "../../bot/bot.js";
import { env } from "../../config/env.js";

const {
  TELEGRAM_BOT_TOKEN,
  TG_WEBHOOK_PATH,
  TG_WEBHOOK_SECRET,
  PUBLIC_URL,
  TELEGRAM_SET_WEBHOOK_ON_START,
} = env;

const telegramPlugin: FastifyPluginAsync = async (server, _opts) => {
  if (!TELEGRAM_BOT_TOKEN) {
    server.log.warn("TELEGRAM_BOT_TOKEN is not set, Telegram plugin disabled.");
    return;
  }

  // Get the qaService from the server dependencies
  const { qaService } = server.deps;
  const { bot } = makeBot({ qaService });

  interface TelegramWebhookParams {
    token?: string;
  }

  server.post(
    `${TG_WEBHOOK_PATH}/:token?`,
    {
      preHandler: (request, reply, done) => {
        if (TG_WEBHOOK_SECRET) {
          const headerTok = request.headers[
            "x-telegram-bot-api-secret-token"
          ] as string | undefined;
          const paramTok = (request.params as TelegramWebhookParams).token;
          if (
            headerTok !== TG_WEBHOOK_SECRET &&
            paramTok !== TG_WEBHOOK_SECRET
          ) {
            server.log.warn("Invalid Telegram secret token received");
            void reply.code(401).send({ error: "Unauthorized" });
            return;
          }
        }
        done();
      },
    },
    async (request, reply) => {
      try {
        await bot.handleUpdate(request.body as Update);
        return reply.send({ ok: true });
      } catch (err) {
        request.log.error({ err }, "Failed to handle Telegram update");
        return reply.code(500).send({ error: "Failed to process update" });
      }
    },
  );

  // Graceful shutdown
  server.addHook("onClose", async () => {
    server.log.info("Stopping Telegram bot...");
    try {
      await bot.stop("SIGTERM");
      server.log.info("Telegram bot stopped.");
    } catch (err) {
      server.log.warn({ err }, "Failed to stop Telegram bot gracefully.");
    }
  });

  // Set webhook on start
  server.addHook("onReady", async () => {
    if (TELEGRAM_SET_WEBHOOK_ON_START && PUBLIC_URL && TG_WEBHOOK_SECRET) {
      try {
        const webhookUrl = `${PUBLIC_URL}${TG_WEBHOOK_PATH}/${TG_WEBHOOK_SECRET}`;
        await bot.telegram.setWebhook(webhookUrl, {
          secret_token: TG_WEBHOOK_SECRET,
        });
        server.log.info(
          { url: webhookUrl },
          "Telegram webhook set successfully",
        );
      } catch (err) {
        server.log.error({ err }, "Failed to set Telegram webhook");
      }
    } else if (TELEGRAM_SET_WEBHOOK_ON_START) {
      server.log.warn(
        "TELEGRAM_SET_WEBHOOK_ON_START is true, but PUBLIC_URL or TG_WEBHOOK_SECRET is missing. Cannot set webhook.",
      );
    }
  });

  server.log.info("Telegram plugin registered.");
};

export default fp(telegramPlugin as any);
