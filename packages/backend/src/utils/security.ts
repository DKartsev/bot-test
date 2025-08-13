import { createHash } from "crypto";

/**
 * Hashes a token using SHA256 for secure logging and storage.
 * @param token The token to hash.
 * @returns A hex-encoded hash of the token.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Parses a Bearer token from an Authorization header.
 * @param authHeader The value of the Authorization header.
 * @returns The token or null if not found.
 */
export function parseBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.*)$/i);
  return match ? match[1].trim() : null;
}
