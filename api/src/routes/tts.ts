import { createRouter } from "../types.js";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// ─────────────────────────────────────────────────────────────────────────────
// Text-to-Speech — Free Microsoft Edge TTS (no API key needed!)
// Uses hi-IN-SwaraNeural (female) for natural Hindi/Hinglish narration.
// ─────────────────────────────────────────────────────────────────────────────

const tts = createRouter();

tts.post("/", async (c) => {
  const { text } = await c.req.json();
  if (!text || typeof text !== "string") {
    return c.json({ error: "text required" }, 400);
  }

  try {
    const edgeTts = new MsEdgeTTS();
    await edgeTts.setMetadata("hi-IN-SwaraNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const readable = edgeTts.toStream(text);

    // Collect chunks into a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      return c.json({ fallback: true, message: "Edge TTS returned empty audio" });
    }

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Edge TTS error:", msg);
    return c.json({ fallback: true, message: msg });
  }
});

export default tts;
