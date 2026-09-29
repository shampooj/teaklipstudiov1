import { useMemo } from "react";
import { COLOR_LOOKS } from "@/data/colorLooks";
import type { QuizEventRow } from "./ComplexionPie";

// Answers to quiz v2's preferred color look question, one per session (a
// session that goes back and re-picks counts its latest answer).

const BLUE = "#2a78d6"; // single-series bars: one hue, magnitude only

const ColorLookPanel = ({ events }: { events: QuizEventRow[] }) => {
  const { counts, total } = useMemo(() => {
    const bySession = new Map<string, string>();
    for (const e of events) {
      if (e.event_name !== "color_look_selected") continue;
      const look = e.event_data?.color_look;
      if (typeof look === "string") bySession.set(e.session_id, look);
    }
    const counts = new Map<string, number>();
    for (const look of bySession.values()) counts.set(look, (counts.get(look) ?? 0) + 1);
    return { counts, total: bySession.size };
  }, [events]);

  if (total === 0) return null;
  const max = Math.max(...COLOR_LOOKS.map((l) => counts.get(l.id) ?? 0), 1);

  return (
    <div className="border border-border rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Color Look</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Answers to "What is your preferred lipstick color look?" (quiz version 2), one per session. {total} sessions answered.
        </p>
      </div>
      <ul className="space-y-2">
        {COLOR_LOOKS.map((l) => {
          const n = counts.get(l.id) ?? 0;
          return (
            <li key={l.id} className="text-[10px]" title={`${l.title} ${l.detail}`}>
              <div className="flex items-center justify-between gap-2">
                <span>{l.name}</span>
                <span className="font-mono text-muted-foreground">{n} · {Math.round((n / total) * 100)}%</span>
              </div>
              <div className="mt-0.5 h-2 rounded-sm bg-border/60 overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${(n / max) * 100}%`, backgroundColor: BLUE }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ColorLookPanel;
