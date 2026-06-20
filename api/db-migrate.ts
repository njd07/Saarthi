import { getPool } from "./src/db.js";
async function run() {
  const p = getPool();
  try {
    await p.query("ALTER TABLE users ADD COLUMN clerk_id VARCHAR(255) UNIQUE;");
    console.log("Migration successful");
  } catch (e) {
    console.log(e);
  }
  await p.end();
}
run();
