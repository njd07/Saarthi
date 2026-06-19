import { createRouter } from "../types.js";
import bcrypt from "bcryptjs";
import { query } from "../db.js";

// ─────────────────────────────────────────────────────────────────────────────
// One-time bootstrap: creates admin@gmail.com / admin123 and grants admin role.
// ─────────────────────────────────────────────────────────────────────────────

const bootstrap = createRouter();

bootstrap.post("/", async (c) => {
  try {
    // Check if admin already exists
    const existing = await query("SELECT id FROM users WHERE email = $1", [
      "admin@gmail.com",
    ]);

    let userId: string;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
    } else {
      // Create admin user
      const hash = await bcrypt.hash("admin123", 10);
      const result = await query(
        "INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id",
        ["admin@gmail.com", hash, "Admin"],
      );
      userId = result.rows[0].id;

      // Create profile
      await query(
        "INSERT INTO profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
        [userId, "Admin"],
      );
    }

    // Upsert admin role
    await query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')
       ON CONFLICT (user_id, role) DO NOTHING`,
      [userId],
    );

    return c.json({
      ok: true,
      email: "admin@gmail.com",
      password: "admin123",
      message:
        "Admin account ready. Please change the password from Settings after first login.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ ok: false, error: msg }, 500);
  }
});

export default bootstrap;
