import { createRouter } from "../types.js";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// ─────────────────────────────────────────────────────────────────────────────
// Text-to-Speech — Free Microsoft Edge TTS (no API key needed!)
// Uses hi-IN-SwaraNeural (female) for natural Hindi/Hinglish narration.
// ─────────────────────────────────────────────────────────────────────────────

const tts = createRouter();

tts.post("/", async (c) => {
  const { text } = await c.req.json();
  const cleanText = text.replace(/[\*\#\_\[\]]/g, "").trim();
  if (!cleanText) {
    return c.json({ error: "text required" }, 400);
  }

  try {
    const edgeTts = new MsEdgeTTS();
    await edgeTts.setMetadata("hi-IN-SwaraNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    let audioBuffer: Buffer | null = null;
    let retries = 2;
    let lastError: unknown;

    while (retries > 0) {
      try {
        const { audioStream } = edgeTts.toStream(cleanText);
        const chunks: Buffer[] = [];
        await new Promise((resolve, reject) => {
          audioStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
          audioStream.on("end", () => resolve(null));
          audioStream.on("error", reject);
        });
        audioBuffer = Buffer.concat(chunks);
        break; // Success
      } catch (err) {
        lastError = err;
        retries--;
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 800)); // wait 800ms before retry
        }
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw lastError || new Error("Edge TTS returned empty audio");
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
