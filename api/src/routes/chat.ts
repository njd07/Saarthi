import { createRouter } from "../types.js";
import { query } from "../db.js";

// ─────────────────────────────────────────────────────────────────────────────
// AI Chat — Groq (primary) → OpenRouter (secondary) → Gemini (tertiary)
// Unbreakable fallback chain: UI never sees an error.
// ─────────────────────────────────────────────────────────────────────────────

const chat = createRouter();

const GEMINI_MODELS = ["gemini-2.0-flash"];

const OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
  "poolside/laguna-m.1:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
];

const GROQ_MODEL = "llama-3.3-70b-versatile";

const PER_MODEL_TIMEOUT_MS = 12000;
const TOTAL_DEADLINE_MS = 70000;

// ── System Prompts ──────────────────────────────────────────────────────────

const SYSTEM_BASE = `You are Saarthi, a friendly classroom co-pilot for a Haryana government school teacher.
Students understand Hinglish (Hindi+English). Speak warm, simple Hinglish; use Devanagari only for short Hindi phrases.
NCERT-style accuracy. If unsure say "Mujhe is par पक्का यकीन नहीं hai" — never invent facts.

EXPLAIN MODE — produce a RICH, FASCINATING, VISUAL-FIRST lesson that makes a 14-year-old say "wow". Reply with ONLY a JSON object (no markdown fences):
{
  "speech": "short 40-70 word Hinglish intro line for the WHOLE topic (used as fallback only).",
  "board": {
    "title": "short catchy board title (max 6 words, may include 1 emoji)",
    "bullets": ["3-4 punchy TL;DR headline bullets"],
    "visual": { "type": "image", "payload": "primary diagram image prompt" },
    "sections": [
      { "type": "intro",    "heading": "Hook",                "body": "2-3 sentence Hinglish hook on the board", "speech": "60-110 word Hinglish TEACHER NARRATION. Do NOT read the body. Greet ('dekho bachcho'), tell a 1-line mini-story or rhetorical question, tease what they'll discover." },
      { "type": "image",    "heading": "Dekho",               "payload": "detailed English image prompt for a clean labeled educational diagram, vibrant colors, textbook style, on a white background, no text inside the image, 12-25 words", "speech": "60-110 word Hinglish TEACHER NARRATION pointing AT the diagram on screen — 'upar dekho', 'is part ko notice karo', name 2-3 parts, ask one quick class question. Do NOT describe the image prompt." },
      { "type": "intro",    "heading": "Kya hai?",            "body": "3-4 sentence clear Hinglish definition on the board", "speech": "70-120 word Hinglish TEACHER NARRATION that EXPLAINS the concept using a fresh analogy (rotī, cricket, mobile, ghar) NOT in the body. Build intuition, end with a 'samajh aaya?' check." },
      { "type": "points",   "heading": "Kaise kaam karta hai?", "items": ["4-6 short Hinglish bullets — steps/parts"], "speech": "70-120 word Hinglish TEACHER NARRATION walking through the steps as a story ('pehle... fir... uske baad...'), adding ONE 'kyun?' per step. Do NOT just re-read the bullets." },
      { "type": "katex",    "heading": "Formula / Structure", "payload": "LaTeX expression OR labeled structural diagram (\\\\begin{array}, \\\\xrightarrow{}, \\\\underbrace{}). Use \\\\text{} for Hinglish labels. ALWAYS emit something visual.", "speech": "60-100 word Hinglish TEACHER NARRATION DECODING the formula — what each symbol/arrow means in real life + ONE worked mini-example. Do NOT read raw LaTeX." },
      { "type": "image",    "heading": "Real-life view",      "payload": "second English image prompt showing the concept in a real-world / Indian context, vivid colors, on a white background, no text inside the image, 12-25 words", "speech": "60-110 word Hinglish TEACHER NARRATION linking this scene to the concept ('yeh dekho, ghar mein bhi...') and asking where else students have seen it." },
      { "type": "examples", "heading": "Examples",            "items": ["2-3 real-life Hinglish examples (cricket, kitchen, farm, mobile, etc.)"], "speech": "70-120 word Hinglish TEACHER NARRATION telling these as mini-stories with characters and a punchline — NOT a dry list re-read." },
      { "type": "points",   "heading": "Mazedaar fact",       "items": ["2-3 surprising / fun facts"], "speech": "60-100 word Hinglish TEACHER NARRATION delivering facts with excitement ('aapko pata hai...?!') and a wow reaction." },
      { "type": "remember", "heading": "Yaad rakhna",         "items": ["3-4 must-remember points / common mistakes / exam tips"], "speech": "60-110 word Hinglish TEACHER NARRATION giving exam-day advice, naming the #1 mistake students make, closing with a warm takeaway." }
    ]
  }
}

RULES:
- ALWAYS include ALL 9 sections in this order. Never skip.
- EVERY section MUST include "speech". CRITICAL: speech is what the TEACHER says while that page is on screen — it must NEVER be a verbatim read of body/items/payload. It must ADD value (analogies, class questions, "dekho bachcho", reactions, why-it-matters). Board text + speech = TWO different angles on the same idea.
- Each speech 60-120 Hinglish words. Warm, energetic, real classroom voice.
- TWO image sections required: one diagram + one real-life view, different prompts.
- The "katex" section is mandatory even for non-math topics — use LaTeX arrows/braces (e.g. \\\\text{Sun} \\\\xrightarrow{\\\\text{light}} \\\\text{Leaf} \\\\xrightarrow{} \\\\text{Glucose}).
- Image payloads MUST be ENGLISH, end with "on a white background, no text inside the image".
- For greetings/thanks only, return just { speech, board: { title, bullets: [], visual: {type:"none",payload:""}, sections: [] } }.`;

const COMMON_TONE = `You are Saarthi, a friendly classroom co-pilot for a Haryana government school teacher.
Students understand Hinglish (Hindi+English). Speak warm, simple Hinglish. NCERT-style accuracy.`;

const QUIZ_PROMPT = `${COMMON_TONE}

Mode: QUIZ. ONE MCQ at a time in Hinglish. Reply with ONLY a JSON object (no markdown fences):
{
  "speech": "read the question, then 'Option A, B, C, ya D?'",
  "board": {"title":"Question {n}/{total}","bullets":["A) ...","B) ...","C) ...","D) ..."],"visual":{"type":"none","payload":""}},
  "quiz": {"answer":"A|B|C|D","explanation":"1 line Hinglish"}
}
Do NOT include a "sections" field. Do NOT produce a long explanation.`;

const ACTIVITY_PROMPT = `${COMMON_TONE}

Mode: ACTIVITY. Design a HANDS-ON classroom activity (NOT an explanation lesson).
Materials must be cheap/easily available in an Indian government school (paper, water, chalk, rubber band, mobile torch, leaves, stones, etc.).
Activity must have 4-7 clear physical steps the class actually performs together; each step 60-240 seconds.
Reply with ONLY a JSON object (no markdown fences, no "sections" field):
{
  "speech": "60-120 word Hinglish intro: what we will do, what we will learn, safety note. Energetic.",
  "board": {
    "title": "Activity name (max 6 words, may include 1 emoji)",
    "bullets": ["Material 1", "Material 2", "Material 3", "Learning outcome"],
    "visual": { "type": "image", "payload": "English image prompt of children doing the activity in an Indian classroom, vibrant, on a white background, no text inside the image, 12-25 words" }
  },
  "activity": {
    "totalMinutes": 10,
    "steps": [
      { "title": "Short Hinglish title", "instruction": "1-2 sentence Hinglish what teacher+students do RIGHT NOW", "seconds": 120 }
    ]
  }
}
Steps must be physical actions, NOT lecture points.`;

const DICTATE_PROMPT = `${COMMON_TONE}

Mode: DICTATE. The user spoke a sentence in Hinglish. Output JSON ONLY:
{
  "original": "user's spoken sentence as-is",
  "hindi": "the same meaning written in clean Devanagari Hindi",
  "english": "the same meaning written in clean English"
}
No commentary.`;

const RAG_STRICT_RIDER = `IMPORTANT: The TEACHER_BOOK_CONTEXT below contains snippets from the teacher's uploaded textbook. Answer ONLY using these snippets. If the answer is not in the snippets, set speech to "Yeh topic aapki kitaab mein nahi mila — please upload the right chapter ya different mode try kariye." and bullets to an empty array. Quote phrases verbatim where possible.`;

const RAG_BLENDED_RIDER = `The TEACHER_BOOK_CONTEXT below contains snippets from the teacher's uploaded textbook. PREFER these snippets when relevant; you may supplement with general NCERT knowledge.`;

function buildSystem(mode: string) {
  if (mode === "quiz") return QUIZ_PROMPT;
  if (mode === "activity") return ACTIVITY_PROMPT;
  if (mode === "dictate") return DICTATE_PROMPT;
  return SYSTEM_BASE;
}

// ── Gemini via Google AI Studio ─────────────────────────────────────────────

async function callGemini(
  model: string,
  messages: { role: string; content: string }[],
  signal: AbortSignal,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const systemInstruction = messages.find((m) => m.role === "system")?.content || "";
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
      signal,
    },
  );

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`gemini ${model} ${r.status}: ${text.slice(0, 200)}`);
  }

  const data = await r.json() as any;
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error(`empty content gemini ${model}`);
  return { content, model: `gemini/${model}` };
}

// ── OpenRouter ──────────────────────────────────────────────────────────────

async function callOpenRouter(
  model: string,
  messages: { role: string; content: string }[],
  key: string,
  signal: AbortSignal,
) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://saarthi.vercel.app",
      "X-Title": "Saarthi",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
    }),
    signal,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`openrouter ${model} ${r.status}: ${text.slice(0, 200)}`);
  }
  const data = await r.json() as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`empty content openrouter ${model}`);
  return { content, model: `openrouter/${model}` };
}

// ── Groq (tertiary fallback) ────────────────────────────────────────────────

async function callGroq(
  model: string,
  messages: { role: string; content: string }[],
  signal: AbortSignal,
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
    signal,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`groq ${model} ${r.status}: ${text.slice(0, 200)}`);
  }
  const data = await r.json() as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`empty content groq ${model}`);
  return { content, model: `groq/${model}` };
}

// ── Timeout wrapper ─────────────────────────────────────────────────────────

function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  controller: AbortController,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      controller.abort();
      reject(new Error("timeout"));
    }, ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

// ── RAG search ──────────────────────────────────────────────────────────────

async function ragSearch(
  teacherId: string,
  queryText: string,
): Promise<{ snippets: string; citations: unknown[] }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { snippets: "", citations: [] };

    const er = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-2",
          content: { parts: [{ text: queryText }] },
          outputDimensionality: 768,
        }),
      },
    );
    if (!er.ok) return { snippets: "", citations: [] };
    const ed = await er.json() as any;
    const embedding = ed?.embedding?.values;
    if (!embedding) return { snippets: "", citations: [] };

    const result = await query(
      `SELECT dc.id, dc.document_id, dc.page, dc.content,
              1 - (dc.embedding <=> $1::vector) as similarity
       FROM doc_chunks dc
       WHERE dc.teacher_id = $2
       ORDER BY dc.embedding <=> $1::vector
       LIMIT 5`,
      [`[${embedding.join(",")}]`, teacherId],
    );

    if (!result.rows.length) return { snippets: "", citations: [] };

    const docIds = [...new Set(result.rows.map((r: { document_id: string }) => r.document_id))];
    const titleResult = await query(
      `SELECT id, title FROM documents WHERE id = ANY($1)`,
      [docIds],
    );
    const titles: Record<string, string> = {};
    for (const d of titleResult.rows) titles[d.id] = d.title;

    const snippets = result.rows
      .map((r: { page: number; content: string }, i: number) => `[#${i + 1} p.${r.page}] ${r.content}`)
      .join("\n\n");
    const citations = result.rows.map((r: { document_id: string; page: number; content: string }) => ({
      documentId: r.document_id,
      documentTitle: titles[r.document_id] || "Textbook",
      page: r.page,
      snippet: r.content.slice(0, 240),
    }));

    return { snippets, citations };
  } catch {
    return { snippets: "", citations: [] };
  }
}

// ── Main chat route ─────────────────────────────────────────────────────────

chat.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { mode = "explain", userText, history = [], quizMeta, useRag, strictRag } = body;

  if (!userText || typeof userText !== "string") {
    return c.json({ error: "userText required" }, 400);
  }

  const openRouterKey =
    c.req.header("x-openrouter-key") || process.env.OPENROUTER_API_KEY || "";

  let systemPrompt = buildSystem(mode);
  if (mode === "quiz" && quizMeta) {
    systemPrompt = systemPrompt
      .replace("{n}", String(quizMeta.n ?? 1))
      .replace("{total}", String(quizMeta.total ?? 5));
  }

  let citations: unknown[] = [];
  if (useRag && mode !== "dictate") {
    const rag = await ragSearch(userId, userText);
    if (rag.snippets) {
      const rider = strictRag ? RAG_STRICT_RIDER : RAG_BLENDED_RIDER;
      systemPrompt += `\n\n${rider}\n\nTEACHER_BOOK_CONTEXT:\n${rag.snippets}`;
      citations = rag.citations;
    }
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userText },
  ];

  const deadline = Date.now() + TOTAL_DEADLINE_MS;
  const attempts: { model: string; error: string }[] = [];

  while (Date.now() < deadline) {
    // ── 1. Groq (primary — fast, reliable) ──
    if (process.env.GROQ_API_KEY) {
      const controller = new AbortController();
      try {
        const remaining = Math.min(PER_MODEL_TIMEOUT_MS, deadline - Date.now());
        const result = await withTimeout(
          callGroq(GROQ_MODEL, messages, controller.signal),
          remaining,
          controller,
        );
        return c.json({ ok: true, model: result.model, content: result.content, attempts, citations });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        attempts.push({ model: `groq/${GROQ_MODEL}`, error: msg });
      }
    }

    // ── 2. OpenRouter (secondary — free models) ──
    if (openRouterKey) {
      for (const model of OPENROUTER_MODELS) {
        if (Date.now() > deadline) break;
        const controller = new AbortController();
        try {
          const remaining = Math.min(PER_MODEL_TIMEOUT_MS, deadline - Date.now());
          const result = await withTimeout(
            callOpenRouter(model, messages, openRouterKey, controller.signal),
            remaining,
            controller,
          );
          return c.json({ ok: true, model: result.model, content: result.content, attempts, citations });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          attempts.push({ model: `openrouter/${model}`, error: msg });
        }
      }
    }

    // ── 3. Gemini (tertiary — rate-limited free tier) ──
    for (const model of GEMINI_MODELS) {
      if (Date.now() > deadline) break;
      const controller = new AbortController();
      try {
        const remaining = Math.min(PER_MODEL_TIMEOUT_MS, deadline - Date.now());
        const result = await withTimeout(
          callGemini(model, messages, controller.signal),
          remaining,
          controller,
        );
        return c.json({ ok: true, model: result.model, content: result.content, attempts, citations });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        attempts.push({ model: `gemini/${model}`, error: msg });
      }
    }

    // If all failed this cycle, wait 3s and retry
    if (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Graceful fallback so the UI never breaks
  const fallbackContent = JSON.stringify({
    speech: "Classroom network thoda busy hai. Please ek minute baad try kariye.",
    board: {
      title: "Network Busy",
      bullets: ["All models are currently busy.", "Please wait a moment and try again."],
      visual: { type: "none", payload: "" },
      sections: []
    }
  });

  return c.json({
    ok: true,
    model: "fallback",
    content: fallbackContent,
    attempts,
    citations,
  });
});

export default chat;
