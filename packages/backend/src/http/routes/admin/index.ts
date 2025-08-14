import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import askBotRoutes from "./ask-bot.js";
import casesRoutes from "./cases.js";
import categoriesRoutes from "./categories.js";
import conversationsRoutes from "./conversations/index.js";
import notesRoutes from "./notes.js";
import savedRepliesRoutes from "./saved-replies.js";
import streamRoutes from "./stream.js";
import chatsRoutes from "./chats/index.js";
import usersRoutes from "./users.js";
import feedbackRoutes from "./feedback.js";
import dbRoutes from "./db.js";
import metricsRoutes from "./metrics.js";
import telegramRoutes from "./telegram.js";

const adminRoutes: FastifyPluginAsync = async (server, _opts) => {
  await server.register(askBotRoutes);
  await server.register(casesRoutes);
  await server.register(categoriesRoutes);
  await server.register(conversationsRoutes);
  await server.register(notesRoutes);
  await server.register(savedRepliesRoutes);
  await server.register(streamRoutes);
  await server.register(chatsRoutes);
  await server.register(usersRoutes);
  await server.register(feedbackRoutes);
  await server.register(dbRoutes);
  await server.register(metricsRoutes);
  await server.register(telegramRoutes);
};

export default fp(adminRoutes as any);
