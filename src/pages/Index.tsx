import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Upload, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import teakLogo from "@/assets/teak-logo.png";
import skinLightBrown from "@/assets/skin-light-brown.jpg";
import skinMediumBrown from "@/assets/skin-medium-brown.jpg";
import skinDeepBrown from "@/assets/skin-deep-brown.jpg";
import skinRichBrown from "@/assets/skin-rich-brown.jpg";
import lipBeige from "@/assets/lip-beige.jpg";
import lipBrightPink from "@/assets/lip-bright-pink.jpg";
import lipMediumBrown from "@/assets/lip-medium-brown.png";
import lipDeepBrown from "@/assets/lip-deep-brown.jpg";
import lipTwoTonedPurple from "@/assets/lip-two-toned-purple.jpg";
import lipNeutralBrown from "@/assets/lip-neutral-brown.png";
import lipTwoTonedGrey from "@/assets/lip-two-toned-grey.png";
import lipMauvePink from "@/assets/lip-mauve-pink.png";
import lipTwoTonedBrown from "@/assets/lip-two-toned-brown.png";
import lipTwoTonedBeige from "@/assets/lip-two-toned-beige.png";
import lipBrownPink from "@/assets/lip-brown-pink.png";
import lipGreyBrown from "@/assets/lip-grey-brown.png";

type AppState = "skin-tone" | "lip-tone" | "idle" | "uploaded" | "processing" | "done";

const SKIN_TONES = [
  { id: "light-brown", label: "Light Brown", color: "#C68642", image: skinLightBrown },
  { id: "medium-brown", label: "Medium Brown", color: "#8D5524", image: skinMediumBrown },
  { id: "deep-brown", label: "Deep Brown", color: "#5C3317", image: skinDeepBrown },
  { id: "rich-brown", label: "Rich Brown", color: "#3B1E08", image: skinRichBrown },
] as const;

const LIP_TONES = [
  { id: "bright-pink", label: "Bright Pink", color: "#E8577E", image: lipBrightPink },
  { id: "brown-pink", label: "Brown Pink", color: "#C4787A", image: lipBrownPink },
  { id: "mauve-pink", label: "Mauve Pink", color: "#B5838D", image: lipMauvePink },
  { id: "beige", label: "Beige", color: "#D4A98C", image: lipBeige },
  { id: "two-toned-purple", label: "Two-Toned Purple", color: "#7A3B5E", image: lipTwoTonedPurple },
  { id: "two-toned-brown", label: "Two-Toned Brown", color: "#8B5E3C", image: lipTwoTonedBrown },
  { id: "two-toned-grey", label: "Two-Toned Grey", color: "#9A8B8B", image: lipTwoTonedGrey },
  { id: "two-toned-beige", label: "Two-Toned Beige", color: "#C9A68E", image: lipTwoTonedBeige },
  { id: "neutral-brown", label: "Neutral Brown", color: "#A0705A", image: lipNeutralBrown },
  { id: "medium-brown", label: "Medium Brown", color: "#7A5240", image: lipMediumBrown },
  { id: "deep-brown", label: "Deep Brown", color: "#4A2228", image: lipDeepBrown },
  { id: "grey-brown", label: "Grey Brown", color: "#7D6B65", image: lipGreyBrown },
] as const;

const LIPSTICK_LOOKS = [
  { id: "nude-rose", label: "Color Study Demi-Satin in Amira", description: "Soft mauve-brown nude with a natural demi-satin finish", color: "#b5837a", variantId: "45733638209689" },
  { id: "deep-terracotta", label: "Color Study Demi-Satin in Amrit", description: "Deep rich terracotta-brick with chocolate undertones", color: "#8b4533", variantId: "45733638340761" },
  { id: "classic-red", label: "Color Study Demi-Satin in Jiya", description: "Timeless, bold red — think Old Hollywood glamour", color: "#b91c1c", variantId: "45733638373529" },
  { id: "coral-sunset", label: "Color Study Demi-Satin in Riya", description: "Warm terracotta-brown matte with a 90s supermodel vibe", color: "#a0522d", variantId: "45733638275225" },
  { id: "berry-wine", label: "Sheer Lipstick Balm in Neha", description: "Deep berry-plum with a luxurious, moody vibe", color: "#7c2d4b", variantId: "45733508546713" },
] as const;

type LookId = (typeof LIPSTICK_LOOKS)[number]["id"];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeHue = (hue: number) => {
  const wrapped = hue % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

const shortestHueDelta = (from: number, to: number) => {
  const delta = ((to - from + 540) % 360) - 180;
  return delta;
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
  }

  return { h: h * 60, s, l };
};

const hslToRgb = (h: number, s: number, l: number) => {
  const hue = normalizeHue(h) / 360;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const hueToRgb = (t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };

  return {
    r: Math.round(hueToRgb(hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(hue) * 255),
    b: Math.round(hueToRgb(hue - 1 / 3) * 255),
  };
};

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3
    ? clean.split("").map((c) => `${c}${c}`).join("")
    : clean;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const blendLipstickPreservingTeeth = async (originalSrc: string, editedSrc: string, look: LookId) => {
  const [original, edited] = await Promise.all([loadImage(originalSrc), loadImage(editedSrc)]);

  const width = original.naturalWidth || original.width;
  const height = original.naturalHeight || original.height;
  const pixelCount = width * height;

  const originalCanvas = document.createElement("canvas");
  originalCanvas.width = width;
  originalCanvas.height = height;
  const originalCtx = originalCanvas.getContext("2d");

  const editedCanvas = document.createElement("canvas");
  editedCanvas.width = width;
  editedCanvas.height = height;
  const editedCtx = editedCanvas.getContext("2d");

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outputCtx = outputCanvas.getContext("2d");

  if (!originalCtx || !editedCtx || !outputCtx) {
    throw new Error("Canvas context unavailable");
  }

  originalCtx.drawImage(original, 0, 0, width, height);
  editedCtx.drawImage(edited, 0, 0, width, height);

  const originalData = originalCtx.getImageData(0, 0, width, height);
  const editedData = editedCtx.getImageData(0, 0, width, height);
  const outputData = outputCtx.createImageData(width, height);

  const lipPriorMask = new Uint8Array(pixelCount);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      const i = pixelIndex * 4;

      const r0 = originalData.data[i];
      const g0 = originalData.data[i + 1];
      const b0 = originalData.data[i + 2];

      const max0 = Math.max(r0, g0, b0);
      const min0 = Math.min(r0, g0, b0);
      const lightness0 = (max0 + min0) / 2;
      const chroma0 = max0 - min0;
      const saturation0 = max0 === 0 ? 0 : chroma0 / max0;
      const neutrality0 = Math.abs(r0 - g0) + Math.abs(g0 - b0) + Math.abs(r0 - b0);

      const isTeethLike = lightness0 > 150 && saturation0 < 0.28 && neutrality0 < 62;
      const inMouthBand = y > height * 0.32 && y < height * 0.90 && x > width * 0.1 && x < width * 0.9;
      const likelyLipTone =
        lightness0 > 12 &&
        lightness0 < 215 &&
        saturation0 > 0.04 &&
        chroma0 > 6 &&
        (r0 >= g0 - 30 || b0 >= g0 - 20 || lightness0 < 96);

      if (inMouthBand && likelyLipTone && !isTeethLike) {
        lipPriorMask[pixelIndex] = 1;
      }
    }
  }

  // Connected components on original-only lip prior (no edited-image geometry is used).
  const visited = new Uint8Array(pixelCount);
  const components: Array<{ indices: number[]; area: number; cx: number; cy: number; score: number }> = [];

  const tryVisit = (from: number, to: number, queue: number[]) => {
    if (to < 0 || to >= pixelCount) return;
    if (visited[to] || !lipPriorMask[to]) return;

    const fromX = from % width;
    const toX = to % width;
    if (Math.abs(fromX - toX) > 1) return;

    visited[to] = 1;
    queue.push(to);
  };

  for (let idx = 0; idx < pixelCount; idx++) {
    if (!lipPriorMask[idx] || visited[idx]) continue;

    const queue = [idx];
    visited[idx] = 1;

    const indices: number[] = [];
    let sumX = 0;
    let sumY = 0;

    for (let q = 0; q < queue.length; q++) {
      const cur = queue[q];
      indices.push(cur);

      const x = cur % width;
      const y = Math.floor(cur / width);
      sumX += x;
      sumY += y;

      tryVisit(cur, cur - 1, queue);
      tryVisit(cur, cur + 1, queue);
      tryVisit(cur, cur - width, queue);
      tryVisit(cur, cur + width, queue);
    }

    const area = indices.length;
    const areaRatio = area / pixelCount;
    if (areaRatio < 0.00004 || areaRatio > 0.09) continue;

    const cx = sumX / area;
    const cy = sumY / area;
    const centerXAffinity = 1 - Math.min(1, Math.abs(cx / width - 0.5) / 0.48);
    const centerYAffinity = 1 - Math.min(1, Math.abs(cy / height - 0.67) / 0.33);
    const score = area * (0.6 * centerXAffinity + 0.4 * centerYAffinity);

    components.push({ indices, area, cx, cy, score });
  }

  components.sort((a, b) => b.score - a.score);

  if (components.length === 0) {
    return originalSrc;
  }

  const finalMask = new Uint8Array(pixelCount);
  const primary = components[0];
  for (const idx of primary.indices) finalMask[idx] = 1;

  const secondary = components[1];
  if (
    secondary &&
    secondary.area > primary.area * 0.12 &&
    Math.abs(secondary.cx - primary.cx) < width * 0.26 &&
    Math.abs(secondary.cy - primary.cy) < height * 0.18
  ) {
    for (const idx of secondary.indices) finalMask[idx] = 1;
  }

  let finalMaskArea = 0;
  for (let idx = 0; idx < pixelCount; idx++) {
    if (finalMask[idx]) finalMaskArea++;
  }

  const finalMaskRatio = finalMaskArea / pixelCount;
  if (finalMaskRatio < 0.00005 || finalMaskRatio > 0.05) {
    return originalSrc;
  }

  const selectedLook = LIPSTICK_LOOKS.find((item) => item.id === look);
  const shadeRgb = hexToRgb(selectedLook?.color ?? "#b91c1c");
  const shadeHsl = rgbToHsl(shadeRgb.r, shadeRgb.g, shadeRgb.b);

  // Estimate mild global trend from AI output, but never use AI geometry.
  let hueDeltaSum = 0;
  let lightShiftSum = 0;
  let trendCount = 0;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    if (!finalMask[pixelIndex]) continue;

    const i = pixelIndex * 4;
    const o = rgbToHsl(originalData.data[i], originalData.data[i + 1], originalData.data[i + 2]);
    const e = rgbToHsl(editedData.data[i], editedData.data[i + 1], editedData.data[i + 2]);

    hueDeltaSum += clamp(shortestHueDelta(o.h, e.h), -40, 40);
    lightShiftSum += clamp(e.l - o.l, -0.1, 0.1);
    trendCount++;
  }

  const avgHueDelta = trendCount ? hueDeltaSum / trendCount : 0;
  const avgLightShift = trendCount ? lightShiftSum / trendCount : 0;

  const baseBlendOpacity =
    look === "classic-red"
      ? 0.94
      : look === "berry-wine"
        ? 0.9
        : 0.88;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    const i = pixelIndex * 4;

    const r0 = originalData.data[i];
    const g0 = originalData.data[i + 1];
    const b0 = originalData.data[i + 2];

    if (!finalMask[pixelIndex]) {
      outputData.data[i] = r0;
      outputData.data[i + 1] = g0;
      outputData.data[i + 2] = b0;
      outputData.data[i + 3] = originalData.data[i + 3];
      continue;
    }

    const max0 = Math.max(r0, g0, b0);
    const min0 = Math.min(r0, g0, b0);
    const lightness0 = (max0 + min0) / 2;
    const saturation0 = max0 === 0 ? 0 : (max0 - min0) / max0;
    const neutrality0 = Math.abs(r0 - g0) + Math.abs(g0 - b0) + Math.abs(r0 - b0);
    const isTeethLike = lightness0 > 150 && saturation0 < 0.28 && neutrality0 < 62;

    if (isTeethLike) {
      outputData.data[i] = r0;
      outputData.data[i + 1] = g0;
      outputData.data[i + 2] = b0;
      outputData.data[i + 3] = originalData.data[i + 3];
      continue;
    }

    const originalHsl = rgbToHsl(r0, g0, b0);
    const towardShade = shortestHueDelta(originalHsl.h, shadeHsl.h);

    const targetHue = normalizeHue(originalHsl.h + towardShade * 0.9 + avgHueDelta * 0.08);
    const targetSat = clamp(originalHsl.s * 0.12 + shadeHsl.s * 0.88, 0.18, 0.98);
    const targetLight = clamp(originalHsl.l * 0.84 + shadeHsl.l * 0.16 + avgLightShift * 0.05, 0.02, 0.9);

    const tinted = hslToRgb(targetHue, targetSat, targetLight);

    const blendOpacity = clamp(
      baseBlendOpacity + (look === "nude-rose" && lightness0 < 120 ? -0.06 : 0),
      0.72,
      0.96,
    );

    outputData.data[i] = Math.round(r0 + (tinted.r - r0) * blendOpacity);
    outputData.data[i + 1] = Math.round(g0 + (tinted.g - g0) * blendOpacity);
    outputData.data[i + 2] = Math.round(b0 + (tinted.b - b0) * blendOpacity);
    outputData.data[i + 3] = originalData.data[i + 3];
  }

  outputCtx.putImageData(outputData, 0, 0);
  return outputCanvas.toDataURL("image/png");
};

const Index = () => {
  const [state, setState] = useState<AppState>("skin-tone");
  const [skinTone, setSkinTone] = useState<string>("");
  const [lipTone, setLipTone] = useState<string>("");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedLook, setSelectedLook] = useState<LookId>("classic-red");
  const [progress, setProgress] = useState(0);
   const [addedToCart, setAddedToCart] = useState(false);
   const [cartError, setCartError] = useState(false);
   const [addingToCart, setAddingToCart] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const startProgress = useCallback(() => {
    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 500);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = null;
    setProgress(100);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image must be under 15MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setState("uploaded");
    };
    reader.readAsDataURL(file);
  }, []);

  const applyLipstick = useCallback(async () => {
    if (!originalImage) return;
    setState("processing");
    startProgress();

    try {
      const { data, error } = await supabase.functions.invoke("apply-lipstick", {
        body: { imageBase64: originalImage, look: selectedLook },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.resultImage) throw new Error("No edited image returned.");

      const finalImage = await blendLipstickPreservingTeeth(originalImage, data.resultImage as string, selectedLook);

      if (finalImage === originalImage) {
        toast.error("Couldn't safely isolate lips without changing facial features. Try a clearer front-facing photo.");
        stopProgress();
        setState("uploaded");
        return;
      }

      setResultImage(finalImage);
      stopProgress();
      setState("done");
      toast.success("Lipstick applied!");
    } catch (err: any) {
      console.error(err);
      stopProgress();
      toast.error(err.message || "Something went wrong. Please try again.");
      setState("uploaded");
    }
  }, [originalImage, selectedLook]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setState("skin-tone");
    setSkinTone("");
    setLipTone("");
    setOriginalImage(null);
    setResultImage(null);
    setSelectedLook("classic-red");
  };

  const tryAnotherLook = () => {
    setState("uploaded");
    setResultImage(null);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `lipstick-${selectedLook}.png`;
    link.click();
  };

  const currentLookLabel = LIPSTICK_LOOKS.find((l) => l.id === selectedLook)?.label ?? "";

  return (
    <div className="bg-background flex flex-col">
      {/* Header */}
      <header className="py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <img src={teakLogo} alt="TEAK" className="h-10 md:h-12 mx-auto" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-foreground font-display text-lg tracking-wide"
        >
          Virtual Lip Studio
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-2 text-foreground font-sans text-sm max-w-md mx-auto"
        >
          BETA
        </motion.p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Step 1: Skin Tone */}
            {state === "skin-tone" && (
              <motion.div
                key="skin-tone"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="text-center w-full">
                  <p className="font-display text-xl text-foreground">
                    Which image matches your skin tone most closely?
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    If you're in between, go with the deeper shade
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm mx-auto">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setSkinTone(tone.id)}
                        className={`group flex flex-col items-center gap-3 p-4 border transition-all duration-200 hover:border-foreground/40 ${
                          skinTone === tone.id
                            ? "border-foreground ring-1 ring-foreground"
                            : "border-border"
                        }`}
                      >
                        {'image' in tone && tone.image ? (
                          <img
                            src={tone.image}
                            alt={tone.label}
                            className="w-full aspect-square rounded-sm object-cover"
                          />
                        ) : (
                          <div
                            className="w-full aspect-square rounded-sm"
                            style={{ backgroundColor: tone.color }}
                          />
                        )}
                        <span className="font-display text-xs text-foreground">{tone.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-8">
                    <Button
                      onClick={() => setState("lip-tone")}
                      disabled={!skinTone}
                      size="lg"
                      className="bg-foreground text-background hover:bg-foreground/85 font-sans text-[9px] uppercase gap-2 px-8"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Lip Tone */}
            {state === "lip-tone" && (
              <motion.div
                key="lip-tone"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="text-center w-full">
                  <p className="font-display text-xl text-foreground">
                    Which matches your lip tone most closely?
                  </p>
                  <div className="mt-8 grid grid-cols-4 gap-3 w-full max-w-md mx-auto">
                    {LIP_TONES.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setLipTone(tone.id)}
                        className={`group flex flex-col items-center gap-2 p-3 border transition-all duration-200 hover:border-foreground/40 ${
                          lipTone === tone.id
                            ? "border-foreground ring-1 ring-foreground"
                            : "border-border"
                        }`}
                      >
                        {'image' in tone && tone.image ? (
                          <img src={tone.image} alt={tone.label} className="w-full aspect-square rounded-sm object-cover" />
                        ) : (
                          <div
                            className="w-full aspect-square rounded-sm"
                            style={{ backgroundColor: tone.color }}
                          />
                        )}
                        <span className="font-display text-[10px] text-foreground leading-tight">{tone.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-8 flex gap-3 justify-center">
                    <Button
                      onClick={() => setState("idle")}
                      disabled={!lipTone}
                      size="lg"
                      className="bg-foreground text-background hover:bg-foreground/85 font-sans text-[9px] uppercase gap-2 px-8"
                    >
                      Next
                    </Button>
                    <Button
                      onClick={() => setState("skin-tone")}
                      size="lg"
                      variant="outline"
                      className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground/5"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Upload */}
            {state === "idle" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <label
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="group relative block cursor-pointer border border-border bg-background p-12 sm:p-16 text-center transition-all duration-300 hover:border-foreground/40"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                  <div className="flex flex-col items-center gap-6">
                    <Upload className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <div>
                      <p className="font-display text-xl text-foreground">
                        Drop your selfie here
                      </p>
                      <p className="mt-2 text-muted-foreground font-sans text-[9px] uppercase">
                        or click to browse · JPG, PNG up to 15MB
                      </p>
                      <p className="mt-3 text-muted-foreground font-sans text-[10px]">
                        Please make sure you aren't wearing a white t-shirt in the photo, as it confuses the technology.
                      </p>
                    </div>
                  </div>
                </label>
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={() => setState("lip-tone")}
                    size="lg"
                    variant="outline"
                    className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground/5"
                  >
                    Go Back
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Pick a look */}
            {state === "uploaded" && originalImage && (
              <motion.div
                key="pick-look"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="w-64 h-64 overflow-hidden">
                  <img
                    src={originalImage}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="w-full max-w-sm flex flex-col gap-5">
                   <label className="font-display text-lg text-foreground text-center">
                     Choose your lipstick look
                   </label>
                  <Select value={selectedLook} onValueChange={(v) => setSelectedLook(v as LookId)}>
                    <SelectTrigger className="w-full font-sans text-[9px] border-foreground/20 text-left">
                      <SelectValue placeholder="Select a look" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIPSTICK_LOOKS.map((look) => (
                        <SelectItem key={look.id} value={look.id}>
                          <div className="flex items-start gap-2.5">
                            <span
                              className="mt-1 h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: look.color }}
                            />
                            <div className="flex flex-col">
                              <span className="font-display text-sm">{look.label}</span>
                              <span className="font-sans text-[9px] text-muted-foreground">{look.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-3 justify-center pt-2">
                    <Button
                      onClick={applyLipstick}
                      size="lg"
                      className="bg-foreground text-background hover:bg-foreground/85 font-sans text-[9px] uppercase gap-2 px-8"
                    >
                      Apply Look
                    </Button>
                    <Button onClick={() => { setOriginalImage(null); setState("idle"); }} size="lg" variant="outline" className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground/5">
                      Go Back
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Processing */}
            {state === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8 py-12"
              >
                {originalImage && (
                  <div className="relative w-64 h-64 overflow-hidden">
                    <img src={originalImage} alt="Your photo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-foreground/10 animate-pulse" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                  <Progress value={progress} className="h-2 w-full" />
                  <p className="text-muted-foreground font-display text-sm">
                    Applying {currentLookLabel}…
                  </p>
                </div>
              </motion.div>
            )}

            {/* Result */}
            {state === "done" && resultImage && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="flex flex-col items-center gap-3">
                    <span className="font-sans text-[9px] text-foreground uppercase">Before</span>
                    <div className="w-64 h-64 overflow-hidden">
                      <img src={originalImage!} alt="Before" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <span className="font-sans text-[9px] text-foreground uppercase">
                      {currentLookLabel}
                    </span>
                    <div className="w-64 h-64 overflow-hidden">
                      <img src={resultImage} alt={`With ${currentLookLabel}`} className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
                  <Button
                    size="lg"
                    className={`font-sans text-[9px] uppercase gap-2 px-8 w-full transition-all duration-300 ${
                      addedToCart
                        ? "bg-green-700 text-white hover:bg-green-700 border-green-700"
                        : cartError
                        ? "bg-red-700 text-white hover:bg-red-700 border-red-700"
                        : "bg-foreground text-background hover:bg-foreground/85"
                    }`}
                    disabled={addedToCart || cartError || addingToCart}
                    onClick={async () => {
                      const look = LIPSTICK_LOOKS.find(l => l.id === selectedLook);
                      if (!look || !resultImage) return;

                      // Generate a unique image ID
                      const imageId = crypto.randomUUID();

                      // AI-powered crop of lip/lower face region
                      let imageUrl: string | null = null;
                      try {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        await new Promise<void>((resolve, reject) => {
                          img.onload = () => resolve();
                          img.onerror = reject;
                          img.src = originalImage!;
                        });

                        // Get a small base64 version for detection
                        const detectCanvas = document.createElement("canvas");
                        const maxDetectSize = 512;
                        const scale = Math.min(maxDetectSize / img.width, maxDetectSize / img.height, 1);
                        detectCanvas.width = Math.round(img.width * scale);
                        detectCanvas.height = Math.round(img.height * scale);
                        const detectCtx = detectCanvas.getContext("2d")!;
                        detectCtx.drawImage(img, 0, 0, detectCanvas.width, detectCanvas.height);
                        const detectBase64 = detectCanvas.toDataURL("image/jpeg", 0.7);

                        // Call AI to detect lip region
                        let cropTop = 0.55, cropBottom = 1.0, cropLeft = 0.0, cropRight = 1.0;
                        try {
                          const { data: regionData, error: regionError } = await supabase.functions.invoke("detect-lip-region", {
                            body: { imageBase64: detectBase64 },
                          });
                          if (!regionError && regionData && regionData.top !== undefined) {
                            cropTop = Math.max(regionData.top, 0.5); // Never go above 50% to ensure eyes are excluded
                            cropBottom = regionData.bottom;
                            cropLeft = regionData.left;
                            cropRight = regionData.right;
                          } else {
                            console.warn("Lip detection failed, using fallback crop:", regionError);
                          }
                        } catch (detectErr) {
                          console.warn("Lip detection error, using fallback crop:", detectErr);
                        }

                        const canvas = document.createElement("canvas");
                        const startX = Math.floor(img.width * cropLeft);
                        const startY = Math.floor(img.height * cropTop);
                        const cropWidth = Math.floor(img.width * (cropRight - cropLeft));
                        const cropHeight = Math.floor(img.height * (cropBottom - cropTop));
                        canvas.width = cropWidth;
                        canvas.height = cropHeight;
                        const ctx = canvas.getContext("2d")!;
                        ctx.drawImage(img, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
                        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85));
                        const fileName = `${imageId}.jpg`;
                        const { data: uploadData, error: uploadError } = await supabase.storage.from("cart-images").upload(fileName, blob, { contentType: "image/jpeg" });
                        if (uploadError) {
                          console.error("Failed to upload image:", uploadError);
                        } else {
                          const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from("cart-images").createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);
                          if (signedUrlError) {
                            console.error("Failed to create signed URL:", signedUrlError);
                          } else {
                            imageUrl = signedUrlData.signedUrl;
                          }
                        }
                      } catch (e) {
                        console.error("Failed to crop/upload image:", e);
                      }

                      // Save submission to database
                      supabase.from("customer_submissions" as any).insert({
                        shade_id: look.id,
                        shade_label: look.label,
                        variant_id: look.variantId,
                        image_url: imageUrl,
                        image_id: imageId,
                      } as any).then(({ error: insertError }) => {
                        if (insertError) console.error("Failed to track cart click:", insertError);
                      });

                      // Ask the Shopify parent page to add to cart via postMessage bridge
                      setAddingToCart(true);
                      try {
                        const cartPromise = new Promise<boolean>((resolve) => {
                          const timeout = setTimeout(() => resolve(false), 5000);
                          const handler = (event: MessageEvent) => {
                            if (event.data?.type === "cart-add-response") {
                              clearTimeout(timeout);
                              window.removeEventListener("message", handler);
                              resolve(!!event.data.success);
                            }
                          };
                          window.addEventListener("message", handler);
                        });
                        window.top?.postMessage({
                          type: "cart-add",
                          variantId: parseInt(look.variantId),
                          quantity: 1,
                        }, "*");
                        const success = await cartPromise;
                        if (success) {
                          setAddedToCart(true);
                        } else {
                          setCartError(true);
                        }
                      } catch {
                        setCartError(true);
                      } finally {
                        setAddingToCart(false);
                      }
                    }}
                  >
                    {addingToCart ? (
                      <>
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                        Adding to Cart…
                      </>
                    ) : addedToCart ? (
                      <>
                        <Check className="w-3 h-3" />
                        Added to Cart
                      </>
                    ) : cartError ? (
                      <>Failed to add to cart</>
                    ) : (
                      <>Add to Cart — {currentLookLabel}</>
                    )}
                  </Button>

                  <Select value="" onValueChange={(v) => {
                    if (!v) return;
                    setSelectedLook(v as LookId);
                    setAddedToCart(false);
                    setCartError(false);
                    setAddingToCart(false);
                    setResultImage(null);
                    setState("uploaded");
                  }}>
                    <SelectTrigger className="w-full font-sans text-[9px] border-foreground/20 text-left">
                      <SelectValue placeholder="Try another look" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIPSTICK_LOOKS.map((look) => (
                        <SelectItem key={look.id} value={look.id}>
                          <div className="flex items-start gap-2.5">
                            <span
                              className="mt-1 h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: look.color }}
                            />
                            <div className="flex flex-col">
                              <span className="font-display text-sm">{look.label}</span>
                              <span className="font-sans text-[9px] text-muted-foreground">{look.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={reset} size="lg" variant="outline" className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground/5">
                    New Photo
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Index;
