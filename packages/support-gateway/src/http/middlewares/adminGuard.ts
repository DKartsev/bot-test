import { FastifyRequest, FastifyReply } from "fastify";

export async function adminGuard(req: FastifyRequest, reply: FastifyReply) {
  const tokens = (process.env.ADMIN_API_TOKENS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let token: string | undefined;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    token = auth.slice("Bearer ".length).trim();
  } else if (typeof req.headers["x-admin-token"] === "string") {
    token = String(req.headers["x-admin-token"]).trim();
  }

  if (token && tokens.includes(token)) return;

  reply.code(401).send({ error: "unauthorized" });
}

export default adminGuard;
