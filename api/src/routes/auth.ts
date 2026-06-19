import { createRouter } from "../types.js";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { signToken } from "../middleware/auth.js";

const auth = createRouter();

// ── Register ────────────────────────────────────────────────────────────────
auth.post("/register", async (c) => {
  const { email, password, fullName } = await c.req.json();
  if (!email || !password || !fullName) {
    return c.json({ error: "email, password, and fullName are required" }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters" }, 400);
  }

  // Check if user exists
  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    return c.json({ error: "An account with this email already exists" }, 409);
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    "INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id",
    [email, hash, fullName],
  );
  const userId = result.rows[0].id;

  // Create profile
  await query(
    "INSERT INTO profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
    [userId, fullName],
  );

  const token = signToken({ userId, email });
  return c.json({ ok: true, token, user: { id: userId, email, fullName } });
});

// ── Login ───────────────────────────────────────────────────────────────────
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const result = await query(
    "SELECT id, email, password_hash, full_name FROM users WHERE email = $1",
    [email],
  );
  if (!result.rows.length) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = signToken({ userId: user.id, email: user.email });
  return c.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, fullName: user.full_name },
  });
});

// ── Me (get current user profile) ───────────────────────────────────────────
auth.get("/me", async (c) => {
  // This route uses the auth middleware (applied at mount time)
  const userId = c.get("userId") as string;
  const result = await query(
    `SELECT u.id, u.email, u.full_name, p.avatar_url, p.job_title
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  if (!result.rows.length) {
    return c.json({ error: "User not found" }, 404);
  }
  const row = result.rows[0];
  return c.json({
    user: {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      jobTitle: row.job_title,
    },
  });
});

export default auth;
