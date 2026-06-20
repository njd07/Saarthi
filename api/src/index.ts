import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { authMiddleware } from "./middleware/auth.js";
import { clerkMiddleware } from "@hono/clerk-auth";
import type { AppVariables } from "./types.js";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import imageRoutes from "./routes/image.js";
import ttsRoutes from "./routes/tts.js";
import sttRoutes from "./routes/stt.js";
import ingestRoutes from "./routes/ingest.js";
import dataRoutes from "./routes/data.js";
import bootstrapRoutes from "./routes/bootstrap.js";

const app = new Hono<{ Variables: AppVariables }>();

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow configured frontend URL + localhost variants
      const allowed = [
        process.env.FRONTEND_URL || "http://localhost:5173",
        "http://localhost:5173",
        "http://localhost:3000",
      ];
      if (!origin || allowed.some((a) => origin.startsWith(a))) return origin || "*";
      // Allow any vercel.app, railway.app, or onrender.com domain
      if (origin.includes(".vercel.app") || origin.includes(".railway.app") || origin.includes(".onrender.com"))
        return origin;
      return "*";
    },
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-openrouter-key",
      "x-elevenlabs-key",
      "x-voice-id",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (c) =>
  c.json({ status: "ok", service: "saarthi-api", timestamp: new Date().toISOString() }),
);

// ── Clerk Auth Middleware ───────────────────────────────────────────────────
app.use("/api/*", clerkMiddleware());

// ── Public routes (no auth) ─────────────────────────────────────────────────
app.route("/api/auth", authRoutes);
app.route("/api/bootstrap-admin", bootstrapRoutes);

// ── Protected routes (require JWT) ──────────────────────────────────────────
app.use("/api/chat", authMiddleware);
app.use("/api/image", authMiddleware);
app.use("/api/tts", authMiddleware);
app.use("/api/stt", authMiddleware);
app.use("/api/ingest", authMiddleware);
app.use("/api/sessions/*", authMiddleware);
app.use("/api/interactions/*", authMiddleware);
app.use("/api/quiz-attempts/*", authMiddleware);
app.use("/api/speech-segments/*", authMiddleware);
app.use("/api/students/*", authMiddleware);
app.use("/api/documents/*", authMiddleware);
app.use("/api/admin/*", authMiddleware);

// Also protect the root-level data endpoints
app.use("/api/sessions", authMiddleware);
app.use("/api/interactions", authMiddleware);
app.use("/api/quiz-attempts", authMiddleware);
app.use("/api/speech-segments", authMiddleware);
app.use("/api/students", authMiddleware);
app.use("/api/documents", authMiddleware);

app.route("/api/chat", chatRoutes);
app.route("/api/image", imageRoutes);
app.route("/api/tts", ttsRoutes);
app.route("/api/stt", sttRoutes);
app.route("/api/ingest", ingestRoutes);
app.route("/api", dataRoutes);

// ── Start server ────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || "3001", 10);

console.log(`
  ╔══════════════════════════════════════════╗
  ║   🚀 Saarthi API — http://localhost:${port}  ║
  ╚══════════════════════════════════════════╝
`);

serve({ fetch: app.fetch, port });
