import { FastifyRequest } from "fastify";

export class HttpError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const assertAdmin = (req: FastifyRequest) => {
  const hdr = (req.headers["authorization"] as string) || "";
  const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : undefined;
  const x = (req.headers["x-admin-token"] as string) || bearer;
  const tokens = (process.env.ADMIN_API_TOKENS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!x || !tokens.includes(x)) {
    throw new HttpError("unauthorized", 401);
  }
};
