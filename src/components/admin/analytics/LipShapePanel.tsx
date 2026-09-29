import { useMemo } from "react";
import LipShapeSketch, { LIP_SHAPES } from "@/components/LipShapeSketch";
import type { QuizEventRow } from "./ComplexionPie";

// Answers to quiz v2's lip shape question, one per session (a session that
// goes back and re-picks counts its latest answer). Visitors see Shape A–C;
// the admin view pairs each with its real name.

const BLUE = "#2a78d6"; // single-series bars: one hue, magnitude only

const LipShapePanel = ({ events }: { events: QuizEventRow[] }) => {
  const { counts, total } = useMemo(() => {
    const bySession = new Map<string, string>();
    for (const e of events) {
      if (e.event_name !== "lip_shape_selected") continue;
      const shape = e.event_data?.lip_shape;
      if (typeof shape === "string") bySession.set(e.session_id, shape);
    }
    const counts = new Map<string, number>();
    for (const shape of bySession.values()) counts.set(shape, (counts.get(shape) ?? 0) + 1);
    return { counts, total: bySession.size };
  }, [events]);

  if (total === 0) return null;
  const max = Math.max(...LIP_SHAPES.map((s) => counts.get(s.id) ?? 0), 1);

  return (
    <div className="border border-border rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Lip Shape</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Answers to "What is your lip shape?" (quiz version 2), one per session. {total} sessions answered.
        </p>
      </div>
      <ul className="space-y-2">
        {LIP_SHAPES.map((s) => {
          const n = counts.get(s.id) ?? 0;
          return (
            <li key={s.id} className="flex items-center gap-3 text-[10px]">
              <LipShapeSketch shape={s.id} className="w-12 shrink-0 text-foreground" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span>{s.label} · {s.name}</span>
                  <span className="font-mono text-muted-foreground">{n} · {Math.round((n / total) * 100)}%</span>
                </div>
                <div className="mt-0.5 h-2 rounded-sm bg-border/60 overflow-hidden">
                  <div className="h-full rounded-sm" style={{ width: `${(n / max) * 100}%`, backgroundColor: BLUE }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LipShapePanel;
