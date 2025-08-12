import { FastifyPluginAsync } from "fastify";
import bot from "./bot.js";
import feedback from "./admin/feedback.js";
import metrics from "./admin/metrics.js";
import db from "./admin/db.js";

const routes: FastifyPluginAsync = async (app) => {
  app.register(bot);
  app.register(feedback);
  app.register(metrics);
  app.register(db);
};
export default routes;
