import { FastifyPluginAsync } from "fastify";
import bot from "./bot.js";
import feedback from "./admin/feedback.js";
import metrics from "./admin/metrics.js";
import db from "./admin/db.js";

const routes: FastifyPluginAsync = (app, _opts, done) => {
  void app.register(bot);
  void app.register(feedback);
  void app.register(metrics);
  void app.register(db);
  done();
};
export default routes;
