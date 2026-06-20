// Client-side settings storage for voice preferences.
export type AppSettings = {
  openRouterKey: string;
  voice: string;
  speechRate: number;
  strictRag: boolean;
};

const KEY = "saarthi.settings.v1";

const DEFAULTS: AppSettings = {
  openRouterKey: "",
  voice: "hi-IN-SwaraNeural",
  speechRate: 1,
  strictRag: false,
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
