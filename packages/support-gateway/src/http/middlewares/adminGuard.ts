import { FastifyRequest, FastifyReply } from "fastify";

let josePromise: Promise<typeof import("jose")> | undefined;
async function getJose() {
  if (!josePromise) josePromise = import("jose");
  return josePromise;
}

export async function adminGuard(req: FastifyRequest, reply: FastifyReply) {
  const tokens = (process.env.ADMIN_API_TOKENS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const apiKey = req.headers["x-admin-api-key"];
  if (apiKey && tokens.includes(String(apiKey))) return;

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "missing bearer token or admin api key" });
    return;
  }
  const token = auth.slice("Bearer ".length);
  try {
    const ISS = process.env.JWT_ISSUER || "";
    const AUD = process.env.JWT_AUDIENCE || "admin";
    const JWKS_URL = process.env.JWT_JWKS_URL || "";
    const PUB = process.env.JWT_PUBLIC_KEY || "";
    const { createRemoteJWKSet, jwtVerify } = await getJose();
    const JWKS = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : undefined;
    const key = JWKS || (PUB ? new TextEncoder().encode(PUB) : undefined);
    const { payload } = await jwtVerify(token, key as any, {
      issuer: ISS || undefined,
      audience: AUD,
    });
    const role = (payload as any).role;
    const scopes = ((payload as any).scopes ?? []) as string[];
    if (role === "admin" || scopes.includes("admin")) return;
    reply.code(403).send({ error: "forbidden" });
  } catch {
    reply.code(401).send({ error: "invalid token" });
  }
}
