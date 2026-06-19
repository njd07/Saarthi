import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";

const JWT_SECRET = () => process.env.JWT_SECRET || "dev-secret-change-me";

export interface JWTPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET()) as JWTPayload;
}

/**
 * Hono middleware: requires a valid Bearer JWT.
 * Sets c.set("userId", ...) and c.set("email", ...) on success.
 */
export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const payload = verifyToken(header.slice(7));
    c.set("userId", payload.userId);
    c.set("email", payload.email);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
