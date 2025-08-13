import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { makeBot } from "../../bot/bot.js";
import { env } from "../../config/env.js";

const {
  TELEGRAM_BOT_TOKEN,
  TG_WEBHOOK_PATH,
  TG_WEBHOOK_SECRET,
  PUBLIC_URL,
  TELEGRAM_SET_WEBHOOK_ON_START,
} = env;

const telegramPlugin: FastifyPluginAsync = async (server) => {
  if (!TELEGRAM_BOT_TOKEN) {
    server.log.warn("TELEGRAM_BOT_TOKEN is not set, Telegram plugin disabled.");
    return;
  }

  // Get the qaService from the server dependencies
  const { qaService } = server.deps;
  const { bot, botWebhookCallback } = makeBot({ qaService });

  server.post(
    `${TG_WEBHOOK_PATH}/:token?`,
    {
      preHandler: (request, reply, done) => {
        if (TG_WEBHOOK_SECRET) {
          const headerTok = request.headers[
            "x-telegram-bot-api-secret-token"
          ] as string | undefined;
          const paramTok = (request.params as any).token as string | undefined;
          if (
            headerTok !== TG_WEBHOOK_SECRET &&
            paramTok !== TG_WEBHOOK_SECRET
          ) {
            server.log.warn("Invalid Telegram secret token received");
            reply.code(401).send({ error: "Unauthorized" });
            return;
          }
        }
        done();
      },
    },
    async (request, reply) => {
      // The bot instance is already a webhook callback handler
      await bot.handleUpdate(request.body as any, reply.raw);
    },
  );

  // Graceful shutdown
  server.addHook("onClose", async () => {
    server.log.info("Stopping Telegram bot...");
    await bot.stop("SIGTERM");
    server.log.info("Telegram bot stopped.");
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

export default fp(telegramPlugin);
