import { createRouter } from "../types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Speech-to-Text via Groq Whisper (whisper-large-v3) — lightning fast,
// natively handles Hindi/Hinglish. Falls back to browser STT if no key.
// ─────────────────────────────────────────────────────────────────────────────

const stt = createRouter();

stt.post("/", async (c) => {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return c.json({ fallback: true, message: "Use browser Web Speech API" });
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return c.json({ error: "audio file required" }, 400);
    }

    // Forward to Groq Whisper
    const groqForm = new FormData();
    groqForm.append("file", file, file.name || "audio.webm");
    groqForm.append("model", "whisper-large-v3");
    groqForm.append("language", "hi");
    groqForm.append("response_format", "json");
    groqForm.append("prompt", "Transcribe in romanized English/Latin script only. Never use Devanagari. Example: namaste, photosynthesis samjhao, quiz on fractions. Always write Hindi words in English letters.");

    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: groqForm,
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error(`Groq Whisper ${r.status}: ${errText.slice(0, 200)}`);
      return c.json({ fallback: true, message: "Groq Whisper unavailable" });
    }

    const data = await r.json() as any;
    const text = data?.text || "";
    return c.json({ text, model: "groq/whisper-large-v3" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("STT error:", msg);
    return c.json({ fallback: true, message: msg });
  }
});

export default stt;
