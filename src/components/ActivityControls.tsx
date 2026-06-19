import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  running: boolean;
  stepIndex: number;
  totalSteps: number;
  secondsLeft: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRestart: () => void;
  onSkip: () => void;
};

export function ActivityControls(p: Props) {
  const mm = String(Math.floor(p.secondsLeft / 60)).padStart(2, "0");
  const ss = String(p.secondsLeft % 60).padStart(2, "0");
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 mr-auto">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Step {p.stepIndex + 1} / {p.totalSteps}
        </span>
        <span className="font-mono text-3xl tabular-nums ml-3">
          {mm}:{ss}
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={p.onPrev} disabled={p.stepIndex === 0}>
        <SkipBack className="h-4 w-4" />
      </Button>
      <Button size="sm" onClick={p.onPlayPause} className="gap-1">
        {p.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {p.running ? "Pause" : "Start"}
      </Button>
      <Button size="sm" variant="outline" onClick={p.onSkip}>
        <FastForward className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={p.onNext} disabled={p.stepIndex >= p.totalSteps - 1}>
        <SkipForward className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={p.onRestart}>
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
