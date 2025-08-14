import { FastifyPluginCallback } from "fastify";
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

import { FastifyPluginCallback } from "fastify";

const adminRoutes: FastifyPluginCallback = (server, _opts, done) => {
  void server.register(askBot);
  void server.register(cases);
  void server.register(categories);
  void server.register(chats);
  void server.register(conversations);
  void server.register(db);
  void server.register(feedback);
  void server.register(metrics);
  void server.register(notes);
  void server.register(savedReplies);
  void server.register(stream);
  void server.register(telegram);
  void server.register(users);
  done();
};

export default adminRoutes;
