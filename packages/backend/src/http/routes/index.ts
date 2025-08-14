import { FastifyPluginCallback } from "fastify";
import bot from "./bot.js";
import admin from "./admin/index.js";

const routes: FastifyPluginCallback = (app, _opts, done) => {
  void app.register(bot);
  void app.register(admin);
  done();
};
export default routes;
