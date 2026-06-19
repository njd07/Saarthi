import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Student = { id: string; name: string };

type Props = {
  activeStudentId: string | null;
  onSelect: (s: Student | null) => void;
};

export function StudentChips({ activeStudentId, onSelect }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  async function load() {
    const r = await authFetch("/api/students");
    const d = await r.json();
    setStudents(d.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!newName.trim()) return;
    const r = await authFetch("/api/students", {
      method: "POST",
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (r.ok) {
      const data = await r.json();
      setStudents((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
      onSelect(data);
    }
    setNewName("");
    setAdding(false);
  }

  async function remove(id: string) {
    await authFetch(`/api/students/${id}`, { method: "DELETE" });
    setStudents((p) => p.filter((s) => s.id !== id));
    if (activeStudentId === id) onSelect(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Tag student:</span>
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-3 py-1 rounded-full text-xs border",
          !activeStudentId ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground",
        )}
      >
        Class
      </button>
      {students.map((s) => (
        <div key={s.id} className="flex items-center">
          <button
            onClick={() => onSelect(s)}
            className={cn(
              "px-3 py-1 rounded-l-full text-xs border-y border-l",
              activeStudentId === s.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-foreground hover:bg-muted",
            )}
          >
            {s.name}
          </button>
          <button
            onClick={() => remove(s.id)}
            className="px-1.5 py-1 rounded-r-full border-y border-r border-border text-muted-foreground hover:text-destructive"
            aria-label={`remove ${s.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {adding ? (
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            onBlur={add}
            placeholder="Name"
            className="h-7 w-28 text-xs"
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="px-2 py-1 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      )}
    </div>
  );
}
