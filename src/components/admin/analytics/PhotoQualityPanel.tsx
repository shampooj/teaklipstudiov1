import { useMemo, useState } from "react";
import { format } from "date-fns";
import { QUALITY_MESSAGES, type QualityReason } from "@/lib/photoQuality";
import type { QuizEventRow } from "./ComplexionPie";

// Photo quality gate analytics, built from three events the quiz logs:
//   photo_quality_check     one per uploaded photo, with verdict + metrics
//   photo_quality_override  when a failed photo is used anyway
//   selfie_uploaded         source: "camera" | "library"
// Headline tiles, a single-hue bar list of failure reasons, the camera vs
// library split, and a drill-down table of every check's numbers.

const BLUE = "#2a78d6"; // single-series bars: one hue, magnitude only
const ORANGE = "#eb6834"; // second categorical slot (library vs camera)

const REASON_LABELS: Record<QualityReason, string> = {
  no_face: "No face found",
  lips_cut_off: "Mouth cut off",
  too_small: "Face too small",
  too_large: "Face too large",
  off_center: "Off center",
  too_dark: "Too dark",
  too_bright: "Too bright",
};

interface CheckRow {
  session_id: string;
  at: string;
  source: string;
  tone: string;
  pass: boolean;
  skipped: boolean;
  reason: QualityReason | null;
  faceHeight: number | null;
  luma: number | null;
  dark: number | null;
  clipped: number | null;
  overridden: boolean;
  durationMs: number | null;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const fmt = (v: number | null, dp = 2) => (v === null ? "–" : v.toFixed(dp));
const pct = (n: number, d: number) => (d === 0 ? "–" : `${Math.round((n / d) * 100)}%`);

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="border border-border rounded-2xl p-4 flex-1 min-w-[150px]">
    <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
    <p className="text-2xl font-medium" style={{ fontFamily: "'Wolpe Pegasus', serif" }}>{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const PhotoQualityPanel = ({ events }: { events: QuizEventRow[] }) => {
  const [filter, setFilter] = useState<"all" | "pass" | "fail" | "override">("all");

  const model = useMemo(() => {
    const overrides = new Set<string>();
    for (const e of events) if (e.event_name === "photo_quality_override") overrides.add(e.session_id);

    const rows: CheckRow[] = [];
    for (const e of events) {
      if (e.event_name !== "photo_quality_check") continue;
      const d = e.event_data ?? {};
      rows.push({
        session_id: e.session_id,
        at: e.created_at,
        source: typeof d.source === "string" ? d.source : "–",
        tone: typeof d.skin_tone === "string" ? d.skin_tone.replace(/-/g, " ") : "–",
        pass: d.pass === true,
        skipped: d.skipped === true,
        reason: (typeof d.reason === "string" ? (d.reason as QualityReason) : null),
        faceHeight: num(d.faceHeight),
        luma: num(d.meanLuma),
        dark: num(d.darkPct),
        clipped: num(d.clippedPct),
        overridden: d.pass !== true && overrides.has(e.session_id),
        durationMs: num(d.duration_ms),
      });
    }
    rows.sort((a, b) => b.at.localeCompare(a.at));

    const judged = rows.filter((r) => !r.skipped);
    const passed = judged.filter((r) => r.pass).length;
    const failed = judged.length - passed;
    const overridden = judged.filter((r) => r.overridden).length;
    const skipped = rows.length - judged.length;

    const reasons = new Map<QualityReason, number>();
    for (const r of judged) if (!r.pass && r.reason) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
    const reasonList = [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);

    let camera = 0, library = 0;
    for (const e of events) {
      if (e.event_name !== "selfie_uploaded") continue;
      const src = e.event_data?.source;
      if (src === "camera") camera++;
      else if (src === "library") library++;
    }

    return { rows, judged: judged.length, passed, failed, overridden, skipped, reasonList, camera, library };
  }, [events]);

  if (model.rows.length === 0 && model.camera + model.library === 0) return null;

  const shown = model.rows.filter((r) =>
    filter === "all" ? true : filter === "pass" ? r.pass && !r.skipped : filter === "fail" ? !r.pass : r.overridden,
  );
  const maxReason = model.reasonList[0]?.count ?? 1;
  const uploads = model.camera + model.library;

  return (
    <div className="border border-border rounded-2xl p-5 space-y-5">
      <div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Photo Quality Gate</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Uploaded selfies are checked for a findable face, framing, and light before results. Skipped checks
          (model failed to load) are excluded from the rates.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Tile label="Pass rate" value={pct(model.passed, model.judged)} sub={`${model.passed} of ${model.judged} checked photos`} />
        <Tile label="Failed" value={String(model.failed)} sub={model.skipped ? `${model.skipped} skipped` : undefined} />
        <Tile label="Used anyway" value={pct(model.overridden, model.failed)} sub={`${model.overridden} of ${model.failed} failed photos`} />
        <Tile label="Camera vs library" value={uploads ? `${pct(model.camera, uploads)} · ${pct(model.library, uploads)}` : "–"} sub={`${model.camera} camera · ${model.library} library`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Why photos fail</p>
          {model.reasonList.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No failures in this range.</p>
          ) : (
            <ul className="space-y-1.5">
              {model.reasonList.map((r) => (
                <li key={r.reason} className="text-[10px]">
                  <div className="flex items-center justify-between gap-2">
                    <span>{REASON_LABELS[r.reason] ?? r.reason}</span>
                    <span className="font-mono text-muted-foreground">{r.count} · {pct(r.count, model.failed)}</span>
                  </div>
                  <div className="mt-0.5 h-2 rounded-sm bg-border/60 overflow-hidden">
                    <div className="h-full rounded-sm" style={{ width: `${(r.count / maxReason) * 100}%`, backgroundColor: BLUE }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Where selfies come from</p>
          {uploads === 0 ? (
            <p className="text-[10px] text-muted-foreground">No selfies in this range.</p>
          ) : (
            <div className="space-y-1.5 text-[10px]">
              <div className="h-3 w-full flex rounded-sm overflow-hidden gap-[2px]">
                <div style={{ width: `${(model.camera / uploads) * 100}%`, backgroundColor: BLUE }} title="Camera" />
                <div style={{ width: `${(model.library / uploads) * 100}%`, backgroundColor: ORANGE }} title="Library" />
              </div>
              <div className="flex gap-4 text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: BLUE }} />Camera {model.camera}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ORANGE }} />Library {model.library}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Every check</p>
          <div className="flex gap-1">
            {(["all", "pass", "fail", "override"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`text-[9px] uppercase tracking-normal px-2.5 h-6 rounded-full border ${filter === f ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {f === "override" ? "used anyway" : f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-border rounded-xl">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-background">
              <tr className="text-left text-muted-foreground">
                <th className="py-1.5 px-2 font-normal">When</th>
                <th className="py-1.5 px-2 font-normal">Source</th>
                <th className="py-1.5 px-2 font-normal">Tone</th>
                <th className="py-1.5 px-2 font-normal">Verdict</th>
                <th className="py-1.5 px-2 font-normal text-right">Face h</th>
                <th className="py-1.5 px-2 font-normal text-right">Luma</th>
                <th className="py-1.5 px-2 font-normal text-right">Dark %</th>
                <th className="py-1.5 px-2 font-normal text-right">Clip %</th>
                <th className="py-1.5 px-2 font-normal text-right">ms</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={9} className="py-3 px-2 text-muted-foreground">Nothing matches this filter.</td></tr>
              ) : shown.map((r, i) => (
                <tr key={`${r.session_id}-${r.at}-${i}`} className="border-t border-border/60">
                  <td className="py-1 px-2 whitespace-nowrap">{format(new Date(r.at), "MMM d, HH:mm")}</td>
                  <td className="py-1 px-2 capitalize">{r.source}</td>
                  <td className="py-1 px-2 capitalize">{r.tone}</td>
                  <td className="py-1 px-2">
                    {r.skipped ? (
                      <span className="text-muted-foreground">skipped</span>
                    ) : r.pass ? (
                      <span className="text-green-700">pass</span>
                    ) : (
                      <span className="text-red-700" title={r.reason ? QUALITY_MESSAGES[r.reason] : undefined}>
                        {r.reason ? REASON_LABELS[r.reason] : "fail"}{r.overridden ? " · used anyway" : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">{fmt(r.faceHeight)}</td>
                  <td className="py-1 px-2 text-right font-mono">{fmt(r.luma)}</td>
                  <td className="py-1 px-2 text-right font-mono">{fmt(r.dark, 1)}</td>
                  <td className="py-1 px-2 text-right font-mono">{fmt(r.clipped, 1)}</td>
                  <td className="py-1 px-2 text-right font-mono">{r.durationMs ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PhotoQualityPanel;
