import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const p = getPool();
  return p.query(text, params);
}

/** Run the schema.sql to initialize the database. */
export async function initDB() {
  const fs = await import("fs");
  const path = await import("path");
  const url = await import("url");
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const sql = fs.readFileSync(path.join(__dirname, "..", "src", "schema.sql"), "utf-8");
  const p = getPool();
  await p.query(sql);
  console.log("✅ Database schema initialized");
  await p.end();
}
