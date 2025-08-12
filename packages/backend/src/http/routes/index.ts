import { FastifyPluginAsync } from "fastify";
import bot from "./bot.js";
import adminFeedback from "./admin/feedback.js";
import adminMetrics from "./admin/metrics.js";
import adminDb from "./admin/db.js";

const routes: FastifyPluginAsync = async (app) => {
  await app.register(bot);
  await app.register(adminFeedback);
  await app.register(adminMetrics);
  await app.register(adminDb);
};

export default routes;
