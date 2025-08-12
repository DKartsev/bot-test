import { FastifyPluginAsync } from "fastify";
import bot from "./bot.js";
import adminFeedback from "./admin/feedback.js";
import adminMetrics from "./admin/metrics.js";

const routes: FastifyPluginAsync = async (app) => {
  await app.register(bot);
  await app.register(adminFeedback);
  await app.register(adminMetrics);
};

export default routes;
