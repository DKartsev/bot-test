import { FastifyPluginAsync } from "fastify";

const routes: FastifyPluginAsync = (_server, _opts) => {
  // Main routes are registered in main server
  return Promise.resolve();
};

export default routes;
