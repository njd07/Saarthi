import { BookOpen } from "lucide-react";
import type { Citation } from "@/lib/api";

export function CitationChips({ citations }: { citations: Citation[] }) {
  if (!citations?.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {citations.map((c, i) => (
        <div
          key={i}
          title={c.snippet}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/30"
        >
          <BookOpen className="h-3 w-3" />
          {c.documentTitle ? `${c.documentTitle} · p.${c.page}` : `p.${c.page}`}
        </div>
      ))}
    </div>
  );
}
