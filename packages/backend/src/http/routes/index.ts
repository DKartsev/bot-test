import { FastifyPluginAsync } from "fastify";
import bot from "./bot.js";
import admin from "./admin/index.js";

const routes: FastifyPluginAsync = async (app, _opts) => {
  void app.register(bot);
  void app.register(admin);
};
export default routes;
