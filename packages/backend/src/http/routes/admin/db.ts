import { FastifyPluginCallback } from "fastify";
import { assertAdmin, HttpError } from "../../auth.js";

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.get("/api/admin/db/ping", async (req, reply) => {
    try {
      assertAdmin(req);
    } catch (e) {
      const err = e as HttpError;
      void reply.code(err.statusCode || 401);
      return { error: "Unauthorized" };
    }
    try {
      const rs = await app.pg.query<{ now: string }>("select now() as now");
      const now: string | null = rs?.rows?.[0]?.now ?? null;
      return { ok: true, now };
    } catch (err) {
      app.log.error({ err }, "db ping failed");
      void reply.code(500);
      return { error: "InternalError" };
    }
  });
  done();
};
export default plugin;
