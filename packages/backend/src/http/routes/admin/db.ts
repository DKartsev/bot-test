import { FastifyPluginAsync } from "fastify";

const assertAdmin = (req: any) => {
  const hdr = (req.headers["authorization"] as string) || "";
  const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : undefined;
  const x = (req.headers["x-admin-token"] as string) || bearer;
  const tokens = (process.env.ADMIN_API_TOKENS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!x || !tokens.includes(x)) { const e: any = new Error("unauthorized"); e.statusCode = 401; throw e; }
};

const plugin: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/db/ping", async (req, reply) => {
    try { assertAdmin(req); } catch { reply.code(401); return { error: "Unauthorized" }; }
    try {
      const rs = await app.pg.query<{ now: string }>("select now() as now");
      const now: string | null = rs?.rows?.[0]?.now ?? null;
      return { ok: true, now };
    } catch (err) {
      app.log.error({ err }, "db ping failed");
      reply.code(500); return { error: "InternalError" };
    }
  });
};
export default plugin;
