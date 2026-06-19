// IndexedDB-backed offline cache for transcripts, board payloads, and image blobs.
// Lets recent lessons keep working when the network drops.
import { openDB, type IDBPDatabase } from "idb";
import type { BoardPayload } from "./api";

const DB_NAME = "saarthi-cache";
const DB_VERSION = 1;

type DBSchema = {
  payloads: { key: string; value: { key: string; mode: string; userText: string; payload: BoardPayload; createdAt: number } };
  transcripts: { key: string; value: { key: string; text: string; createdAt: number } };
  images: { key: string; value: { key: string; blob: Blob; createdAt: number } };
};

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains("payloads")) d.createObjectStore("payloads", { keyPath: "key" });
        if (!d.objectStoreNames.contains("transcripts")) d.createObjectStore("transcripts", { keyPath: "key" });
        if (!d.objectStoreNames.contains("images")) d.createObjectStore("images", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function cachePayload(mode: string, userText: string, payload: BoardPayload) {
  try {
    const d = await db();
    const key = `${mode}::${norm(userText)}`;
    await d.put("payloads", { key, mode, userText, payload, createdAt: Date.now() });
    await trim(d, "payloads", 30);
  } catch {}
}

export async function getCachedPayload(mode: string, userText: string): Promise<BoardPayload | null> {
  try {
    const d = await db();
    const key = `${mode}::${norm(userText)}`;
    const hit = await d.get("payloads", key);
    if (hit) return hit.payload;
    // fuzzy: find most-recent same-mode entry containing words
    const all = await d.getAll("payloads");
    const sameMode = all.filter((x: any) => x.mode === mode).sort((a: any, b: any) => b.createdAt - a.createdAt);
    const words = norm(userText).split(" ").filter((w) => w.length > 3);
    const fuzzy = sameMode.find((x: any) =>
      words.length === 0 ? false : words.some((w) => norm(x.userText).includes(w)),
    );
    return fuzzy?.payload ?? sameMode[0]?.payload ?? null;
  } catch {
    return null;
  }
}

export async function cacheTranscript(text: string) {
  try {
    const d = await db();
    const key = String(Date.now());
    await d.put("transcripts", { key, text, createdAt: Date.now() });
    await trim(d, "transcripts", 20);
  } catch {}
}

export async function cacheImage(promptKey: string, url: string) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const d = await db();
    await d.put("images", { key: promptKey, blob, createdAt: Date.now() });
    await trim(d, "images", 15);
  } catch {}
}

export async function getCachedImageUrl(promptKey: string): Promise<string | null> {
  try {
    const d = await db();
    const hit = await d.get("images", promptKey);
    return hit ? URL.createObjectURL(hit.blob) : null;
  } catch {
    return null;
  }
}

async function trim(d: IDBPDatabase, store: keyof DBSchema, limit: number) {
  const all = await d.getAll(store as string);
  if (all.length <= limit) return;
  const sorted = all.sort((a: any, b: any) => b.createdAt - a.createdAt);
  const tx = d.transaction(store as string, "readwrite");
  for (const old of sorted.slice(limit)) await tx.store.delete((old as any).key);
  await tx.done;
}

export function useOnlineStatus() {
  // tiny utility hook
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}
