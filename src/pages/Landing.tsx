import { Link } from "react-router-dom";
import { motion, useScroll, useSpring, useTransform, useMotionValue, useMotionTemplate } from "framer-motion";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { ArrowRight, Mic, Sparkles, Languages, GraduationCap, Zap, ShieldCheck, BookOpen } from "lucide-react";

import { OrbitingWordmark } from "@/components/OrbitingWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

/* ---------- Spotlight card ---------- */
function SpotlightCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: typeof Sparkles;
  title: string;
  desc: string;
  index: number;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const bg = useMotionTemplate`radial-gradient(260px circle at ${mx}px ${my}px, hsl(var(--primary) / 0.18), transparent 70%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      whileHover={{ y: -4 }}
      className="group relative p-7 rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden transition-colors hover:border-primary/40"
    >
      <motion.div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: bg }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative">
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-5 ring-1 ring-primary/20">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold mb-2 tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ---------- Magnetic button ---------- */
function MagneticLink({
  to,
  children,
  variant = "primary",
}: {
  to: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.25);
  };
  const reset = () => { x.set(0); y.set(0); };

  const base =
    "relative inline-flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.55)] hover:shadow-[0_14px_50px_-10px_hsl(var(--primary)/0.7)]"
      : "border border-border hover:bg-accent text-foreground";

  return (
    <motion.a
      ref={ref}
      href={to}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={`${base} ${styles}`}
    >
      {children}
    </motion.a>
  );
}

export default function Landing() {
  /* smooth scrolling */
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    let id = 0;
    const raf = (t: number) => { lenis.raf(t); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(id); lenis.destroy(); };
  }, []);

  /* scroll progress bar */
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });

  /* hero parallax */
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroP, [0, 1], [0, 140]);
  const heroOpacity = useTransform(heroP, [0, 0.8], [1, 0]);

  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* scroll progress */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed top-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-400 z-[60]"
      />

      {/* nav */}
      <nav className="fixed top-0 z-50 w-full backdrop-blur-md bg-background/60 border-b border-border/40">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div whileHover={{ rotate: 12 }} transition={{ type: "spring", stiffness: 300 }}>
              <img src="/logo.png" className="h-[22px] w-[22px]" alt="Saarthi Logo" />
            </motion.div>
            <span className="font-semibold tracking-tight text-[15px]">Saarthi</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <a href="#features" className="hidden sm:inline-block text-[13px] px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#how" className="hidden sm:inline-block text-[13px] px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition">How it works</a>
            <Link
              to={user ? "/app" : "/auth"}
              className="text-[13px] px-3.5 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition"
            >
              {user ? "Go to Classroom" : "Sign In"}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-[100svh] flex flex-col items-center justify-center px-4 pt-20 pb-16 overflow-hidden">
        {/* layered background */}
        <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none" />
        <div className="absolute inset-0 aurora pointer-events-none" />
        <div className="absolute inset-0 noise pointer-events-none" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative flex flex-col items-center w-full">
          {/* eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Voice-first · Hinglish · Live on the smart board
          </motion.div>

          <OrbitingWordmark text="SAARTHI" />

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 mt-10 text-center text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight max-w-4xl text-balance leading-[1.05]"
          >
            Teach with your voice.<br />
            <span className="shine-text">Watch ideas appear.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.7 }}
            className="relative z-10 mt-6 text-center text-base sm:text-lg text-muted-foreground max-w-2xl text-balance"
          >
            A hands-free Hinglish AI co-pilot for the classroom. Speak naturally —
            <span className="text-foreground"> explanations, quizzes and activities </span>
            appear live on the board.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.7 }}
            className="relative z-10 mt-10 flex flex-col sm:flex-row gap-3"
          >
            <MagneticLink to={user ? "/app" : "/auth"}>
              {user ? "Enter Classroom" : "Start teaching"} <ArrowRight className="h-4 w-4" />
            </MagneticLink>
            <MagneticLink to="#features" variant="ghost">
              See features
            </MagneticLink>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 6, 0] }}
          transition={{ opacity: { delay: 1.4, duration: 1 }, y: { repeat: Infinity, duration: 2.2, ease: "easeInOut" } }}
          className="absolute bottom-8 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
        >
          scroll
        </motion.div>
      </section>

      {/* MARQUEE */}
      <section aria-hidden className="relative py-6 border-y border-border/60 bg-card/30 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="marquee text-sm text-muted-foreground">
          {[..."Photosynthesis samjhao · 5 questions on fractions · Air pressure activity · Newton ke laws · Pythagoras theorem · Bharat ka itihaas · Quiz me on cells · Activity on magnets ·".split(" · "),
            ..."Photosynthesis samjhao · 5 questions on fractions · Air pressure activity · Newton ke laws · Pythagoras theorem · Bharat ka itihaas · Quiz me on cells · Activity on magnets ·".split(" · ")].map((t, i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap">
              <Mic className="h-3.5 w-3.5 text-primary/70" />
              <span className="font-medium text-foreground/80">{t}</span>
            </span>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center text-[11px] uppercase tracking-[0.22em] text-primary mb-4"
          >
            What it does
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-5xl font-semibold tracking-tight text-center mb-4 text-balance"
          >
            Three superpowers for one classroom.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto text-balance"
          >
            Speak in Hinglish. Saarthi listens, explains, quizzes and guides — projecting visuals on the smart board while you teach.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, title: "Live Concept Simplification", desc: "Bolo: 'Photosynthesis samjhao class 7 ke liye.' Mil jata hai Hinglish explanation, bullets, aur ek illustration — instant." },
              { icon: GraduationCap, title: "Voice-Triggered Quizzing", desc: "Bolo: '5 questions on fractions, easy.' Har question audio mein bolta hai, board pe dikhaata hai, awaaz se jawab leta hai." },
              { icon: BookOpen, title: "Bring Your Own Textbook", desc: "Upload NCERT PDFs. Saarthi reads the chapter and answers strictly from your uploaded syllabus." },
            ].map((f, i) => (
              <SpotlightCard key={f.title} {...f} index={i} />
            ))}
          </div>

          {/* stats strip */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {[
              { k: "<400ms", v: "voice latency" },
              { k: "5+", v: "AI fallbacks" },
              { k: "0", v: "extra hardware" },
              { k: "Hinglish", v: "natively" },
            ].map((s, i) => (
              <motion.div
                key={s.v}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-card p-6 text-center"
              >
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight">{s.k}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.v}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-28 px-4 border-t border-border overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-50 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-5 text-balance">
              Press the mic. Speak Hinglish. Teach.
            </h2>
            <ul className="space-y-4 text-muted-foreground">
              {[
                { icon: Mic, t: <>Hold the mic or press <kbd className="px-1.5 py-0.5 border rounded text-xs bg-card">Space</kbd> to talk.</> },
                { icon: Sparkles, t: <>AI replies aloud and projects bullets + illustration on the board.</> },
                { icon: Zap, t: <>Falls back across 5+ models silently so the class never waits.</> },
                { icon: ShieldCheck, t: <>Your roster and lesson data stay private to your school.</> },
              ].map((row, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="flex gap-3"
                >
                  <row.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>{row.t}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative aspect-square rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-fuchsia-500/10 p-10 flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-grid opacity-30" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-6 rounded-full border border-dashed border-primary/30"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute inset-16 rounded-full border border-dashed border-fuchsia-500/20"
            />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <img src="/logo.png" className="h-[140px] w-[140px] drop-shadow-[0_10px_30px_hsl(var(--primary)/0.5)]" alt="Saarthi Logo" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-4 border-t border-border overflow-hidden">
        <div className="absolute inset-0 aurora opacity-60 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-semibold tracking-tight mb-6 text-balance"
          >
            Ready to make your classroom <span className="shine-text">visual</span>?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mb-8"
          >
            Free to try. No hardware. Works on the smart board you already have.
          </motion.p>
          <MagneticLink to="/auth">
            Open Saarthi <ArrowRight className="h-4 w-4" />
          </MagneticLink>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Saarthi · Built for Indian classrooms
      </footer>
    </div>
  );
}
