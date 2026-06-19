import { createRouter } from "../types.js";
import { query } from "../db.js";

// ─────────────────────────────────────────────────────────────────────────────
// CRUD routes for sessions, interactions, students, quiz_attempts,
// speech_segments, documents — all scoped to the authenticated teacher.
// ─────────────────────────────────────────────────────────────────────────────

const data = createRouter();

// ── Sessions ────────────────────────────────────────────────────────────────

data.post("/sessions", async (c) => {
  const userId = c.get("userId") as string;
  const { title } = await c.req.json();
  const result = await query(
    "INSERT INTO sessions (teacher_id, title) VALUES ($1, $2) RETURNING id",
    [userId, title || `Session ${new Date().toLocaleString()}`],
  );
  return c.json({ id: result.rows[0].id });
});

data.get("/sessions", async (c) => {
  const userId = c.get("userId") as string;
  const result = await query(
    "SELECT id, title, started_at FROM sessions WHERE teacher_id = $1 ORDER BY started_at DESC",
    [userId],
  );
  return c.json({ data: result.rows });
});

// ── Interactions ─────────────────────────────────────────────────────────────

data.post("/interactions", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  await query(
    `INSERT INTO interactions (teacher_id, session_id, student_id, mode, prompt, response, model, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      body.sessionId,
      body.studentId,
      body.mode,
      body.prompt,
      body.response,
      body.model,
      body.durationMs,
    ],
  );
  return c.json({ ok: true });
});

data.get("/interactions", async (c) => {
  const userId = c.get("userId") as string;
  const sessionId = c.req.query("sessionId");
  if (sessionId) {
    const result = await query(
      "SELECT * FROM interactions WHERE teacher_id = $1 AND session_id = $2",
      [userId, sessionId],
    );
    return c.json({ data: result.rows });
  }
  const result = await query(
    "SELECT student_id, mode FROM interactions WHERE teacher_id = $1",
    [userId],
  );
  return c.json({ data: result.rows });
});

// ── Quiz Attempts ────────────────────────────────────────────────────────────

data.post("/quiz-attempts", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  await query(
    `INSERT INTO quiz_attempts (teacher_id, session_id, student_id, question, chosen, correct_answer, is_correct)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      body.sessionId,
      body.studentId,
      body.question,
      body.chosen,
      body.correctAnswer,
      body.isCorrect,
    ],
  );
  return c.json({ ok: true });
});

data.get("/quiz-attempts", async (c) => {
  const userId = c.get("userId") as string;
  const sessionId = c.req.query("sessionId");
  if (sessionId) {
    const result = await query(
      "SELECT student_id, is_correct FROM quiz_attempts WHERE teacher_id = $1 AND session_id = $2",
      [userId, sessionId],
    );
    return c.json({ data: result.rows });
  }
  const result = await query(
    "SELECT student_id, is_correct FROM quiz_attempts WHERE teacher_id = $1",
    [userId],
  );
  return c.json({ data: result.rows });
});

// ── Speech Segments ──────────────────────────────────────────────────────────

data.post("/speech-segments", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  if (!body.seconds || body.seconds <= 0) return c.json({ ok: true });
  await query(
    `INSERT INTO speech_segments (teacher_id, session_id, student_id, seconds)
     VALUES ($1, $2, $3, $4)`,
    [userId, body.sessionId, body.studentId, body.seconds],
  );
  return c.json({ ok: true });
});

data.get("/speech-segments", async (c) => {
  const userId = c.get("userId") as string;
  const sessionId = c.req.query("sessionId");
  if (sessionId) {
    const result = await query(
      "SELECT student_id, seconds FROM speech_segments WHERE teacher_id = $1 AND session_id = $2",
      [userId, sessionId],
    );
    return c.json({ data: result.rows });
  }
  const result = await query(
    "SELECT student_id, seconds FROM speech_segments WHERE teacher_id = $1",
    [userId],
  );
  return c.json({ data: result.rows });
});

// ── Students ─────────────────────────────────────────────────────────────────

data.get("/students", async (c) => {
  const userId = c.get("userId") as string;
  const result = await query(
    "SELECT id, name FROM students WHERE teacher_id = $1 ORDER BY name",
    [userId],
  );
  return c.json({ data: result.rows });
});

data.post("/students", async (c) => {
  const userId = c.get("userId") as string;
  const { name } = await c.req.json();
  if (!name?.trim()) return c.json({ error: "name required" }, 400);
  const result = await query(
    "INSERT INTO students (teacher_id, name) VALUES ($1, $2) RETURNING id, name",
    [userId, name.trim()],
  );
  return c.json(result.rows[0]);
});

data.delete("/students/:id", async (c) => {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  await query("DELETE FROM students WHERE id = $1 AND teacher_id = $2", [id, userId]);
  return c.json({ ok: true });
});

// ── Documents ────────────────────────────────────────────────────────────────

data.get("/documents", async (c) => {
  const userId = c.get("userId") as string;
  const result = await query(
    "SELECT id, title, status, pages, error, created_at, storage_path FROM documents WHERE teacher_id = $1 ORDER BY created_at DESC",
    [userId],
  );
  return c.json({ data: result.rows });
});

data.get("/documents/count", async (c) => {
  const userId = c.get("userId") as string;
  const result = await query(
    "SELECT COUNT(*) as count FROM documents WHERE teacher_id = $1 AND status = 'ready'",
    [userId],
  );
  return c.json({ count: parseInt(result.rows[0].count) });
});

data.delete("/documents/:id", async (c) => {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  // Delete chunks first
  await query("DELETE FROM doc_chunks WHERE document_id = $1 AND teacher_id = $2", [id, userId]);
  await query("DELETE FROM documents WHERE id = $1 AND teacher_id = $2", [id, userId]);
  return c.json({ ok: true });
});

// ── Admin stats ──────────────────────────────────────────────────────────────

data.get("/admin/stats", async (c) => {
  const userId = c.get("userId") as string;
  // Check admin role
  const roleCheck = await query(
    "SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'",
    [userId],
  );
  if (!roleCheck.rows.length) return c.json({ error: "Forbidden" }, 403);

  const [teachers, students, sessions, interactions, quizzes, modelRows] =
    await Promise.all([
      query("SELECT COUNT(*) as count FROM users"),
      query("SELECT COUNT(*) as count FROM students"),
      query("SELECT COUNT(*) as count FROM sessions"),
      query("SELECT COUNT(*) as count FROM interactions"),
      query("SELECT COUNT(*) as count FROM quiz_attempts"),
      query("SELECT model FROM interactions"),
    ]);

  return c.json({
    stats: {
      teachers: parseInt(teachers.rows[0].count),
      students: parseInt(students.rows[0].count),
      sessions: parseInt(sessions.rows[0].count),
      interactions: parseInt(interactions.rows[0].count),
      quizzes: parseInt(quizzes.rows[0].count),
    },
    models: modelRows.rows,
  });
});

data.get("/admin/check", async (c) => {
  const userId = c.get("userId") as string;
  const result = await query(
    "SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'",
    [userId],
  );
  return c.json({ isAdmin: result.rows.length > 0 });
});

export default data;
