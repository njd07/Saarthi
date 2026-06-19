// Client-side settings storage for BYO API keys + voice preferences.
export type AppSettings = {
  openRouterKey: string;
  elevenLabsKey: string;
  elevenLabsVoiceId: string;
  voice: string;
  speechRate: number;
  strictRag: boolean; // if true, ai-chat answers ONLY from uploaded docs when any exist
};

const KEY = "saarthi.settings.v1";

const DEFAULTS: AppSettings = {
  openRouterKey: "",
  elevenLabsKey: "",
  elevenLabsVoiceId: "JBFqnCBsd6RMkjVDRZzb",
  voice: "alloy",
  speechRate: 1,
  strictRag: false, // blended by default per teacher preference
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed, speechRate: Math.max(0.5, parsed.speechRate ?? 1) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
