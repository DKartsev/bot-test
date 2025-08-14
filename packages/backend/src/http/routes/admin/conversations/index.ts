import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import getConversationsRoute from "./getConversations.js";
import getMessagesRoute from "./getMessages.js";
import postReplyRoute from "./postReply.js";

const conversationsRoutes: FastifyPluginAsync = async (server, _opts) => {
  await server.register(getConversationsRoute);
  await server.register(getMessagesRoute);
  await server.register(postReplyRoute);
};

export default fp(conversationsRoutes as any);
