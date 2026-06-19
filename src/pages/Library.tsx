import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, Loader2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { uploadDocument } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Doc = { id: string; title: string; status: string; pages: number | null; error: string | null; created_at: string; storage_path: string };

export default function Library() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);

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
    await authFetch(`/api/documents/${d.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="h-[18px] w-[18px]" alt="Saarthi Logo" />
            <span className="font-semibold text-sm">Textbook Library</span>
          </div>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <p className="text-sm text-muted-foreground">
          Upload your NCERT chapters or lesson notes (PDF or .txt). Saarthi will use them as the source-of-truth
          for Explain, Quiz, and Activity modes when "Strict to my book" is on.
        </p>

        <label className="block">
          <input type="file" accept=".pdf,.txt,.md" onChange={onUpload} className="hidden" disabled={uploading} />
          <div className="rounded-2xl border-2 border-dashed border-border hover:border-primary/60 p-10 text-center cursor-pointer transition">
            {uploading ? <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" /> : <Upload className="h-6 w-6 mx-auto text-muted-foreground" />}
            <p className="mt-2 text-sm">Click to upload PDF or text file</p>
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
              <Button size="icon" variant="ghost" onClick={() => remove(d)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
          {!docs.length && <li className="text-center text-sm text-muted-foreground py-8">No documents yet.</li>}
        </ul>
      </main>
    </div>
  );
}
