import { useEffect, useRef, useState } from "react";
import face from "@/assets/skin_tone/web/skin_tone_aashi.jpg";
import { rgbToHex, type Rgb } from "./tones";

// A real face with hotspots. On mount the photo is drawn to a canvas and each
// hotspot's colour is read from the pixels (a small averaged patch), so the
// swatches are measured, not illustrated. Hover or tap a spot to isolate it.
const SPOTS = [
  { id: "forehead", label: "Forehead", x: 0.53, y: 0.335 },
  { id: "cheek-l", label: "Cheek", x: 0.31, y: 0.585 },
  { id: "nose", label: "Nose", x: 0.49, y: 0.575 },
  { id: "cheek-r", label: "Cheek", x: 0.70, y: 0.57 },
  { id: "mouth", label: "Around the mouth", x: 0.40, y: 0.705 },
  { id: "lip-top", label: "Upper lip", x: 0.50, y: 0.688 },
  { id: "lip-bottom", label: "Lower lip", x: 0.50, y: 0.725 },
  { id: "jaw", label: "Jaw", x: 0.60, y: 0.80 },
  { id: "neck", label: "Neck", x: 0.47, y: 0.92 },
];

const MultiTonalFace = () => {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = face;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const out: Record<string, string> = {};
      const r = 4; // 9x9 patch
      for (const s of SPOTS) {
        const cx = Math.round(s.x * canvas.width);
        const cy = Math.round(s.y * canvas.height);
        const data = ctx.getImageData(cx - r, cy - r, r * 2 + 1, r * 2 + 1).data;
        const sum: Rgb = [0, 0, 0];
        for (let i = 0; i < data.length; i += 4) {
          sum[0] += data[i];
          sum[1] += data[i + 1];
          sum[2] += data[i + 2];
        }
        const n = data.length / 4;
        out[s.id] = rgbToHex([sum[0] / n, sum[1] / n, sum[2] / n]);
      }
      setColors(out);
    };
  }, []);

  const shown = active ? SPOTS.filter((s) => s.id === active) : SPOTS;

  return (
    <div className="border border-foreground p-4 lg:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_170px] gap-5 items-start">
        <div className="relative w-full max-w-[360px] mx-auto select-none" onMouseLeave={() => setActive(null)}>
          <img ref={imgRef} src={face} alt="A brown-skinned face used to sample its skin, undertone and lip colors" className="w-full aspect-[4/5] object-cover" draggable={false} />
          {SPOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${s.label} color ${colors[s.id] ?? ""}`}
              onMouseEnter={() => setActive(s.id)}
              onFocus={() => setActive(s.id)}
              onClick={() => setActive((a) => (a === s.id ? null : s.id))}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)] transition-transform ${
                active === s.id ? "scale-125 ring-2 ring-foreground" : active ? "opacity-60" : ""
              }`}
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, backgroundColor: colors[s.id] ?? "transparent" }}
            />
          ))}
        </div>
        <div>
          <p className="font-sans font-medium text-[9px] lg:text-[10px] uppercase tracking-normal text-muted-foreground mb-2">
            {active ? "Sampled here" : "One face, nine colors"}
          </p>
          <ul className="flex flex-col gap-1.5">
            {shown.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className="w-7 h-7 shrink-0 border border-border" style={{ backgroundColor: colors[s.id] ?? "transparent" }} />
                <div className="min-w-0">
                  <p className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground truncate">{s.label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{colors[s.id] ?? "…"}</p>
                </div>
              </li>
            ))}
          </ul>
          {!active && (
            <p className="mt-3 font-display text-[12px] leading-[16px] text-muted-foreground">Hover or tap a dot on the face.</p>
          )}
        </div>
      </div>
      <p className="mt-5 text-center font-display text-[12px] leading-[16px] lg:text-[15px] lg:leading-[21px] text-foreground">
        These swatches are read straight from the photo's pixels. The colors a lipstick has to sit
        beside change from the cheek to the jaw to the lip itself.
      </p>
    </div>
  );
};

export default MultiTonalFace;
