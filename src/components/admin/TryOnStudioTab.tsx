import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { PRODUCT_DETAILS, VARIANT_MAP } from "@/data/lipstickRecommendations";
import { LIP_TONE_ROWS, SKIN_TONES } from "@/data/toneOptions";
import { useShadeSettings } from "@/hooks/useShadeSettings";
import { useShadeSwatches, swatchColor } from "@/hooks/useShadeSwatches";
import { BANUBA_FINISHES, type BanubaFinish, finishLabel, resolveBanubaFinish } from "@/lib/banubaFinish";
import { SHINE_DEFAULT_SCALE, SHINE_SCALE_MAX } from "@/lib/banubaEffect";
import { snapshotShade, type ShadeSnapshotSpec } from "@/lib/banubaSnapshots";
import { Field, SliderField } from "./settingFields";

// Try-On Studio: put one shade on an uploaded photo, starting from that
// shade's tuned settings for a chosen complexion, adjust, crop, download.
// The photo never leaves the browser (object URL in, object URL out), and
// edits here are not saved back to Shade Settings.
//
// Resolution: snapshotShade downsizes inputs to 1280px on the long side, so
// downloads top out around there.

const VARIANT_NAMES = Object.keys(VARIANT_MAP);

interface Edits {
  hex: string;
  finish: BanubaFinish;
  opacity: number;
  gloss: number;
  shine_intensity: number;
  shine_scale: number;
}

const ASPECTS = [
  { id: "original", label: "Original", ratio: null },
  { id: "1x1", label: "Square 1:1", ratio: 1 },
  { id: "4x5", label: "Portrait 4:5", ratio: 4 / 5 },
  { id: "9x16", label: "Story 9:16", ratio: 9 / 16 },
  { id: "16x9", label: "Landscape 16:9", ratio: 16 / 9 },
] as const;
type AspectId = (typeof ASPECTS)[number]["id"];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the rendered image"));
    img.src = src;
  });

// The crop window inside an image of w×h: the largest rect at the aspect,
// slid along its free axis by focus (0 = left/top, 1 = right/bottom).
const cropRect = (w: number, h: number, ratio: number | null, focus: number) => {
  if (!ratio) return { x: 0, y: 0, w, h };
  if (w / h > ratio) {
    const cw = Math.round(h * ratio);
    return { x: Math.round((w - cw) * focus), y: 0, w: cw, h };
  }
  const ch = Math.round(w / ratio);
  return { x: 0, y: Math.round((h - ch) * focus), w, h: ch };
};

const TryOnStudioTab = () => {
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const [variant, setVariant] = useState(VARIANT_NAMES[0]);
  const [skinTone, setSkinTone] = useState<string>(SKIN_TONES[0].id);
  const [lipTone, setLipTone] = useState<string>(LIP_TONE_ROWS[0].id);
  const [edits, setEdits] = useState<Edits | null>(null);
  const [render, setRender] = useState<{ status: "idle" | "rendering" | "ready" | "failed"; url: string | null }>({ status: "idle", url: null });
  const [aspect, setAspect] = useState<AspectId>("original");
  const [focus, setFocus] = useState(0.5);
  const fileRef = useRef<HTMLInputElement>(null);
  const renderSeq = useRef(0);

  const { data: swatches } = useShadeSwatches();
  const { data: tuned, isLoading: tunedLoading } = useShadeSettings([variant], skinTone, lipTone);
  const tunedRow = tuned?.[variant];

  // Start from the tuned setting for this shade + complexion, or a generic
  // one from the product color when none has been tuned yet.
  const resetToTuned = () => {
    if (tunedRow) {
      setEdits({
        hex: tunedRow.hex,
        finish: resolveBanubaFinish(tunedRow.finish),
        opacity: tunedRow.opacity,
        gloss: tunedRow.gloss,
        shine_intensity: tunedRow.shine_intensity,
        shine_scale: tunedRow.shine_scale ?? SHINE_DEFAULT_SCALE,
      });
    } else {
      setEdits({
        hex: PRODUCT_DETAILS[variant]?.color ?? "#000000",
        finish: resolveBanubaFinish("satin"),
        opacity: 0.8,
        gloss: 0,
        shine_intensity: 0,
        shine_scale: SHINE_DEFAULT_SCALE,
      });
    }
  };
  // Picking a shade or complexion reloads its starting settings, once per
  // pick: a background refetch of the same settings mustn't wipe edits.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    const pick = `${variant}|${skinTone}|${lipTone}`;
    if (tunedLoading || loadedFor.current === pick) return;
    loadedFor.current = pick;
    resetToTuned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, skinTone, lipTone, tunedLoading]);

  // Re-render shortly after the last change; drop results that a newer
  // change has already superseded.
  useEffect(() => {
    if (!photo || !edits) return;
    const seq = ++renderSeq.current;
    setRender((prev) => ({ status: "rendering", url: prev.url }));
    const t = window.setTimeout(() => {
      const spec: ShadeSnapshotSpec = {
        key: variant,
        hex: edits.hex,
        finish: edits.finish,
        opacity: edits.opacity,
        gloss: edits.gloss,
        shineIntensity: edits.shine_intensity,
        shineScale: edits.shine_scale,
      };
      snapshotShade(photo.url, spec).then(
        (url) => {
          if (seq === renderSeq.current) setRender({ status: "ready", url });
        },
        (err) => {
          console.error("Try-on render failed:", err);
          if (seq === renderSeq.current) setRender({ status: "failed", url: null });
        },
      );
    }, 400);
    return () => window.clearTimeout(t);
  }, [photo, edits, variant]);

  // Revoke the uploaded photo's object URL when it's replaced.
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

  // Preview the crop: the rendered image as a background, framed at the aspect.
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!render.url) return;
    loadImage(render.url).then((img) => setRenderSize({ w: img.naturalWidth, h: img.naturalHeight }), () => setRenderSize(null));
  }, [render.url]);
  const crop = renderSize ? cropRect(renderSize.w, renderSize.h, ratio, focus) : null;
  // Which way the crop can slide, for the position slider's label.
  const slideAxis = crop && renderSize ? (crop.w < renderSize.w ? "Left ↔ Right" : crop.h < renderSize.h ? "Top ↕ Bottom" : null) : null;

  const download = async () => {
    if (!render.url || !renderSize || !crop) return;
    try {
      const img = await loadImage(render.url);
      const canvas = document.createElement("canvas");
      canvas.width = crop.w;
      canvas.height = crop.h;
      canvas.getContext("2d")!.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.95));
      if (!blob) throw new Error("Could not encode the image");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const base = photo?.name.replace(/\.[^.]+$/, "") ?? "photo";
      a.download = `teak-${variant.toLowerCase()}-${base}-${aspect}.jpg`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      console.error(e);
      toast.error("Download failed");
    }
  };

  const update = (patch: Partial<Edits>) => setEdits((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Try-On Studio</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Put a shade on any photo, adjust it, crop and download. The photo stays in your browser, and changes here aren't saved to
          Shade Settings. Downloads are up to about 1280px on the long side.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] gap-6">
        {/* Preview */}
        <div className="space-y-3">
          {!photo ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[4/5] border border-dashed border-foreground/30 rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-foreground/60 transition-colors">
              <Upload className="h-5 w-5" />
              <span className="text-[10px]">Upload a photo</span>
            </button>
          ) : (
            <div className="relative w-full flex items-center justify-center bg-muted rounded-md overflow-hidden min-h-[320px]">
              {render.url && crop && renderSize ? (
                <div
                  className="w-full"
                  style={{
                    aspectRatio: `${crop.w} / ${crop.h}`,
                    backgroundImage: `url(${render.url})`,
                    backgroundSize: `${(renderSize.w / crop.w) * 100}% auto`,
                    backgroundPosition: `${renderSize.w === crop.w ? 0 : (crop.x / (renderSize.w - crop.w)) * 100}% ${renderSize.h === crop.h ? 0 : (crop.y / (renderSize.h - crop.h)) * 100}%`,
                  }}
                />
              ) : (
                <img src={photo.url} alt="Uploaded" className="w-full h-auto opacity-60" />
              )}
              {render.status === "rendering" && (
                <span className="absolute top-2 left-2 rounded-full bg-background/85 px-2 py-0.5 text-[9px] uppercase tracking-widest">Rendering…</span>
              )}
              {render.status === "failed" && (
                <span className="absolute top-2 left-2 rounded-full bg-background/85 px-2 py-0.5 text-[9px] uppercase tracking-widest text-destructive">
                  Couldn't find lips in this photo
                </span>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setRender({ status: "idle", url: null });
              setPhoto({ url: URL.createObjectURL(f), name: f.name });
            }}
          />
          {photo && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8 rounded-full text-[10px]" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" /> Change photo
              </Button>
              <Button size="sm" className="h-8 rounded-full text-[10px]" disabled={render.status !== "ready"} onClick={download}>
                <Download className="h-3 w-3 mr-1" /> Download{crop ? ` (${crop.w}×${crop.h})` : ""}
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4 text-[10px]">
          <Field label="Shade">
            <Select value={variant} onValueChange={setVariant}>
              <SelectTrigger className="h-8 w-full text-[10px] rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-72">
                {VARIANT_NAMES.map((name) => (
                  <SelectItem key={name} value={name} className="text-[10px]">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: swatchColor(name, swatches) }} />
                      {name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Skin tone">
              <Select value={skinTone} onValueChange={setSkinTone}>
                <SelectTrigger className="h-8 w-full text-[10px] rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {SKIN_TONES.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-[10px]">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lip tone">
              <Select value={lipTone} onValueChange={setLipTone}>
                <SelectTrigger className="h-8 w-full text-[10px] rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-72">
                  {LIP_TONE_ROWS.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-[10px]">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <p className="text-[9px] text-muted-foreground -mt-2">
            {tunedLoading ? "Loading tuned settings…" : tunedRow ? "Started from the tuned setting for this complexion." : "No tuned setting for this complexion; started from the product color."}
          </p>

          {edits && (
            <>
              <Field label="Hex">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={edits.hex}
                    onChange={(e) => update({ hex: e.target.value })}
                    className="h-7 w-10 shrink-0 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input value={edits.hex} onChange={(e) => update({ hex: e.target.value })} className="h-7 w-full text-[10px] rounded-md" />
                </div>
              </Field>
              <Field label="Finish">
                <Select value={edits.finish} onValueChange={(v) => update({ finish: v as BanubaFinish })}>
                  <SelectTrigger className="h-7 w-full text-[10px] rounded-md border-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-72">
                    {BANUBA_FINISHES.map((f) => (
                      <SelectItem key={f} value={f} className="text-[10px]">{finishLabel(f)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <SliderField label="Opacity" value={edits.opacity} onChange={(v) => update({ opacity: v })} />
              <SliderField label="Gloss" value={edits.gloss} onChange={(v) => update({ gloss: v })} />
              <SliderField label="Shine intensity" value={edits.shine_intensity} onChange={(v) => update({ shine_intensity: v })} />
              <SliderField
                label="Shine scale"
                value={edits.shine_scale}
                max={SHINE_SCALE_MAX}
                disabled={edits.shine_intensity <= 0}
                onChange={(v) => update({ shine_scale: v })}
              />
              <Button variant="outline" size="sm" className="h-7 rounded-full text-[9px]" onClick={resetToTuned}>
                Reset to {tunedRow ? "tuned" : "starting"} setting
              </Button>
            </>
          )}

          <div className="border-t border-border pt-4 space-y-3">
            <Field label="Crop">
              <Select value={aspect} onValueChange={(v) => { setAspect(v as AspectId); setFocus(0.5); }}>
                <SelectTrigger className="h-8 w-full text-[10px] rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {ASPECTS.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-[10px]">{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {slideAxis && (
              <SliderField label={`Position (${slideAxis})`} value={focus} step={0.01} onChange={setFocus} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TryOnStudioTab;
