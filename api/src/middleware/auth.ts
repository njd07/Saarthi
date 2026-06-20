import type { Context, Next } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { query } from "../db.js";

export async function authMiddleware(c: Context, next: Next) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Find or create internal user linking to Clerk ID
  const res = await query("SELECT id FROM users WHERE clerk_id = $1", [auth.userId]);
  let internalUserId;
  if (res.rows.length === 0) {
    // Insert new user stub. The frontend doesn't need /register anymore.
    const insert = await query(
      "INSERT INTO users (email, password_hash, full_name, clerk_id) VALUES ($1, $2, $3, $4) RETURNING id",
      ["no-email@clerk.com", "", "Clerk User", auth.userId]
    );
    internalUserId = insert.rows[0].id;
    // Create profile
    await query(
      "INSERT INTO profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
      [internalUserId, "Clerk User"]
    );
  } else {
    internalUserId = res.rows[0].id;
  }

  c.set("userId", internalUserId);
  c.set("email", "clerk@user.com"); // We no longer strictly need email here
  await next();
}
