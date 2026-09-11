import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pipette } from "lucide-react";
import { useVariantImages } from "@/hooks/useVariantImages";
import { SHADE_SWATCHES_QUERY_KEY } from "@/hooks/useShadeSwatches";
import { PRODUCT_DETAILS } from "@/data/lipstickRecommendations";

// Admin control for the coloured dot shown for a shade. The hex can be typed,
// picked with the native colour input, lifted from any pixel on screen
// (EyeDropper API, Chromium only), or sampled from a pixel of the shade's
// Shopify images / an uploaded photo drawn onto a canvas.

interface Props {
  variantName: string;
  variantId: string;
  /** Saved swatch hex, or undefined when the shade still uses the catalog colour. */
  savedHex: string | undefined;
}

const normalizeHex = (raw: string): string | null => {
  const v = raw.trim().replace(/^#/, "");
  const full = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
  return /^[0-9a-fA-F]{6}$/.test(full) ? `#${full.toLowerCase()}` : null;
};

const rgbToHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");

const SwatchColorPicker = ({ variantName, variantId, savedHex }: Props) => {
  const qc = useQueryClient();
  const catalogHex = PRODUCT_DETAILS[variantName]?.color ?? "#000000";
  const [hex, setHex] = useState(savedHex ?? catalogHex);
  const [saving, setSaving] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hoverHex, setHoverHex] = useState<string | null>(null);
  const [canvasNote, setCanvasNote] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadUrlRef = useRef<string | null>(null);

  const variantImages = useVariantImages(useMemo(() => [variantId], [variantId]));
  const product = variantImages[variantId];
  const imageOptions = useMemo(() => {
    const list: { url: string; label: string }[] = [];
    if (product?.imageUrl) list.push({ url: product.imageUrl, label: "Packshot" });
    for (const m of product?.metaImages ?? []) {
      const name = m.url.split("/").pop()?.split("?")[0] ?? "image";
      list.push({ url: m.url, label: name.replace(/\.[a-z0-9]+$/i, "") });
    }
    return list;
  }, [product]);

  // Reset when the admin switches shade.
  useEffect(() => {
    setHex(savedHex ?? catalogHex);
    setImageSrc(null);
    setHoverHex(null);
    setCanvasNote(null);
  }, [variantName, savedHex, catalogHex]);

  // Draw the chosen image onto the sampling canvas. Shopify's CDN sends
  // Access-Control-Allow-Origin: *, so crossOrigin keeps the canvas readable.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const maxW = 560;
      const scale = Math.min(1, maxW / img.naturalWidth);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        ctx.getImageData(0, 0, 1, 1);
        setCanvasNote("Hover to preview a pixel, click to use it.");
      } catch {
        setCanvasNote("This image can't be sampled (cross-origin). Try uploading it instead.");
      }
    };
    img.onerror = () => {
      if (!cancelled) setCanvasNote("Couldn't load that image.");
    };
    img.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  useEffect(
    () => () => {
      if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    },
    [],
  );

  const sampleAt = (e: React.MouseEvent<HTMLCanvasElement>): string | null => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    try {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      return rgbToHex(r, g, b);
    } catch {
      return null;
    }
  };

  const eyeDropperSupported = typeof window !== "undefined" && "EyeDropper" in window;
  const pickFromScreen = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await new (window as any).EyeDropper().open();
      const picked = normalizeHex(result?.sRGBHex ?? "");
      if (picked) setHex(picked);
    } catch {
      // user cancelled
    }
  };

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    const url = URL.createObjectURL(file);
    uploadUrlRef.current = url;
    setImageSrc(url);
  };

  const save = async () => {
    const clean = normalizeHex(hex);
    if (!clean) {
      toast.error("Enter a 6-digit hex colour");
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from as any)("shade_swatches").upsert(
      { variant_name: variantName, hex: clean, updated_at: new Date().toISOString() },
      { onConflict: "variant_name" },
    );
    setSaving(false);
    if (error) {
      toast.error(`Failed to save swatch: ${error.message}`);
      return;
    }
    setHex(clean);
    toast.success(`${variantName} swatch saved`);
    void qc.invalidateQueries({ queryKey: SHADE_SWATCHES_QUERY_KEY });
  };

  const resetToCatalog = async () => {
    setSaving(true);
    const { error } = await (supabase.from as any)("shade_swatches").delete().eq("variant_name", variantName);
    setSaving(false);
    if (error) {
      toast.error(`Failed to reset: ${error.message}`);
      return;
    }
    setHex(catalogHex);
    toast.success(`${variantName} swatch back to catalog colour`);
    void qc.invalidateQueries({ queryKey: SHADE_SWATCHES_QUERY_KEY });
  };

  const previewHex = hoverHex ?? normalizeHex(hex) ?? catalogHex;

  return (
    <div className="border border-border rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Swatch colour</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          The coloured dot shown for {variantName} in the quiz. Sample a pixel from a product photo,
          pick from anywhere on screen, or type a hex.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className="w-10 h-10 rounded-full border border-border shrink-0"
          style={{ backgroundColor: previewHex }}
          title={previewHex}
        />
        <input
          type="color"
          value={normalizeHex(hex) ?? catalogHex}
          onChange={(e) => setHex(e.target.value)}
          className="h-8 w-10 rounded border border-border cursor-pointer bg-transparent"
          aria-label="Pick swatch colour"
        />
        <Input
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          className="h-8 w-28 text-[10px] rounded-md font-mono"
          aria-label="Swatch hex"
        />
        {eyeDropperSupported && (
          <Button
            type="button"
            variant="outline"
            onClick={pickFromScreen}
            className="h-8 rounded-full text-[9px] uppercase tracking-normal border-foreground gap-1.5"
          >
            <Pipette className="w-3 h-3" /> Pick from screen
          </Button>
        )}
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-8 rounded-full bg-foreground text-background hover:bg-foreground/85 text-[9px] uppercase tracking-normal px-4"
        >
          {saving ? "Saving…" : "Save swatch"}
        </Button>
        {savedHex && (
          <button
            type="button"
            onClick={resetToCatalog}
            disabled={saving}
            className="text-[9px] uppercase tracking-normal underline text-muted-foreground hover:text-foreground"
          >
            Reset to catalog ({catalogHex})
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Sample from an image</p>
        <div className="flex flex-wrap items-center gap-2">
          {imageOptions.map((opt) => (
            <button
              key={opt.url}
              type="button"
              onClick={() => setImageSrc(opt.url)}
              className={`rounded-md border overflow-hidden w-14 h-14 bg-muted ${
                imageSrc === opt.url ? "border-foreground" : "border-border hover:border-foreground/60"
              }`}
              title={opt.label}
            >
              <img src={opt.url} alt={opt.label} className="w-full h-full object-cover" />
            </button>
          ))}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="h-8 rounded-full text-[9px] uppercase tracking-normal border-foreground"
          >
            Upload an image
          </Button>
          {imageOptions.length === 0 && !product && (
            <span className="text-[10px] text-muted-foreground">Loading product photos…</span>
          )}
        </div>
        {imageSrc && (
          <div className="space-y-1">
            <canvas
              ref={canvasRef}
              onMouseMove={(e) => setHoverHex(sampleAt(e))}
              onMouseLeave={() => setHoverHex(null)}
              onClick={(e) => {
                const picked = sampleAt(e);
                if (picked) {
                  setHex(picked);
                  setHoverHex(null);
                }
              }}
              className="max-w-full rounded-md border border-border cursor-crosshair"
            />
            <p className="text-[10px] text-muted-foreground">
              {canvasNote}
              {hoverHex ? (
                <>
                  {" "}Under cursor: <span className="font-mono">{hoverHex}</span>
                </>
              ) : null}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwatchColorPicker;
