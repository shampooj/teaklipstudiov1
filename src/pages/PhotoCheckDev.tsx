import { useEffect, useState } from "react";
import { checkPhotoQuality, type PhotoCheckOutcome } from "@/lib/photoQualityCheck";
import { THRESHOLDS, LUMA_BANDS } from "@/lib/photoQuality";
import { SKIN_TONES } from "@/data/toneOptions";

// Dev-only calibration page (/dev/photo-check, not routed in production):
// runs every curated model photo through the upload gate and tabulates the
// numbers, so THRESHOLDS can be tuned against known-good photos. Drop extra
// files onto the page to test bad ones.
// Each curated photo belongs to a quiz skin tone (toneOptions samples), so
// the gate is exercised with the same band a quiz-taker of that tone gets.
const toneBySrc = new Map<string, string>();
for (const t of SKIN_TONES) for (const src of t.samples) toneBySrc.set(src as string, t.id);

const MODEL_PHOTOS = Object.entries(
  import.meta.glob("@/assets/skin_tone/web/*.jpg", { eager: true, import: "default" }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => ({ name: path.split("/").pop() ?? path, src: src as string, tone: toneBySrc.get(src as string) ?? null }));

interface Row { name: string; src: string; tone: string | null; outcome: PhotoCheckOutcome | null }

const fmt = (n: number | null, dp = 2) => (n === null ? "–" : n.toFixed(dp));

const PhotoCheckDev = () => {
  const [rows, setRows] = useState<Row[]>(MODEL_PHOTOS.map((p) => ({ ...p, outcome: null })));

  const run = async (list: Row[]) => {
    for (const row of list) {
      const outcome = await checkPhotoQuality(row.src, { skinTone: row.tone });
      setRows((prev) => prev.map((r) => (r.src === row.src ? { ...r, outcome } : r)));
    }
  };

  useEffect(() => {
    void run(MODEL_PHOTOS.map((p) => ({ ...p, outcome: null })));
  }, []);

  const [testTone, setTestTone] = useState<string>("");
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const extra: Row[] = [...files].map((f) => ({ name: f.name, src: URL.createObjectURL(f), tone: testTone || null, outcome: null }));
    setRows((prev) => [...prev, ...extra]);
    void run(extra);
  };

  const passed = rows.filter((r) => r.outcome?.pass && !r.outcome.skipped).length;
  const done = rows.filter((r) => r.outcome).length;

  return (
    <div className="p-6 font-sans text-[12px]">
      <h1 className="font-display text-[28px] leading-[29px]">Photo quality gate calibration</h1>
      <p className="mt-2 text-muted-foreground">
        {done}/{rows.length} checked · {passed} pass · thresholds: face height {THRESHOLDS.faceHeightMin}–{THRESHOLDS.faceHeightMax},
        offset ≤ {THRESHOLDS.centerMaxOffsetX}/{THRESHOLDS.centerMaxOffsetY}, clipped ≤ {THRESHOLDS.clippedMaxPct}%, dark ≤ {THRESHOLDS.darkMaxPct}%
      </p>
      <p className="mt-1 text-muted-foreground">
        luma bands by skin tone: {Object.entries(LUMA_BANDS).map(([k, b]) => `${k} ${b.min}–${b.max}`).join(" · ")} · unknown {THRESHOLDS.lumaMin}–{THRESHOLDS.lumaMax}
      </p>
      <select value={testTone} onChange={(e) => setTestTone(e.target.value)} className="mt-3 mr-2 h-8 border border-border rounded-md text-[11px] px-2">
        <option value="">Tone for added photos: unknown</option>
        {SKIN_TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <label className="mt-3 inline-block border border-foreground rounded-full px-4 h-8 leading-8 cursor-pointer text-[10px] uppercase">
        Add photos to test
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </label>
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="text-left text-[10px] uppercase text-muted-foreground">
            <th className="py-1 pr-3">Photo</th>
            <th className="py-1 pr-3">Tone</th>
            <th className="py-1 pr-3">Verdict</th>
            <th className="py-1 pr-3">Face h</th>
            <th className="py-1 pr-3">Off x</th>
            <th className="py-1 pr-3">Off y</th>
            <th className="py-1 pr-3">Luma</th>
            <th className="py-1 pr-3">Clip %</th>
            <th className="py-1 pr-3">Dark %</th>
            <th className="py-1 pr-3">ms</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const o = r.outcome;
            return (
              <tr key={r.src} className="border-t border-border align-middle">
                <td className="py-1 pr-3 flex items-center gap-2">
                  <img src={r.src} alt="" className="w-10 h-12 object-cover" />
                  <span className="font-mono text-[10px]">{r.name}</span>
                </td>
                <td className="py-1 pr-3 text-[10px] text-muted-foreground">{r.tone ?? "–"}</td>
                <td className={`py-1 pr-3 font-medium ${!o ? "text-muted-foreground" : o.skipped ? "text-amber-600" : o.pass ? "text-green-700" : "text-red-700"}`}>
                  {!o ? "checking…" : o.skipped ? "skipped" : o.pass ? "pass" : o.reason}
                </td>
                <td className="py-1 pr-3 font-mono">{fmt(o?.metrics.faceHeight ?? null)}</td>
                <td className="py-1 pr-3 font-mono">{fmt(o?.metrics.offsetX ?? null)}</td>
                <td className="py-1 pr-3 font-mono">{fmt(o?.metrics.offsetY ?? null)}</td>
                <td className="py-1 pr-3 font-mono">{fmt(o?.metrics.meanLuma ?? null)}</td>
                <td className="py-1 pr-3 font-mono">{fmt(o?.metrics.clippedPct ?? null, 1)}</td>
                <td className="py-1 pr-3 font-mono">{fmt(o?.metrics.darkPct ?? null, 1)}</td>
                <td className="py-1 pr-3 font-mono">{o ? o.durationMs : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PhotoCheckDev;
