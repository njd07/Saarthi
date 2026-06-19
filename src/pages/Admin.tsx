import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";


export default function Admin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ teachers: 0, students: 0, sessions: 0, interactions: 0, quizzes: 0 });
  const [models, setModels] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const r = await authFetch("/api/admin/check");
      const d = await r.json();
      setIsAdmin(d.isAdmin);
    })();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const r = await authFetch("/api/admin/stats");
      const d = await r.json();
      setStats(d.stats);
      const tally: Record<string, number> = {};
      for (const row of d.models || []) {
        const k = (row.model || "unknown").split("/").pop()!;
        tally[k] = (tally[k] || 0) + 1;
      }
      setModels(Object.entries(tally).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    })();
  }, [isAdmin]);

  if (loading || isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="h-[18px] w-[18px]" alt="Saarthi Logo" />
            <span className="font-semibold text-sm">Admin Console</span>
          </div>
          <div className="w-12" />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-card p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="text-3xl font-bold mt-1 tabular-nums">{v}</div>
            </div>
          ))}
        </div>
        <section>
          <h3 className="text-sm font-semibold mb-3">Model usage</h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left px-4 py-2">Model</th><th className="text-right px-4 py-2">Calls</th></tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.name} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{m.name}</td>
                    <td className="px-4 py-2 text-right">{m.count}</td>
                  </tr>
                ))}
                {!models.length && <tr><td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">No data yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
