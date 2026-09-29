import { useMemo } from "react";
import type { QuizEventRow } from "./ComplexionPie";

// How quiz sessions chose to see shades, built from events the quiz already logs:
//   selfie_uploaded   source: "camera" (live selfie) | "library" (uploaded photo);
//                     deduped per session, so it records the first photo only
//   results_viewed    skipped_selfie: true when a model image was picked
// Each session lands in one bucket. A session that did both (a selfie, then
// "Use A Model Instead", or the other way round) is counted separately
// so the model share isn't inflated or hidden.

const BUCKETS = [
  { key: "model", label: "Model image", color: "#2a78d6" },
  { key: "camera", label: "Live selfie", color: "#eb6834" },
  { key: "library", label: "Uploaded photo", color: "#1baf7a" },
  { key: "both", label: "Photo + model", color: "#9a9891" },
] as const;
type BucketKey = (typeof BUCKETS)[number]["key"];

const pct = (n: number, d: number) => (d === 0 ? "–" : `${Math.round((n / d) * 100)}%`);

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="border border-border rounded-2xl p-4 flex-1 min-w-[150px]">
    <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
    <p className="text-2xl font-medium" style={{ fontFamily: "'Wolpe Pegasus', serif" }}>{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const TryOnMethodPanel = ({ events }: { events: QuizEventRow[] }) => {
  const { counts, total } = useMemo(() => {
    const photo = new Map<string, "camera" | "library">();
    const model = new Set<string>();
    for (const e of events) {
      if (e.event_name === "selfie_uploaded") {
        const src = e.event_data?.source;
        if ((src === "camera" || src === "library") && !photo.has(e.session_id)) photo.set(e.session_id, src);
      } else if (e.event_name === "results_viewed" && e.event_data?.skipped_selfie === true) {
        model.add(e.session_id);
      }
    }
    const counts: Record<BucketKey, number> = { model: 0, camera: 0, library: 0, both: 0 };
    for (const [session, src] of photo) counts[model.has(session) ? "both" : src]++;
    for (const session of model) if (!photo.has(session)) counts.model++;
    return { counts, total: photo.size + counts.model };
  }, [events]);

  if (total === 0) return null;

  const photoOnly = counts.camera + counts.library;

  return (
    <div className="border border-border rounded-2xl p-5 space-y-5">
      <div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Try-On Method</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          How quiz sessions chose to see shades: a model image, a live selfie from the camera, or an uploaded
          photo. Each session counts once; sessions that used both a photo and a model are shown separately.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Tile label="Model image" value={pct(counts.model, total)} sub={`${counts.model} of ${total} sessions`} />
        <Tile label="Own photo" value={pct(photoOnly, total)} sub={`${counts.camera} live selfie · ${counts.library} uploaded`} />
        <Tile label="Photo + model" value={pct(counts.both, total)} sub={`${counts.both} sessions tried both`} />
        <Tile
          label="Model : own photo"
          value={photoOnly ? `${(counts.model / photoOnly).toFixed(2)} : 1` : "–"}
          sub="model-only sessions per photo-only session"
        />
      </div>

      <div className="space-y-1.5 text-[10px]">
        <div className="h-3 w-full flex rounded-sm overflow-hidden gap-[2px]">
          {BUCKETS.map((b) =>
            counts[b.key] > 0 ? (
              <div key={b.key} style={{ width: `${(counts[b.key] / total) * 100}%`, backgroundColor: b.color }} title={b.label} />
            ) : null,
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          {BUCKETS.map((b) => (
            <span key={b.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: b.color }} />
              {b.label} {counts[b.key]} · {pct(counts[b.key], total)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TryOnMethodPanel;
