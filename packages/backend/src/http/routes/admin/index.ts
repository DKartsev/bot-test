import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
<<<<<<< HEAD
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
=======
import askBot from "./ask-bot.js";
import cases from "./cases.js";
import categories from "./categories.js";
import chats from "./chats/index.js";
import conversations from "./conversations/index.js";
import db from "./db.js";
import feedback from "./feedback.js";
import metrics from "./metrics.js";
import notes from "./notes.js";
import savedReplies from "./saved-replies.js";
import stream from "./stream.js";
import telegram from "./telegram.js";
import users from "./users.js";

const adminRoutes: FastifyPluginAsync = async (server) => {
  await server.register(askBot);
  await server.register(cases);
  await server.register(categories);
  await server.register(chats);
  await server.register(conversations);
  await server.register(db);
  await server.register(feedback);
  await server.register(metrics);
  await server.register(notes);
  await server.register(savedReplies);
  await server.register(stream);
  await server.register(telegram);
  await server.register(users);
};

>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
