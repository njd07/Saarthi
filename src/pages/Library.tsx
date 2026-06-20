import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, Volume2, Play, Pause } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { uploadDocument, speak } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Doc = { id: string; title: string; status: string; pages: number | null; error: string | null; created_at: string; storage_path: string };

export default function Library() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);

  // Summary co-pilot states
  const [activeSummaryDocId, setActiveSummaryDocId] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState<string>("");
  const [summarizing, setSummarizing] = useState(false);
  const [playingSummary, setPlayingSummary] = useState(false);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  async function load() {
    const r = await authFetch("/api/documents");
    const d = await r.json();
    setDocs(d.data || []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      if (audioObj) {
        audioObj.pause();
      }
    };
  }, [audioObj]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(file);
      toast.success("Uploading & ingesting — refresh in a few seconds");
      load();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function remove(d: Doc) {
    if (!confirm(`Remove "${d.title}"?`)) return;
    if (activeSummaryDocId === d.id) {
      if (audioObj) {
        audioObj.pause();
        setAudioObj(null);
      }
      setSummaryText("");
      setActiveSummaryDocId(null);
      setPlayingSummary(false);
    }
    await authFetch(`/api/documents/${d.id}`, { method: "DELETE" });
    load();
  }

  async function generateSummary(doc: Doc) {
    if (summarizing) return;
    setSummarizing(true);
    setSummaryText("");
    setActiveSummaryDocId(doc.id);

    if (audioObj) {
      audioObj.pause();
      setPlayingSummary(false);
      setAudioObj(null);
    }

    try {
      const r = await authFetch(`/api/documents/${doc.id}/summarize`, {
        method: "POST"
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to generate summary");

      setSummaryText(d.content);

      // Auto-play summary
      const audio = await speak(d.content);
      if (audio) {
        setAudioObj(audio);
        setPlayingSummary(true);
        audio.onended = () => setPlayingSummary(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Summary failed");
      setActiveSummaryDocId(null);
    } finally {
      setSummarizing(false);
    }
  }

  function togglePlaySummary() {
    if (!audioObj) {
      if (summaryText) {
        speak(summaryText).then((audio) => {
          if (audio) {
            setAudioObj(audio);
            setPlayingSummary(true);
            audio.onended = () => setPlayingSummary(false);
          }
        });
      }
      return;
    }
    if (playingSummary) {
      audioObj.pause();
      setPlayingSummary(false);
    } else {
      audioObj.play().catch(() => {});
      setPlayingSummary(true);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="h-[18px] w-[18px]" alt="Saarthi Logo" />
            <span className="font-semibold text-sm">Textbook Library</span>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left Column - PDF Management */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-2">My Textbooks & Notes</h2>
              <p className="text-sm text-muted-foreground">
                Upload your NCERT chapters or lesson notes (PDF or .txt). Saarthi will use them as the source-of-truth
                for Explain, Quiz, and Activity modes when "Strict to my book" is on.
              </p>
            </div>

            <label className="block">
              <input type="file" accept=".pdf,.txt,.md" onChange={onUpload} className="hidden" disabled={uploading} />
              <div className="rounded-2xl border-2 border-dashed border-border hover:border-primary/60 p-8 text-center cursor-pointer transition">
                {uploading ? <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" /> : <Upload className="h-6 w-6 mx-auto text-muted-foreground" />}
                <p className="mt-2 text-sm font-medium">Click to upload PDF or text file</p>
                <p className="text-[11px] text-muted-foreground mt-1">Best with NCERT chapter PDFs under 20 MB</p>
              </div>
            </label>

            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.status === "ready" && <span className="text-green-600 inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Ready · {d.pages} pages</span>}
                      {d.status === "pending" && <span>Queued…</span>}
                      {d.status === "processing" && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Ingesting…</span>}
                      {d.status === "failed" && <span className="text-destructive inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" />Failed: {d.error}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {d.status === "ready" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => generateSummary(d)}
                        disabled={summarizing}
                        title="Generate Voice Summary"
                        className={cn(
                          "h-8 w-8 text-primary hover:text-primary hover:bg-primary/10",
                          activeSummaryDocId === d.id && "bg-primary/20"
                        )}
                      >
                        {summarizing && activeSummaryDocId === d.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(d)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
              {!docs.length && <li className="text-center text-sm text-muted-foreground py-8">No documents yet.</li>}
            </ul>
          </div>

          {/* Right Column - Voice Co-Pilot Summary */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4 sticky top-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <h3 className="font-semibold text-lg">Voice Co-Pilot Summary</h3>
                </div>
                {summaryText && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={togglePlaySummary}
                    className="flex items-center gap-2"
                  >
                    {playingSummary ? (
                      <>
                        <Pause className="h-4 w-4 text-primary animate-pulse" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 text-primary" /> Play Voice
                      </>
                    )}
                  </Button>
                )}
              </div>

              {summarizing && (
                <div className="py-12 text-center text-muted-foreground space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm">Groq Model summarizing your book...</p>
                </div>
              )}

              {!summarizing && !summaryText && (
                <div className="py-16 text-center text-muted-foreground space-y-2">
                  <Volume2 className="h-10 w-10 mx-auto opacity-35" />
                  <p className="text-sm font-medium">No textbook selected</p>
                  <p className="text-xs">Click the Sparkles icon next to a textbook to read and hear its co-pilot summary.</p>
                </div>
              )}

              {!summarizing && summaryText && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 rounded-xl bg-muted/40 text-sm text-foreground leading-relaxed whitespace-pre-line border border-border/40 font-medium">
                    {summaryText}
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center">
                    Powered by Groq Llama 3.3-70b & Microsoft Edge TTS
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
