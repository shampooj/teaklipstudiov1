import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getComplexionType, SKIN_TONE_IDS, LIP_TONE_IDS } from "@/data/lipstickRecommendations";

// Distribution of complexion types across quiz sessions that reached the
// results screen. One count per session (a session that views results twice
// still counts once). The pie shows the eight most common types plus
// "Other"; the full ranking is in the table beneath, which is also the
// text-only view of the same numbers.

export interface QuizEventRow {
  event_name: string;
  session_id: string;
  created_at: string;
  event_data: Record<string, unknown> | null;
}

// Categorical slots in fixed order (validated palette); "Other" is neutral.
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const OTHER = "#9a9891";
const TOP_N = 8;

const TOOLTIP_STYLE = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "11px",
  fontFamily: "'ABC ROM', sans-serif",
};

const LABELS: Record<string, string> = {};
for (const s of SKIN_TONE_IDS) {
  for (const l of LIP_TONE_IDS) {
    const n = getComplexionType(s, l);
    if (n) LABELS[String(n)] = `${s.replace(/-/g, " ")} · ${l.replace(/-/g, " ")}`;
  }
}

const ComplexionPie = ({ events }: { events: QuizEventRow[] }) => {
  const [showAll, setShowAll] = useState(false);

  const { ranked, total } = useMemo(() => {
    const bySession = new Map<string, string>();
    for (const e of events) {
      if (e.event_name !== "results_viewed") continue;
      const n = e.event_data?.complexion_type;
      if (n === null || n === undefined) continue;
      // Keep the first results view per session.
      if (!bySession.has(e.session_id)) bySession.set(e.session_id, String(n));
    }
    const counts = new Map<string, number>();
    for (const n of bySession.values()) counts.set(n, (counts.get(n) ?? 0) + 1);
    const ranked = [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || Number(a.type) - Number(b.type));
    return { ranked, total: bySession.size };
  }, [events]);

  if (total === 0) return null;

  const top = ranked.slice(0, TOP_N);
  const rest = ranked.slice(TOP_N);
  const otherCount = rest.reduce((s, r) => s + r.count, 0);
  const pieData = [
    ...top.map((r, i) => ({ name: `Complexion ${r.type}`, value: r.count, fill: SERIES[i] })),
    ...(otherCount > 0 ? [{ name: `Other (${rest.length} types)`, value: otherCount, fill: OTHER }] : []),
  ];
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="border border-border rounded-2xl p-5 flex-1 min-w-[280px] max-w-md" style={{ backgroundColor: "hsl(var(--light-peach))" }}>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Complexion Type Distribution</p>
      <p className="text-[10px] text-muted-foreground mb-3">
        {total} sessions reached results · {ranked.length} of 50 types seen
      </p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2} stroke="hsl(var(--light-peach))" strokeWidth={2}>
              {pieData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [`${value} (${pct(value)})`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {pieData.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.fill }} />
            {d.name} {d.value}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        className="mt-3 text-[9px] uppercase tracking-widest underline text-muted-foreground hover:text-foreground"
      >
        {showAll ? "Hide full ranking" : "Show full ranking"}
      </button>
      {showAll && (
        <table className="mt-2 w-full text-[10px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 pr-2 font-normal">Type</th>
              <th className="py-1 pr-2 font-normal">Skin · lip</th>
              <th className="py-1 pr-2 font-normal text-right">Sessions</th>
              <th className="py-1 font-normal text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.type} className="border-t border-border/60">
                <td className="py-1 pr-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: i < TOP_N ? SERIES[i] : OTHER }} />
                  {r.type}
                </td>
                <td className="py-1 pr-2 text-muted-foreground capitalize">{LABELS[r.type] ?? "–"}</td>
                <td className="py-1 pr-2 text-right font-mono">{r.count}</td>
                <td className="py-1 text-right font-mono">{pct(r.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ComplexionPie;
