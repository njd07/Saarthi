import { createRouter } from "../types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Speech-to-Text — browser Web Speech API is the default (zero cost).
// This server route exists as an optional high-accuracy fallback via Groq Whisper.
// If no GROQ key is set, returns fallback signal so frontend uses browser STT.
// ─────────────────────────────────────────────────────────────────────────────

const stt = createRouter();

stt.post("/", async (c) => {
  // For now, the STT is handled entirely in the browser via Web Speech API.
  // This endpoint is a placeholder for future Groq Whisper integration.
  return c.json({
    fallback: true,
    message: "Use browser Web Speech API for speech-to-text",
  });
});

export default stt;
