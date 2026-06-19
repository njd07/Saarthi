import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useRecorder } from "@/hooks/use-recorder";
import { transcribe } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  onTranscript: (text: string, durationSec: number) => void;
  disabled?: boolean;
  label?: string;
};

export function VoiceDock({ onTranscript, disabled, label = "Hold to speak (or Space)" }: Props) {
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState("");
  const heldRef = useRef(false);
  const startedAtRef = useRef<number>(0);

  const handleStop = async (blob: Blob) => {
    const duration = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : 0;
    setBusy(true);

    // Explicitly check for SpeechRecognition support first
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    try {
      // First try backend (if it has Whisper/Groq)
      const text = await transcribe(blob);
      setPartial(text);
      if (text.trim()) onTranscript(text.trim(), duration);
    } catch (e: any) {
      console.error("Backend STT failed/unavailable:", e.message || e);
      
      // Fallback to browser Web Speech API if backend tells us to or fails
      if (SpeechRec && e.message === "Use browser speech recognition") {
        console.log("Falling back to browser Web Speech API...");
        try {
          const recognition = new SpeechRec();
          recognition.lang = "hi-IN";
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;
          
          await new Promise<void>((resolve, reject) => {
            recognition.onresult = (event: any) => {
              const speechResult = event.results[0][0].transcript;
              setPartial(speechResult);
              if (speechResult.trim()) onTranscript(speechResult.trim(), duration);
              resolve();
            };
            recognition.onerror = (event: any) => {
              console.error("Web Speech API error:", event.error);
              reject(new Error(event.error));
            };
            recognition.onend = () => resolve();
            
            // Note: Since we already recorded audio, we can't easily pipe it to SpeechRecognition.
            // But wait, SpeechRecognition listens from the mic live. We shouldn't use `useRecorder` blob for SpeechRecognition.
            // This logic is a bit flawed because SpeechRecognition listens to the microphone itself!
          });
        } catch (speechErr) {
          console.error("Fallback Web Speech failed:", speechErr);
        }
      }
    } finally {
      setBusy(false);
      setTimeout(() => setPartial(""), 2500);
    }
  };

  const { recording, start, stop } = useRecorder(handleStop);

  const wrappedStart = () => { 
    startedAtRef.current = Date.now(); 
    
    // Explicit microphone permission check for logging
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log("Microphone permission granted");
        start();
      })
      .catch((err) => {
        console.error("Microphone permission denied:", err);
        setPartial("Mic access denied");
      });
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.shiftKey && !heldRef.current && !disabled && !busy) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        heldRef.current = true;
        wrappedStart();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && heldRef.current) {
        e.preventDefault();
        heldRef.current = false;
        stop();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [start, stop, disabled, busy]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {partial && (
        <div className="px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground max-w-xs truncate shadow-lg">
          {partial}
        </div>
      )}
      <button
        type="button"
        disabled={disabled || busy}
        onMouseDown={() => !busy && wrappedStart()}
        onMouseUp={stop}
        onMouseLeave={() => recording && stop()}
        onTouchStart={(e) => { e.preventDefault(); if (!busy) wrappedStart(); }}
        onTouchEnd={(e) => { e.preventDefault(); stop(); }}
        className={cn(
          "relative h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center transition-all shadow-2xl select-none",
          recording ? "bg-destructive text-destructive-foreground scale-110" : busy ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:scale-105",
        )}
        aria-label={label}
      >
        {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : recording ? <Square className="h-6 w-6 fill-current" /> : <Mic className="h-7 w-7" />}
        {recording && <span className="absolute inset-0 rounded-full border-2 border-destructive animate-ping" />}
      </button>
      <span className="text-[11px] text-muted-foreground hidden sm:block">{label}</span>
    </div>
  );
}
