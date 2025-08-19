import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import getChatsRoute from './getChats.js';
import getChatRoute from './getChat.js';
import getMessagesRoute from './getMessages.js';
import postMessageRoute from './postMessage.js';
import postAssignRoute from './postAssign.js';
import postStatusRoute from './postStatus.js';

const chatsRoutes: FastifyPluginAsync = async (server, _opts) => {
  await server.register(getChatsRoute);
  await server.register(getChatRoute);
  await server.register(getMessagesRoute);
  await server.register(postMessageRoute);
  await server.register(postAssignRoute);
  await server.register(postStatusRoute);
};

export default fp(chatsRoutes);
