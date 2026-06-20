import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "katex/dist/katex.min.css";
import katex from "katex";
import { generateImage, type BoardPayload, type BoardSection } from "@/lib/api";
import {
  Loader2,
  BookOpen,
  ImageIcon,
  ListChecks,
  Sigma,
  Lightbulb,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function renderKatex(src: string) {
  try {
    return katex.renderToString(src, { throwOnError: false, displayMode: true });
  } catch {
    return "";
  }
}

const ICON: Record<string, typeof BookOpen> = {
  intro: BookOpen,
  image: ImageIcon,
  points: ListChecks,
  katex: Sigma,
  examples: Lightbulb,
  remember: AlertCircle,
};

function SectionView({
  s,
  preloaded,
}: {
  s: BoardSection;
  preloaded: Record<string, string>;
}) {
  const Icon = ICON[s.type] || BookOpen;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-primary">
        <Icon className="h-4 w-4" />
        <h3 className="text-xs uppercase tracking-[0.18em] font-semibold">{s.heading}</h3>
      </div>
      {"body" in s && s.body && (
        <p className="text-lg sm:text-2xl text-foreground/90 leading-relaxed">{s.body}</p>
      )}
      {"items" in s && s.items && (
        <ul className="space-y-3">
          {s.items.map((it, k) => (
            <li
              key={k}
              className="flex gap-3 text-lg sm:text-xl text-foreground/90 leading-snug"
            >
              <span className="text-primary font-bold shrink-0">
                {s.type === "remember" ? "!" : "•"}
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
      {s.type === "image" && (
        <div className="flex items-center justify-center bg-muted/30 rounded-lg min-h-[280px] p-4 mt-2">
          {preloaded[s.payload] ? (
            <motion.img
              src={preloaded[s.payload]}
              alt={s.heading}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-h-[440px] w-auto object-contain rounded-md"
            />
          ) : (
            <span className="text-sm text-muted-foreground">Image unavailable</span>
          )}
        </div>
      )}
      {s.type === "katex" && (
        <div
          className="text-2xl sm:text-4xl text-foreground overflow-x-auto py-4"
          dangerouslySetInnerHTML={{ __html: renderKatex(s.payload) }}
        />
      )}
    </div>
  );
}

// Group raw sections into logical sub-pages so each page tells a small story.
function groupIntoPages(sections: BoardSection[]): BoardSection[][] {
  if (!sections.length) return [];
  const pages: BoardSection[][] = [];
  let current: BoardSection[] = [];
  const flush = () => {
    if (current.length) {
      pages.push(current);
      current = [];
    }
  };
  for (const s of sections) {
    // Images and katex get their own page (visual-first).
    if (s.type === "image" || s.type === "katex") {
      flush();
      pages.push([s]);
      continue;
    }
    current.push(s);
    // After a points/examples/remember block, start a new page.
    if (s.type === "points" || s.type === "examples" || s.type === "remember") {
      flush();
    }
  }
  flush();
  return pages;
}

export function Board({
  payload,
  audio,
  onPageSpeech,
}: {
  payload: BoardPayload;
  audio?: HTMLAudioElement | null;
  // Returns the prepared (paused) audio element once ready.
  onPageSpeech?: (text: string, pageIdx: number) => Promise<HTMLAudioElement | null>;
}) {
  const hasSections = !!payload.board.sections?.length;
  const pages = useMemo(
    () => (hasSections ? groupIntoPages(payload.board.sections!) : []),
    [payload, hasSections],
  );
  const [pageIdx, setPageIdx] = useState(0);
  // The page currently REVEALED on screen. Lags pageIdx until audio is ready.
  const [visiblePageIdx, setVisiblePageIdx] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    setPageIdx(0);
    setVisiblePageIdx(0);
  }, [payload]);

  // Preload every image prompt in the payload before revealing the board.
  const imagePrompts: string[] = hasSections
    ? payload.board
        .sections!.filter((s) => s.type === "image")
        .map((s) => s.payload as string)
    : payload.board?.visual?.type === "image" && payload.board.visual.payload
      ? [payload.board.visual.payload]
      : [];

  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(imagePrompts.length === 0);

  useEffect(() => {
    let cancel = false;
    setReady(imagePrompts.length === 0);
    setImageMap({});
    if (imagePrompts.length === 0) return;
    Promise.all(
      imagePrompts.map((p) =>
        generateImage(p)
          .then((u) => [p, u] as const)
          .catch(() => [p, ""] as const),
      ),
    ).then((entries) => {
      if (cancel) return;
      const map: Record<string, string> = {};
      entries.forEach(([p, u]) => (map[p] = u || ""));
      const loaders = entries
        .filter(([, u]) => !!u)
        .map(
          ([, u]) =>
            new Promise<void>((res) => {
              const img = new Image();
              img.onload = () => res();
              img.onerror = () => res();
              img.src = u!;
            }),
        );
      Promise.all(loaders).then(() => {
        if (cancel) return;
        setImageMap(map);
        setReady(true);
      });
    });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  // Speaking progress bar — follows the actual audio element.
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!audio) {
      setProgress(0);
      return;
    }
    const tick = () => {
      if (!audio.duration || isNaN(audio.duration)) {
        setProgress(0);
      } else {
        setProgress(Math.min(1, audio.currentTime / audio.duration));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audio, payload]);

  // When pageIdx changes: prepare audio first, THEN reveal the page, THEN play 1s later.
  useEffect(() => {
    if (!hasSections || !ready) {
      setVisiblePageIdx(pageIdx);
      return;
    }
    const page = pages[pageIdx] || [];
    const text = page.map((s) => (s.speech || "").trim()).filter(Boolean).join(" ");
    let cancelled = false;
    let playTimer: number | undefined;
    if (!text.trim() || !onPageSpeech) {
      setPageLoading(false);
      setVisiblePageIdx(pageIdx);
      return;
    }
    setPageLoading(true);
    onPageSpeech(text, pageIdx).then((a) => {
      if (cancelled) return;
      setPageLoading(false);
      setVisiblePageIdx(pageIdx);
      // Show the page, wait 1s, then start narration.
      playTimer = window.setTimeout(() => {
        if (cancelled) return;
        a?.play().catch(() => {});
      }, 1000);
    });
    return () => {
      cancelled = true;
      if (playTimer) clearTimeout(playTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx, ready, payload]);


  const legacyKatex =
    !hasSections && payload.board?.visual?.type === "katex" && payload.board.visual.payload
      ? renderKatex(payload.board.visual.payload)
      : "";

  if (!ready) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground tracking-wide uppercase">
          Tayyar ho raha hai... visuals load ho rahe hain
        </p>
      </div>
    );
  }

  const totalPages = pages.length;
  const currentPage = pages[visiblePageIdx] || [];

  return (
    <div className="w-full">
      <motion.div
        key={payload.board.title}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4 sm:px-10 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              {payload.board.title}
            </h2>
            {hasSections && totalPages > 1 && (
              <span className="shrink-0 text-xs uppercase tracking-[0.18em] text-muted-foreground mt-2">
                Page {visiblePageIdx + 1} / {totalPages}
              </span>
            )}
          </div>
          {payload.board?.bullets && payload.board.bullets.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {payload.board.bullets.map((b, i) => (
                <span
                  key={i}
                  className="text-xs sm:text-sm px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
          {/* Speaking progress line */}
          {audio && (
            <div className="mt-4 h-[3px] w-full bg-muted/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.15, ease: "linear" }}
              />
            </div>
          )}
        </div>

        {/* Paginated explain mode */}
        {hasSections && (
          <>
            <div className="px-6 sm:px-10 py-8 sm:py-10 min-h-[360px] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={visiblePageIdx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-8"
                >
                  {currentPage.map((s, i) => (
                    <SectionView key={i} s={s} preloaded={imageMap} />
                  ))}
                </motion.div>
              </AnimatePresence>
              {pageLoading && pageIdx !== visiblePageIdx && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Awaaz tayyar ho rahi hai...
                    </p>
                  </div>
                </div>
              )}
            </div>


            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="border-t border-border px-6 sm:px-10 py-4 flex items-center justify-between gap-4 bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
                  disabled={pageIdx === 0}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <div className="flex gap-1.5">
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPageIdx(i)}
                      aria-label={`Page ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        i === pageIdx ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIdx((i) => Math.min(totalPages - 1, i + 1))}
                  disabled={pageIdx >= totalPages - 1}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Legacy single-panel (quiz / activity / fallback) */}
        {!hasSections && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="p-6 sm:p-10 space-y-4">
              {payload.board?.bullets?.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex gap-3 text-lg sm:text-2xl text-foreground/90 leading-snug"
                >
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-1" />
                  <span>{b}</span>
                </motion.div>
              ))}
            </div>
            <div className="border-t lg:border-t-0 lg:border-l border-border bg-muted/30 min-h-[260px] flex items-center justify-center p-6">
              {payload.board?.visual?.type === "image" &&
                imageMap[payload.board.visual.payload] && (
                  <motion.img
                    src={imageMap[payload.board.visual.payload]}
                    alt={payload.board.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-h-[420px] w-auto object-contain rounded-lg"
                  />
                )}
              {payload.board?.visual?.type === "katex" && (
                <div
                  className="text-3xl sm:text-5xl text-foreground"
                  dangerouslySetInnerHTML={{ __html: legacyKatex }}
                />
              )}
              {(!payload.board?.visual?.type || payload.board.visual.type === "none") && (
                <div className="text-6xl opacity-20">✦</div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
