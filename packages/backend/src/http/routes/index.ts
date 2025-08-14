import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import bot from "./bot.js";
import admin from "./admin/index.js";

const routes: FastifyPluginAsync = async (app) => {
  await app.register(bot);
  await app.register(admin);
};
