import { createRouter } from "../types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Image generation via Pollinations.ai — no API key, no signup.
// Returns a direct PNG URL the frontend can render.
// ─────────────────────────────────────────────────────────────────────────────

const image = createRouter();

image.post("/", async (c) => {
  const { prompt } = await c.req.json();
  if (!prompt) {
    return c.json({ error: "prompt required" }, 400);
  }

  const cleanPrompt = `Clean educational illustration on a white background, no text or words inside the image. Subject: ${prompt}`;
  const encoded = encodeURIComponent(cleanPrompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=flux`;

  return c.json({ url, model: "pollinations/flux" });
});

export default image;
