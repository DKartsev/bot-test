import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

const BodySchema = z.object({
  response_id: z.string().uuid(),
  useful: z.boolean(),
  rating: z.number().int().min(1).max(5).optional(),
  note: z.string().max(2000).optional(),
  correction: z.string().max(8000).optional(),
  operator_id: z.string().max(128).optional(),
});

function assertAdmin(req: FastifyRequest) {
  const hdr = (req.headers["authorization"] as string) || "";
  const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : undefined;
  const x = (req.headers["x-admin-token"] as string) || bearer;
  const tokens = (process.env.ADMIN_API_TOKENS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!x || !tokens.includes(x)) {
    const err = new Error("unauthorized");
    (err as any).statusCode = 401;
    throw err;
  }
}

const plugin: FastifyPluginAsync = (app, _opts, done) => {
  app.post("/api/admin/feedback", async (req, reply) => {
    try {
      assertAdmin(req);
    } catch {
      void reply.code(401);
      return { error: "Unauthorized" };
    }

    const parse = BodySchema.safeParse(req.body);
    if (!parse.success) {
      void reply.code(400);
      return { error: "ValidationError", details: parse.error.flatten() };
    }
    const b = parse.data;
    try {
      await app.pg.query(
        `insert into bot_feedback (response_id, useful, rating, note, correction, operator_id)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          b.response_id,
          b.useful,
          b.rating ?? null,
          b.note ?? null,
          b.correction ?? null,
          b.operator_id ?? null,
        ],
      );
      return { ok: true };
    } catch (e: unknown) {
      req.log.error({ err: e }, "feedback insert failed");
      void reply.code(500);
      return { error: "InternalError" };
    }
  });
  done();
};

export default plugin;
