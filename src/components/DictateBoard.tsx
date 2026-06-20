import { Volume2, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { speak } from "@/lib/api";
import { toast } from "sonner";
import type { DictatePayload } from "@/lib/api";

export function DictateBoard({ payload, isMuted }: { payload: DictatePayload; isMuted?: boolean }) {
  const copy = (t: string) => {
    navigator.clipboard.writeText(t).then(() => toast.success("Copied"));
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {[
        { label: "Hinglish", text: (payload as any).hinglish || payload.original, lang: "hi" },
        { label: "हिन्दी", text: payload.hindi, lang: "hi" },
        { label: "English", text: payload.english, lang: "en" },
      ].map((col) => (
        <div key={col.label} className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</h3>
            <div className="flex gap-1">
              {col.lang && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => !isMuted && speak(col.text)} disabled={isMuted}>
                  <Volume2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(col.text)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-lg sm:text-2xl leading-snug text-foreground flex-1">{col.text}</p>
        </div>
      ))}
    </motion.div>
  );
}
