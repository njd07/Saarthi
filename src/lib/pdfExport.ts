import jsPDF from "jspdf";

export type StudentRow = {
  name: string;
  attempts: number;
  quizCorrect: number;
  quizTotal: number;
  spokenSeconds: number;
};

export function downloadSessionSummaryPDF(opts: {
  teacherName: string;
  sessionTitle: string;
  startedAt: string;
  rows: StudentRow[];
  totals: { interactions: number; quizzes: number; speechSeconds: number };
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Saarthi — Class Session Summary", 40, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Teacher: ${opts.teacherName}`, 40, y);
  y += 16;
  doc.text(`Session: ${opts.sessionTitle}`, 40, y);
  y += 16;
  doc.text(`Started: ${opts.startedAt}`, 40, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Class totals", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Total interactions: ${opts.totals.interactions}`, 40, y); y += 14;
  doc.text(`Total quiz answers: ${opts.totals.quizzes}`, 40, y); y += 14;
  doc.text(`Total student speaking: ${opts.totals.speechSeconds}s`, 40, y); y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Per-student", 40, y);
  y += 18;
  doc.setFontSize(10);

  // header row
  const cols = [40, 200, 280, 360, 460];
  const headers = ["Student", "Attempts", "Quiz", "Quiz %", "Spoken (s)"];
  headers.forEach((h, i) => doc.text(h, cols[i], y));
  y += 6;
  doc.line(40, y, pageW - 40, y);
  y += 14;
  doc.setFont("helvetica", "normal");

  for (const r of opts.rows) {
    if (y > 780) { doc.addPage(); y = 48; }
    const pct = r.quizTotal ? Math.round((r.quizCorrect / r.quizTotal) * 100) : 0;
    doc.text(r.name, cols[0], y);
    doc.text(String(r.attempts), cols[1], y);
    doc.text(`${r.quizCorrect}/${r.quizTotal}`, cols[2], y);
    doc.text(`${pct}%`, cols[3], y);
    doc.text(String(Math.round(r.spokenSeconds)), cols[4], y);
    y += 14;
  }

  doc.save(`pathshala-${opts.sessionTitle.replace(/\s+/g, "-")}.pdf`);
}

export function downloadCSV(rows: StudentRow[], filename: string) {
  const header = "Student,Attempts,QuizCorrect,QuizTotal,SpokenSeconds";
  const body = rows
    .map((r) => [r.name, r.attempts, r.quizCorrect, r.quizTotal, Math.round(r.spokenSeconds)].join(","))
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
