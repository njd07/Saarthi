import { authFetch } from "./auth";
import { loadSettings } from "./settings";
import { cachePayload, getCachedPayload, cacheImage, getCachedImageUrl } from "./offlineCache";

const API_BASE = () => `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api`;

export type Citation = { documentId: string; documentTitle?: string; page: number; snippet: string };

export type BoardSection =
  | { type: "intro" | "points" | "examples" | "remember"; heading: string; body?: string; items?: string[]; speech?: string }
  | { type: "image"; heading: string; payload: string; speech?: string }
  | { type: "katex"; heading: string; payload: string; speech?: string };

export type BoardPayload = {
  speech: string;
  board: {
    title: string;
    bullets: string[];
    visual: { type: "image" | "katex" | "none"; payload: string };
    sections?: BoardSection[];
  };
  quiz?: { answer: string; explanation: string };
  citations?: Citation[];
};

export type DictatePayload = { original: string; hindi: string; english: string };

// Global mute flag — when true, speak() returns null immediately
let _globalMuted = false;
export function setMuted(m: boolean) {
  _globalMuted = m;
  if (m) {
    try { window.speechSynthesis?.cancel(); } catch {}
  }
}

export async function askAI(opts: {
  mode: "explain" | "quiz";
  userText: string;
  history?: { role: "user" | "assistant"; content: string }[];
  quizMeta?: { n: number; total: number };
  useRag?: boolean;
  strictRag?: boolean;
}): Promise<{ payload: BoardPayload; model: string; offline?: boolean }> {
  const s = loadSettings();
  try {
    const headers: Record<string, string> = {};
    if (s.openRouterKey) headers["x-openrouter-key"] = s.openRouterKey;

    const r = await authFetch(`/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(opts),
    });
    const data = await r.json();
    if (!r.ok || !data.ok) throw new Error(data?.error || `chat ${r.status}`);
    let parsed: BoardPayload;
    try {
      parsed = JSON.parse(data.content);
    } catch {
      parsed = JSON.parse(String(data.content).replace(/```json|```/g, "").trim());
    }
    if (data.citations) parsed.citations = data.citations;
    cachePayload(opts.mode, opts.userText, parsed);
    return { payload: parsed, model: data.model };
  } catch (e) {
    const cached = await getCachedPayload(opts.mode, opts.userText);
    if (cached) return { payload: cached, model: "offline-cache", offline: true };
    throw e;
  }
}

export async function dictate(text: string): Promise<DictatePayload> {
  const s = loadSettings();
  const headers: Record<string, string> = {};
  if (s.openRouterKey) headers["x-openrouter-key"] = s.openRouterKey;

  const r = await authFetch(`/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ mode: "dictate", userText: text }),
  });
  const data = await r.json();
  if (!r.ok || !data.ok) throw new Error(data?.error || `dictate ${r.status}`);
  try {
    return JSON.parse(data.content);
  } catch {
    return JSON.parse(String(data.content).replace(/```json|```/g, "").trim());
  }
}

export async function transcribe(blob: Blob): Promise<string> {
  if (!navigator.onLine) throw new Error("Offline — type your question instead.");
  const fd = new FormData();
  fd.append("file", blob, "rec.webm");
  const r = await authFetch(`/api/stt`, {
    method: "POST",
    body: fd,
  });
  const data = await r.json();
  if (data.fallback) throw new Error("Use browser speech recognition");
  if (!r.ok) throw new Error(data?.error || `stt ${r.status}`);
  return data.text || "";
}

function speakWithBrowser(text: string, rate: number, autoplay = true): HTMLAudioElement | null {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = Math.max(0.5, rate || 1);
    u.lang = "hi-IN";
    const fake = new Audio();
    let started = false;
    const startSpeech = () => {
      if (started) return Promise.resolve();
      started = true;
      window.speechSynthesis.speak(u);
      return Promise.resolve();
    };
    Object.defineProperty(fake, "play", { value: startSpeech });
    Object.defineProperty(fake, "pause", { value: () => window.speechSynthesis.cancel() });
    u.onend = () => fake.dispatchEvent(new Event("ended"));
    if (autoplay) startSpeech();
    return fake;
  } catch {
    return null;
  }
}

export async function speak(
  text: string,
  opts: { autoplay?: boolean } = {},
): Promise<HTMLAudioElement | null> {
  // Hard block if globally muted
  if (_globalMuted) return null;

  const autoplay = opts.autoplay ?? true;
  const s = loadSettings();
  const rate = Math.max(0.5, s.speechRate);
  try {
    const r = await authFetch(`/api/tts`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    const ct = r.headers.get("Content-Type") || "";
    if (ct.includes("application/json")) {
      const j = await r.json().catch(() => null);
      if (j?.fallback) return speakWithBrowser(text, rate, autoplay);
      return null;
    }
    if (!r.ok) return speakWithBrowser(text, rate, autoplay);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = rate;
    await new Promise<void>((res) => {
      if (audio.readyState >= 3) return res();
      const done = () => { audio.removeEventListener("canplaythrough", done); audio.removeEventListener("error", done); res(); };
      audio.addEventListener("canplaythrough", done, { once: true });
      audio.addEventListener("error", done, { once: true });
      setTimeout(done, 6000);
    });
    // Re-check mute after async wait
    if (_globalMuted) return null;
    if (autoplay) audio.play().catch(() => {});
    return audio;
  } catch {
    return speakWithBrowser(text, rate, autoplay);
  }
}

export async function generateImage(prompt: string): Promise<string | null> {
  const cached = await getCachedImageUrl(prompt);
  if (cached) return cached;
  if (!navigator.onLine) return null;
  try {
    const cleanPrompt = `Clean educational illustration on a white background, no text or words inside the image. Subject: ${prompt}`;
    const encoded = encodeURIComponent(cleanPrompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=flux`;
    cacheImage(prompt, url);
    return url;
  } catch {
    return null;
  }
}

// ---- Session logging ----

export async function startSession(title: string): Promise<string | null> {
  try {
    const r = await authFetch(`/api/sessions`, { method: "POST", body: JSON.stringify({ title }) });
    if (!r.ok) return null;
    const data = await r.json();
    return data.id;
  } catch { return null; }
}

export async function logInteraction(args: {
  sessionId: string | null; studentId: string | null; mode: string; prompt: string;
  response: string; model: string; durationMs: number;
}) {
  try { await authFetch(`/api/interactions`, { method: "POST", body: JSON.stringify(args) }); } catch {}
}

export async function logQuizAttempt(args: {
  sessionId: string | null; studentId: string | null; question: string; chosen: string;
  correctAnswer: string; isCorrect: boolean;
}) {
  try { await authFetch(`/api/quiz-attempts`, { method: "POST", body: JSON.stringify(args) }); } catch {}
}

export async function logSpeech(args: { sessionId: string | null; studentId: string | null; seconds: number }) {
  if (args.seconds <= 0) return;
  try { await authFetch(`/api/speech-segments`, { method: "POST", body: JSON.stringify(args) }); } catch {}
}

// ---- Documents / RAG ----

export async function uploadDocument(file: File): Promise<{ id: string } | null> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await authFetch(`/api/ingest`, { method: "POST", body: fd });
  const data = await r.json();
  if (!data.ok && data.error) throw new Error(data.error);
  return data.documentId ? { id: data.documentId } : null;
}
