import { FastifyPluginAsync } from "fastify";
import bot from "./bot.js";
import feedback from "./admin/feedback.js";
import metrics from "./admin/metrics.js";
import db from "./admin/db.js";

const routes: FastifyPluginAsync = async (app, _opts) => {
  void app.register(bot);
  void app.register(feedback);
  void app.register(metrics);
  void app.register(db);
};
export default routes;
