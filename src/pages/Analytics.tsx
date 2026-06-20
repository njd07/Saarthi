import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, FileText } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { downloadSessionSummaryPDF, downloadCSV, type StudentRow } from "@/lib/pdfExport";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

type Session = { id: string; title: string | null; started_at: string };

export default function Analytics() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | "all">("all");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [totals, setTotals] = useState({ interactions: 0, quizzes: 0, speechSeconds: 0 });
  const [modeDist, setModeDist] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    (async () => {
      const r = await authFetch("/api/sessions");
      const d = await r.json();
      setSessions(d.data || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const qs = sessionId === "all" ? "" : `?sessionId=${sessionId}`;

      const [studentsR, interactionsR, quizzesR, speechR] = await Promise.all([
        authFetch("/api/students"),
        authFetch(`/api/interactions${qs}`),
        authFetch(`/api/quiz-attempts${qs}`),
        authFetch(`/api/speech-segments${qs}`),
      ]);

      const students = (await studentsR.json()).data || [];
      const interactions = (await interactionsR.json()).data || [];
      const quizzes = (await quizzesR.json()).data || [];
      const speech = (await speechR.json()).data || [];

      const sMap = new Map<string | null, StudentRow>();
      const ensure = (id: string | null, name: string) => {
        if (!sMap.has(id)) sMap.set(id, { name, attempts: 0, quizCorrect: 0, quizTotal: 0, spokenSeconds: 0 });
        return sMap.get(id)!;
      };
      ensure(null, "Class (untagged)");
      for (const s of students) ensure(s.id, s.name);

      const modeCount: Record<string, number> = {};
      for (const i of interactions) {
        const stu = students.find((x: any) => x.id === i.student_id);
        ensure(i.student_id, stu?.name || "Class (untagged)").attempts += 1;
        modeCount[i.mode] = (modeCount[i.mode] || 0) + 1;
      }
      for (const q of quizzes) {
        const stu = students.find((x: any) => x.id === q.student_id);
        const row = ensure(q.student_id, stu?.name || "Class (untagged)");
        row.quizTotal += 1;
        if (q.is_correct) row.quizCorrect += 1;
      }
      for (const sg of speech) {
        const stu = students.find((x: any) => x.id === sg.student_id);
        ensure(sg.student_id, stu?.name || "Class (untagged)").spokenSeconds += Number(sg.seconds || 0);
      }

      const out = [...sMap.values()].filter((r) => r.attempts || r.quizTotal || r.spokenSeconds);
      setRows(out);
      setTotals({
        interactions: interactions.length,
        quizzes: quizzes.length,
        speechSeconds: Math.round(speech.reduce((s: number, x: any) => s + Number(x.seconds || 0), 0)),
      });
      setModeDist(Object.entries(modeCount).map(([name, value]) => ({ name, value })));
    })();
  }, [sessionId]);

  const pieColors = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#ec4899"];

  const sessionTitle =
    sessionId === "all"
      ? "All sessions"
      : sessions.find((s) => s.id === sessionId)?.title || "Session";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="h-[18px] w-[18px]" alt="Saarthi Logo" />
            <span className="font-semibold text-sm">Analytics</span>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value as any)}
            className="h-10 border border-input bg-background rounded-md px-3 text-sm"
          >
            <option value="all">All sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title || "Untitled"} — {new Date(s.started_at).toLocaleString()}
              </option>
            ))}
          </select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadCSV(rows, `saarthi-${sessionTitle}.csv`)}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" onClick={() => downloadSessionSummaryPDF({
              teacherName: profile?.full_name || "Teacher",
              sessionTitle, startedAt: new Date().toLocaleString(), rows, totals,
            })}>
              <FileText className="h-4 w-4 mr-1" /> Summary PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Interactions" value={totals.interactions} />
          <Stat label="Quiz answers" value={totals.quizzes} />
          <Stat label="Spoken (sec)" value={totals.speechSeconds} />
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Attempts per student">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="attempts" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Mode distribution">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={modeDist} dataKey="value" nameKey="name" outerRadius={90} label>
                  {modeDist.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-3">Per-student detail</h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left px-4 py-2">Student</th><th className="text-right px-4 py-2">Attempts</th><th className="text-right px-4 py-2">Quiz</th><th className="text-right px-4 py-2">Quiz %</th><th className="text-right px-4 py-2">Spoken (s)</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-right">{r.attempts}</td>
                    <td className="px-4 py-2 text-right">{r.quizCorrect}/{r.quizTotal}</td>
                    <td className="px-4 py-2 text-right">{r.quizTotal ? Math.round((r.quizCorrect / r.quizTotal) * 100) : 0}%</td>
                    <td className="px-4 py-2 text-right">{Math.round(r.spokenSeconds)}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No data yet for this session.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}
