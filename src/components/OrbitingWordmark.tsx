import { useEffect, useRef } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring, type MotionValue } from "framer-motion";
import {
  Compass, Book, Atom, Globe2, Calculator, FlaskConical, Sigma, Pencil,
  Microscope, BookOpen, Sparkles, Sun, Feather, Leaf, Palette, Music2, Star,
} from "lucide-react";

/* ---------- swirling cosmic current of icons ---------- */
const SWIRL_PATH =
  "M 60 150 C 120 40, 260 30, 380 90 S 560 230, 680 170 S 880 60, 960 140 S 880 260, 760 230 S 520 180, 380 220 S 160 280, 60 200 S 20 110, 90 80";

type IconDef = {
  Icon: React.ComponentType<any>;
  t: number;
  size?: number;
  o?: number;
};

const DARK_ICONS: IconDef[] = [
  { Icon: Compass, t: 0.0, size: 26, o: 1 },
  { Icon: Star, t: 0.06, size: 12, o: 0.7 },
  { Icon: Book, t: 0.12, size: 18, o: 0.9 },
  { Icon: Atom, t: 0.2, size: 20, o: 0.85 },
  { Icon: Sparkles, t: 0.27, size: 14, o: 0.6 },
  { Icon: Calculator, t: 0.34, size: 18, o: 0.9 },
  { Icon: Globe2, t: 0.42, size: 22, o: 0.95 },
  { Icon: Sigma, t: 0.5, size: 16, o: 0.7 },
  { Icon: Microscope, t: 0.57, size: 20, o: 0.9 },
  { Icon: BookOpen, t: 0.64, size: 18, o: 0.8 },
  { Icon: FlaskConical, t: 0.72, size: 20, o: 0.9 },
  { Icon: Star, t: 0.78, size: 10, o: 0.55 },
  { Icon: Pencil, t: 0.84, size: 16, o: 0.8 },
  { Icon: Atom, t: 0.9, size: 14, o: 0.6 },
  { Icon: Sparkles, t: 0.96, size: 12, o: 0.5 },
];

const LIGHT_ICONS: IconDef[] = [
  { Icon: Sun, t: 0.0, size: 26, o: 1 },
  { Icon: Sparkles, t: 0.07, size: 12, o: 0.65 },
  { Icon: Leaf, t: 0.14, size: 18, o: 0.85 },
  { Icon: Feather, t: 0.22, size: 18, o: 0.8 },
  { Icon: Palette, t: 0.3, size: 18, o: 0.85 },
  { Icon: Music2, t: 0.38, size: 16, o: 0.7 },
  { Icon: Book, t: 0.46, size: 20, o: 0.9 },
  { Icon: Pencil, t: 0.54, size: 16, o: 0.75 },
  { Icon: Globe2, t: 0.62, size: 20, o: 0.85 },
  { Icon: Sparkles, t: 0.69, size: 12, o: 0.55 },
  { Icon: Atom, t: 0.76, size: 18, o: 0.8 },
  { Icon: Leaf, t: 0.83, size: 14, o: 0.7 },
  { Icon: Star, t: 0.9, size: 12, o: 0.6 },
  { Icon: Feather, t: 0.96, size: 14, o: 0.6 },
];

function FlowingIcons({ variant }: { variant: "dark" | "light" }) {
  const icons = variant === "dark" ? DARK_ICONS : LIGHT_ICONS;
  const gradientId = `swirl-grad-${variant}`;
  const stroke = variant === "dark" ? "hsl(210 90% 70%)" : "hsl(22 75% 38%)";
  const glow =
    variant === "dark"
      ? "drop-shadow(0 0 6px hsl(210 90% 65% / 0.55))"
      : "drop-shadow(0 0 5px hsl(22 80% 45% / 0.45))";

  return (
    <svg
      viewBox="0 0 1000 300"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          {variant === "dark" ? (
            <>
              <stop offset="0%" stopColor="hsl(210 90% 70%)" stopOpacity="0.05" />
              <stop offset="50%" stopColor="hsl(220 90% 75%)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(265 80% 75%)" stopOpacity="0.05" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="hsl(22 75% 38%)" stopOpacity="0.75" />
              <stop offset="50%" stopColor="hsl(18 80% 45%)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="hsl(340 70% 50%)" stopOpacity="0.75" />
            </>
          )}
        </linearGradient>
      </defs>

      <motion.path
        d={SWIRL_PATH}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={variant === "dark" ? 1.2 : 2.4}
        strokeDasharray={variant === "dark" ? "3 8" : "4 10"}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.4, ease: "easeInOut" }}
      />

      {icons.map((node, i) => (
        <g
          key={i}
          className="swirl-node"
          style={{
            offsetPath: `path("${SWIRL_PATH}")`,
            offsetDistance: `${node.t * 100}%`,
            offsetRotate: "0deg",
            animationDelay: `calc(var(--swirl-dur, 22s) * ${-node.t})`,
          } as React.CSSProperties}
        >
          <foreignObject
            x={-(node.size ?? 16) / 2}
            y={-(node.size ?? 16) / 2}
            width={node.size ?? 16}
            height={node.size ?? 16}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                color: stroke,
                opacity: node.o ?? 0.85,
                filter: glow,
              }}
            >
              <node.Icon className="w-full h-full" strokeWidth={1.5} />
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
}

/** Wordmark with pearlescent shimmer + flowing icon current, scroll-reactive. */
export function OrbitingWordmark({
  text,
  progress,
}: {
  text: string;
  /** Optional 0..1 MotionValue. If omitted, uses page scrollYProgress. */
  progress?: MotionValue<number>;
}) {
  const letters = text.split("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // fall back to page scroll
  const { scrollYProgress } = useScroll();
  const src = progress ?? scrollYProgress;
  // smooth it so jitter on touch devices doesn't flicker the CSS vars
  const smooth = useSpring(src, { stiffness: 90, damping: 22, mass: 0.3 });

  useMotionValueEvent(smooth, "change", (v) => {
    const el = wrapRef.current;
    if (!el) return;
    const p = Math.max(0, Math.min(1, v));
    // swirl: 22s idle → ~14s when scrolling fast (gentler boost)
    const swirlDur = (22 - 8 * p).toFixed(2) + "s";
    // shimmer: 6.5s idle → ~4s on scroll (gentler boost)
    const shimmerDur = (6.5 - 2.5 * p).toFixed(2) + "s";
    // shimmer intensity drop-shadow blur
    const shimmerGlow = (8 + 14 * p).toFixed(1) + "px";
    const shimmerAlpha = (0.25 + 0.3 * p).toFixed(2);
    el.style.setProperty("--swirl-dur", swirlDur);
    el.style.setProperty("--shimmer-dur", shimmerDur);
    el.style.setProperty("--shimmer-glow", shimmerGlow);
    el.style.setProperty("--shimmer-alpha", shimmerAlpha);
  });

  return (
    <div
      ref={wrapRef}
      className="orbit-wrap relative w-full flex items-center justify-center pointer-events-none select-none overflow-hidden py-6"
      style={{ contain: "layout paint" }}
    >
      <div className="absolute inset-0 hidden dark:block">
        <FlowingIcons variant="dark" />
      </div>
      <div className="absolute inset-0 dark:hidden">
        <FlowingIcons variant="light" />
      </div>

      <div className="relative flex items-center justify-center gap-[0.6vw] sm:gap-[1.2vw] flex-nowrap">
        {letters.map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.7, ease: "easeOut" }}
            className="inline-block shrink-0 font-extrabold tracking-tight pearl-text"
            style={{
              fontSize: "min(17vw, 180px)",
              lineHeight: 1,
              width: "min(11.5vw, 120px)",
              textAlign: "center",
              willChange: "background-position, transform",
            }}
          >
            {ch}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
