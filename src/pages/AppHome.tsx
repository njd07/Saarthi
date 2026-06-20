import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Trophy, Mic2, Settings as SettingsIcon, LogOut, Moon, Sun, Loader2, BookOpen, BarChart3, Shield, Trash2, Volume2, VolumeX,
} from "lucide-react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import Lenis from "lenis";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth";

import { OrbitingWordmark } from "@/components/OrbitingWordmark";
import { VoiceDock } from "@/components/VoiceDock";
import { Board } from "@/components/Board";
import { DictateBoard } from "@/components/DictateBoard";
import { StudentChips, type Student } from "@/components/StudentChips";
import { CitationChips } from "@/components/CitationChips";
import { OfflinePill } from "@/components/OfflinePill";
import { askAI, dictate, speak, setMuted as setGlobalMuted, startSession, logInteraction, logQuizAttempt, logSpeech, type BoardPayload, type DictatePayload } from "@/lib/api";
import { loadSettings, saveSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Mode = "explain" | "quiz" | "dictate";

export default function AppHome() {
  const { theme, setTheme } = useTheme();
  const { profile, signOut, user } = useAuth();
  const [mode, setMode] = useState<Mode>("explain");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<BoardPayload | null>(null);
  const [dictateOut, setDictateOut] = useState<DictatePayload | null>(null);
  const [modelUsed, setModelUsed] = useState<string>("");
  const [textInput, setTextInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [hasDocs, setHasDocs] = useState(false);
  const [strictRag, setStrictRag] = useState(loadSettings().strictRag);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  // Quiz state
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizN, setQuizN] = useState(0);
  const [quizTotal] = useState(5);
  const [waitingAnswer, setWaitingAnswer] = useState(false);

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  // Smooth inertial scrolling
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let raf = 0;
    const tick = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  // Scroll-driven hero parallax + top progress bar
  const { scrollYProgress } = useScroll();
  const scrollProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0.25]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const docR = await authFetch("/api/documents/count");
      const docD = await docR.json();
      setHasDocs((docD.count ?? 0) > 0);
      const roleR = await authFetch("/api/admin/check");
      const roleD = await roleR.json();
      setIsAdmin(roleD.isAdmin);
    })();
    startSession(`Session ${new Date().toLocaleString()}`).then((id) => id && setSessionId(id));
  }, [user]);

  function stopAudio() {
    try { audioRef.current?.pause(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    audioRef.current = null;
    setAudioEl(null);
  }
  function clearTopic() { stopAudio(); setPayload(null); setDictateOut(null); }

  function handleMuteToggle() {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setGlobalMuted(newMuted);
    if (newMuted) stopAudio();
  }

  async function runAsk(userText: string, opts?: { quizMeta?: { n: number; total: number } }) {
    stopAudio();
    setPayload(null);
    setDictateOut(null);
    setLoading(true);
    const t0 = Date.now();
    try {
      if (mode === "dictate") {
        const d = await dictate(userText);
        setDictateOut(d);
        setPayload(null);
        logInteraction({
          sessionId, studentId: activeStudent?.id ?? null, mode, prompt: userText,
          response: JSON.stringify(d), model: "dictate", durationMs: Date.now() - t0,
        });
        if (!isMuted) {
          const a = await speak(d.hindi);
          if (a) { audioRef.current = a; setAudioEl(a); }
        }
        return;
      }
      const { payload: p, model, offline } = await askAI({
        mode, userText, quizMeta: opts?.quizMeta, useRag: hasDocs, strictRag,
      });
      setPayload(p);
      setDictateOut(null);
      setModelUsed(offline ? "offline cache" : model);
      logInteraction({
        sessionId, studentId: activeStudent?.id ?? null, mode, prompt: userText,
        response: p.speech, model, durationMs: Date.now() - t0,
      });
      const hasSections = !!p.board?.sections?.length;
      if (!hasSections) {
        if (!isMuted) {
          const a = await speak(p.speech);
          if (a) {
            audioRef.current = a; setAudioEl(a);
            a.onended = () => { if (mode === "quiz") setWaitingAnswer(true); };
          }
        } else if (mode === "quiz") {
          setWaitingAnswer(true);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function startQuiz(topic: string) {
    setQuizScore({ correct: 0, total: 0 });
    setQuizN(1);
    setWaitingAnswer(false);
    await runAsk(`Topic: ${topic}. Generate question 1 of ${quizTotal}.`, {
      quizMeta: { n: 1, total: quizTotal },
    });
  }

  async function gradeQuizAnswer(spoken: string) {
    if (!payload?.quiz) return;
    setWaitingAnswer(false);
    const said = spoken.toUpperCase().match(/\b[ABCD]\b/)?.[0] || "";
    const correct = said === payload.quiz.answer.toUpperCase();
    const newScore = {
      correct: quizScore.correct + (correct ? 1 : 0),
      total: quizScore.total + 1,
    };
    setQuizScore(newScore);
    logQuizAttempt({
      sessionId, studentId: activeStudent?.id ?? null,
      question: payload.board.title, chosen: said || spoken,
      correctAnswer: payload.quiz.answer, isCorrect: correct,
    });
    const fb = correct
      ? `Bilkul sahi! ${payload.quiz.explanation}`
      : `Galat. Sahi jawab tha ${payload.quiz.answer}. ${payload.quiz.explanation}`;
    stopAudio();
    async function onFeedbackEnd() {
      if (quizN < quizTotal) {
        const next = quizN + 1;
        setQuizN(next);
        await runAsk(`Next question, number ${next} of ${quizTotal}.`, { quizMeta: { n: next, total: quizTotal } });
      } else {
        const finalLine = `Quiz khatam! Aapka score: ${newScore.correct} out of ${quizTotal}.`;
        stopAudio();
        if (!isMuted) {
          const fa = (await speak(finalLine)) || null;
          audioRef.current = fa; setAudioEl(fa);
        }
      }
    }
    if (isMuted) {
      await new Promise((r) => setTimeout(r, 1200));
      await onFeedbackEnd();
      return;
    }
    const a = await speak(fb);
    if (a) {
      audioRef.current = a; setAudioEl(a);
      a.onended = onFeedbackEnd;
    }
  }

  function handleTranscript(text: string, durationSec: number) {
    logSpeech({ sessionId, studentId: activeStudent?.id ?? null, seconds: durationSec });
    if (mode === "quiz") {
      if (waitingAnswer) gradeQuizAnswer(text);
      else startQuiz(text);
      return;
    }
    runAsk(text);
  }

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleTranscript(textInput.trim(), 0);
    setTextInput("");
  }

  const isDark = theme === "dark";
  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "T";

  const modes: { id: Mode; label: string; icon: any; hint: string }[] = [
    { id: "explain", label: "Explain", icon: Sparkles, hint: "Bolo: 'Photosynthesis samjhao class 7.'" },
    { id: "quiz", label: "Quiz", icon: Trophy, hint: "Bolo: 'Quiz on fractions, easy.'" },
    { id: "dictate", label: "Dictate", icon: Mic2, hint: "Bolo Hinglish — Hindi+English dikhega." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-40">
      <header className="sticky top-0 z-40 backdrop-blur bg-background/75 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/app" className="flex items-center gap-2 group">
            <img src="/logo.png" className="h-[22px] w-[22px] transition-transform group-hover:rotate-12" alt="Saarthi Logo" />
            <span className="font-semibold tracking-[0.18em] uppercase text-[13px]">Saarthi</span>
          </Link>
          <div className="flex items-center gap-1">
            <OfflinePill />
            {modelUsed && (
              <span className="hidden sm:inline-flex items-center text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                via {modelUsed.split("/").pop()}
              </span>
            )}
            <Link to="/library" className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground" title="Library">
              <BookOpen className="h-4 w-4" />
            </Link>
            <Link to="/analytics" className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground" title="Analytics">
              <BarChart3 className="h-4 w-4" />
            </Link>
            {isAdmin && (
              <Link to="/admin" className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground" title="Admin">
                <Shield className="h-4 w-4" />
              </Link>
            )}
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/settings" className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
              <SettingsIcon className="h-4 w-4" />
            </Link>
            <button onClick={signOut} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
            <div className="ml-2 h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-semibold">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* scroll progress bar */}
      <motion.div
        style={{ scaleX: scrollProgress }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-primary origin-left z-50"
      />

      <main className="max-w-6xl mx-auto px-4 pt-8 sm:pt-14">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative mb-10"
        >
          <OrbitingWordmark text="SAARTHI" />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-6 text-center text-muted-foreground text-sm sm:text-base"
          >
            Namaste {profile?.full_name?.split(" ")[0] || "Teacher"}. Mode chuniye aur mic dabaiye.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <StudentChips activeStudentId={activeStudent?.id ?? null} onSelect={setActiveStudent} />
        </motion.div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          {modes.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setMode(m.id); setPayload(null); setDictateOut(null); stopAudio(); }}
              className={cn(
                "group relative p-3 sm:p-5 rounded-2xl border text-left transition-all overflow-hidden backdrop-blur-xl",
                mode === m.id
                  ? "border-primary/60 bg-primary/15 shadow-[0_0_0_1px_hsl(var(--primary)/0.5),0_20px_60px_-15px_hsl(var(--primary)/0.55)]"
                  : "border-white/10 dark:border-white/10 bg-card/40 hover:bg-card/60 hover:border-primary/40 shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.06)]",
              )}
            >
              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-60" />
              <span className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/0 via-primary/0 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <m.icon className={cn("relative h-5 w-5 mb-2 transition-colors", mode === m.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.6} />
              <div className="relative font-semibold text-sm sm:text-base">{m.label}</div>
              <div className="relative text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{m.hint}</div>
            </motion.button>
          ))}
        </div>

        {hasDocs && mode !== "dictate" && (
          <label className="mb-4 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={strictRag}
              onChange={(e) => { setStrictRag(e.target.checked); saveSettings({ ...loadSettings(), strictRag: e.target.checked }); }}
            />
            <BookOpen className="h-3 w-3" />
            Answer strictly from my uploaded textbook
          </label>
        )}

        <form onSubmit={handleSubmitText} className="mb-6 flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              mode === "quiz"
                ? waitingAnswer ? "Type A, B, C or D…" : "Quiz topic"
                : mode === "dictate" ? "Type or speak any Hinglish sentence" : "Or type a question…"
            }
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </Button>
        </form>

        {mode === "quiz" && payload && (
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Q {quizN} of {quizTotal} · Score {quizScore.correct}/{quizScore.total}
              {activeStudent && <span className="ml-2 text-primary">· {activeStudent.name}</span>}
            </span>
            {waitingAnswer && <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs animate-pulse">Listening for answer…</span>}
          </div>
        )}

        {loading && !payload && !dictateOut && (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            Soch raha hoon…
          </div>
        )}
        {!loading && !payload && !dictateOut && (
          <div className="rounded-2xl border border-dashed border-border p-12 sm:p-20 text-center text-muted-foreground">
            <div className="text-5xl mb-4 opacity-30">🎙️</div>
            <p>Mic dabaiye ya neeche type kijiye.</p>
          </div>
        )}
        {payload && (
          <>
            <div className="mb-3 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={clearTopic}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear topic
              </Button>
              <Button variant="outline" size="sm" onClick={handleMuteToggle}>
                {isMuted ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
            </div>
            <Board
              payload={payload}
              audio={audioEl}
              onPageSpeech={async (text) => {
                stopAudio();
                if (isMuted) return null;
                const a = await speak(text, { autoplay: false });
                if (a) { audioRef.current = a; setAudioEl(a); }
                return a;
              }}
            />
            <CitationChips citations={payload.citations || []} />
          </>
        )}
        {dictateOut && (
          <>
            <div className="mb-3 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={clearTopic}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear topic
              </Button>
              <Button variant="outline" size="sm" onClick={handleMuteToggle}>
                {isMuted ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
            </div>
            <DictateBoard payload={dictateOut} isMuted={isMuted} />
          </>
        )}
      </main>

      <VoiceDock onTranscript={handleTranscript} disabled={loading} />
    </div>
  );
}
