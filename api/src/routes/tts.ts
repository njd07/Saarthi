import { createRouter } from "../types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Text-to-Speech — ElevenLabs (primary, server-side key) → browser fallback
// ─────────────────────────────────────────────────────────────────────────────

const tts = createRouter();

tts.post("/", async (c) => {
  const { text, voice = "alloy" } = await c.req.json();
  if (!text || typeof text !== "string") {
    return c.json({ error: "text required" }, 400);
  }

  // Priority: user's BYO key > server-side env var
  const elevenKey =
    c.req.header("x-elevenlabs-key") || process.env.ELEVENLABS_API_KEY || "";
  const voiceId = c.req.header("x-voice-id") || "EXAVITQu4vr4xnSDxMaL"; // Bella - clear female multilingual

  if (!elevenKey) {
    // No ElevenLabs key available — tell frontend to use browser speechSynthesis
    return c.json({ fallback: true });
  }

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      const shouldFallback =
        r.status === 402 || r.status === 429 || r.status >= 500;
      return c.json(
        {
          error: `elevenlabs ${r.status} ${t}`,
          fallback: shouldFallback,
          status: r.status,
        },
        200,
      );
    }

    // Stream the audio back
    return new Response(r.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg, fallback: true }, 200);
  }
});

export default tts;
