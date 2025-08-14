import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
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

