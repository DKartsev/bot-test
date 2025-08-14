import { FastifyPluginAsync } from "fastify";
<<<<<<< HEAD
import botRoutes from "./bot.js";

const routes: FastifyPluginAsync = async (app, _opts) => {
  await app.register(botRoutes);
};

export default routes;
=======
import fp from "fastify-plugin";
import bot from "./bot.js";
import admin from "./admin/index.js";

const routes: FastifyPluginAsync = async (app) => {
  await app.register(bot);
  await app.register(admin);
};
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
