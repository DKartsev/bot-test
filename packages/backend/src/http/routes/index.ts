import { FastifyPluginAsync } from "fastify";
import botRoutes from "./bot.js";

const routes: FastifyPluginAsync = async (app, _opts) => {
  await app.register(botRoutes);
};

export default routes;
