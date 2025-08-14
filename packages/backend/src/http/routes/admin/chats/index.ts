import { FastifyPluginCallback } from "fastify";
import getChatsRoute from "./getChats.js";
import postMessageRoute from "./postMessage.js";
import postStatusRoute from "./postStatus.js";
import getMessagesRoute from "./getMessages.js";
import getChatRoute from "./getChat.js";
import postAssignRoute from "./postAssign.js";

const chatsRoutes: FastifyPluginCallback = (server, _opts, done) => {
  void server.register(getChatsRoute);
  void server.register(postMessageRoute);
  void server.register(postStatusRoute);
  void server.register(getMessagesRoute);
  void server.register(getChatRoute);
  void server.register(postAssignRoute);
  done();
};

export default chatsRoutes;
