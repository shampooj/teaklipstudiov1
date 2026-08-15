import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useVariantImages, getSkinToneImage } from "@/hooks/useVariantImages";
import { shopifyImg } from "@/lib/shopifyImg";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Share2 } from "lucide-react";
import { Upload, Download, RotateCcw, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getComplexionType, Recommendation, PRODUCT_DETAILS, VARIANT_MAP } from "@/data/lipstickRecommendations";
import { shareLook, downloadLook } from "@/lib/shareLook";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useShadeSettings } from "@/hooks/useShadeSettings";
import { useBanubaSnapshots } from "@/hooks/useBanubaSnapshots";
import type { ShadeSnapshotSpec } from "@/lib/banubaSnapshots";
import TryOnOtherShades from "@/components/TryOnOtherShades";
import { useQuizTracking } from "@/hooks/useQuizTracking";
import teakLogo from "@/assets/teak-logo.png";
import skinLightBrown from "@/assets/skin-light-brown.jpg";
import skinMediumBrown from "@/assets/skin-medium-brown.jpg";
import skinDeepBrown from "@/assets/skin-deep-brown.jpg";
import skinRichBrown from "@/assets/skin-rich-brown.jpg";
import ltBeige1 from "@/assets/lip-tone/web/beige-1.jpg";
import ltBeige2 from "@/assets/lip-tone/web/beige-2.jpg";
import ltBeige3 from "@/assets/lip-tone/web/beige-3.jpg";
import ltBeige4 from "@/assets/lip-tone/web/beige-4.jpg";
import ltBrownRose1 from "@/assets/lip-tone/web/brown-rose-1.jpg";
import ltBrownRose2 from "@/assets/lip-tone/web/brown-rose-2.jpg";
import ltBrownRose3 from "@/assets/lip-tone/web/brown-rose-3.jpg";
import ltBrownRose4 from "@/assets/lip-tone/web/brown-rose-4.jpg";
import ltChestnut1 from "@/assets/lip-tone/web/chestnut-1.jpg";
import ltChestnut2 from "@/assets/lip-tone/web/chestnut-2.jpg";
import ltChestnut3 from "@/assets/lip-tone/web/chestnut-3.jpg";
import ltChestnut4 from "@/assets/lip-tone/web/chestnut-4.jpg";
import ltDeepBrownRose1 from "@/assets/lip-tone/web/deep-brown-rose-1.jpg";
import ltDeepBrownRose2 from "@/assets/lip-tone/web/deep-brown-rose-2.jpg";
import ltDeepBrownRose3 from "@/assets/lip-tone/web/deep-brown-rose-3.jpg";
import ltDeepBrownRose4 from "@/assets/lip-tone/web/deep-brown-rose-4.jpg";
import ltGreyRose1 from "@/assets/lip-tone/web/grey-rose-1.jpg";
import ltGreyRose2 from "@/assets/lip-tone/web/grey-rose-2.jpg";
import ltGreyRose3 from "@/assets/lip-tone/web/grey-rose-3.jpg";
import ltGreyRose4 from "@/assets/lip-tone/web/grey-rose-4.jpg";
import ltMauve1 from "@/assets/lip-tone/web/mauve-1.jpg";
import ltMauve2 from "@/assets/lip-tone/web/mauve-2.jpg";
import ltMauve3 from "@/assets/lip-tone/web/mauve-3.jpg";
import ltMauve4 from "@/assets/lip-tone/web/mauve-4.jpg";
import ltMostlyDeepBrown1 from "@/assets/lip-tone/web/mostly-deep-brown-1.jpg";
import ltMostlyDeepBrown2 from "@/assets/lip-tone/web/mostly-deep-brown-2.jpg";
import ltMostlyDeepBrown3 from "@/assets/lip-tone/web/mostly-deep-brown-3.jpg";
import ltMostlyDeepBrown4 from "@/assets/lip-tone/web/mostly-deep-brown-4.jpg";
import ltMostlyPurple1 from "@/assets/lip-tone/web/mostly-purple-1.jpg";
import ltMostlyPurple2 from "@/assets/lip-tone/web/mostly-purple-2.jpg";
import ltMostlyPurple3 from "@/assets/lip-tone/web/mostly-purple-3.jpg";
import ltMostlyPurple4 from "@/assets/lip-tone/web/mostly-purple-4.jpg";
import ltMostlyLightBrown1 from "@/assets/lip-tone/web/mostly-light-brown-1.jpg";
import ltMostlyLightBrown2 from "@/assets/lip-tone/web/mostly-light-brown-2.jpg";
import ltMostlyLightBrown3 from "@/assets/lip-tone/web/mostly-light-brown-3.jpg";
import ltMostlyLightBrown4 from "@/assets/lip-tone/web/mostly-light-brown-4.jpg";
import ltMostlyPink1 from "@/assets/lip-tone/web/mostly-pink-1.jpg";
import ltMostlyPink2 from "@/assets/lip-tone/web/mostly-pink-2.jpg";
import ltMostlyPink3 from "@/assets/lip-tone/web/mostly-pink-3.jpg";
import ltMostlyPink4 from "@/assets/lip-tone/web/mostly-pink-4.jpg";
import nero from "@/assets/nero.jpg";
import cynthia from "@/assets/cynthia.jpg";
import anastasia from "@/assets/anastasia.jpg";
import maseray from "@/assets/maseray.jpg";
import sanna from "@/assets/sanna.jpg";
import hareem from "@/assets/hareem.png";
import noreen from "@/assets/noreen.jpg";
import arris from "@/assets/arris.jpg";
import stSanna from "@/assets/skin_tone/web/skin_tone_sanna.jpg";
import stSaira from "@/assets/skin_tone/web/skin_tone_saira.jpg";
import stArris from "@/assets/skin_tone/web/skin_tone_arris.jpg";
import stHareem from "@/assets/skin_tone/web/skin_tone_hareem.jpg";
import stTerushka from "@/assets/skin_tone/web/skin_tone_terushka.jpg";
import stNoreen from "@/assets/skin_tone/web/skin_tone_noreen.jpg";
import stTanvi from "@/assets/skin_tone/web/skin_tone_tanvi.jpg";
import stAashi from "@/assets/skin_tone/web/skin_tone_aashi.jpg";
import stCynthia from "@/assets/skin_tone/web/skin_tone_cynthia.jpg";
import stAnastasia from "@/assets/skin_tone/web/skin_tone_anastasia.jpg";
import stNero from "@/assets/skin_tone/web/skin_tone_nero.jpg";
import stPritt from "@/assets/skin_tone/web/skin_tone_pritt.jpg";
import stMaseray from "@/assets/skin_tone/web/skin_tone_maseray.jpg";
import stAaliyah from "@/assets/skin_tone/web/skin_tone_aaliyah.jpg";
import stDivya from "@/assets/skin_tone/web/skin_tone_divya.jpg";
import stDoe from "@/assets/skin_tone/web/skin_tone_doe.jpg";
import stCharithra from "@/assets/skin_tone/web/skin_tone_charithra.jpg";
import stGeeta from "@/assets/skin_tone/web/skin_tone_geeta.jpg";
import stApoorva from "@/assets/skin_tone/web/skin_tone_apoorva.jpg";
import stLakshmi from "@/assets/skin_tone/web/skin_tone_lakshmi.jpg";
import terushka from "@/assets/terushka.jpg";
import aashi from "@/assets/aashi.jpg";
import aaliyah from "@/assets/aaliyah.jpg";
import nupoora from "@/assets/nupoora.jpg";
import tanvi from "@/assets/tanvi.jpg";

const AVATAR_OPTIONS = [
  { id: "avatar-6", url: stMaseray },
  { id: "skin-rich-brown", url: stAaliyah },
  { id: "avatar-3", url: stNero },
  { id: "avatar-4", url: stCynthia },
  { id: "avatar-5", url: stAnastasia },
  { id: "avatar-mauve-model", url: stTanvi },
  { id: "skin-medium-brown", url: stTerushka },
  { id: "skin-light-brown", url: stSanna },
  { id: "avatar-geeta", url: stGeeta },
  { id: "avatar-apoorva", url: stApoorva },
  { id: "avatar-aashi", url: stAashi },
  { id: "avatar-divya", url: stDivya },
] as const;

type AppState = "skin-tone" | "lip-tone" | "idle" | "analyzing" | "uploaded";

const SHIRT_OPTIONS = [
  { id: "Pure White", label: "Pure White", color: "#FFFFFF" },
  { id: "Cream", label: "Off White", color: "#FAF7F0" },
  { id: "I'm not sure", label: "I'm not sure", color: null as string | null },
] as const;

const SKIN_TONES = [
{ id: "light-brown", label: "Light Brown", color: "#C68642", image: skinLightBrown },
{ id: "medium-brown", label: "Medium Brown", color: "#8D5524", image: skinMediumBrown },
{ id: "deep-brown", label: "Deep Brown", color: "#5C3317", image: skinDeepBrown },
{ id: "rich-brown", label: "Rich Brown", color: "#3B1E08", image: skinRichBrown },
{ id: "full-brown", label: "Full Brown", color: "#2A1505" }] as
const;

const LIP_TONE_ROWS = [
{ id: "mostly-pink", label: "Mostly Pink", images: [ltMostlyPink1, ltMostlyPink2, ltMostlyPink3, ltMostlyPink4] },
{ id: "beige", label: "Beige", images: [ltBeige1, ltBeige2, ltBeige3, ltBeige4] },
{ id: "chestnut", label: "Chestnut", images: [ltChestnut1, ltChestnut2, ltChestnut3, ltChestnut4] },
{ id: "mauve", label: "Mauve", images: [ltMauve1, ltMauve2, ltMauve3, ltMauve4] },
{ id: "brown-rose", label: "Brown Rose", images: [ltBrownRose1, ltBrownRose2, ltBrownRose3, ltBrownRose4] },
{ id: "grey-rose", label: "Grey Rose", images: [ltGreyRose1, ltGreyRose2, ltGreyRose3, ltGreyRose4] },
{ id: "deep-brown-rose", label: "Deep Brown Rose", images: [ltDeepBrownRose1, ltDeepBrownRose2, ltDeepBrownRose3, ltDeepBrownRose4] },
{ id: "mostly-light-brown", label: "Mostly Light Brown", images: [ltMostlyLightBrown1, ltMostlyLightBrown2, ltMostlyLightBrown3, ltMostlyLightBrown4] },
{ id: "mostly-deep-brown", label: "Mostly Deep Brown", images: [ltMostlyDeepBrown1, ltMostlyDeepBrown2, ltMostlyDeepBrown3, ltMostlyDeepBrown4] },
{ id: "mostly-purple", label: "Mostly Purple", images: [ltMostlyPurple1, ltMostlyPurple2, ltMostlyPurple3, ltMostlyPurple4] }] as
const;

// LIPSTICK_LOOKS kept as fallback but recommendations now drive the UI
const LIPSTICK_LOOKS = [
{ id: "nude-rose", label: "Color Study Demi-Satin in Amira", description: "Soft mauve-brown nude with a natural demi-satin finish", color: "#b5837a", variantId: "45733638209689" },
{ id: "deep-terracotta", label: "Color Study Demi-Satin in Amrit", description: "Deep rich terracotta-brick with chocolate undertones", color: "#8b4533", variantId: "45733638340761" },
{ id: "classic-red", label: "Color Study Demi-Satin in Jiya", description: "Timeless, bold red — think Old Hollywood glamour", color: "#b91c1c", variantId: "45733638373529" },
{ id: "coral-sunset", label: "Color Study Demi-Satin in Riya", description: "Warm terracotta-brown matte with a 90s supermodel vibe", color: "#a0522d", variantId: "45733638275225" },
{ id: "berry-wine", label: "Sheer Lipstick Balm in Neha", description: "Deep berry-plum with a luxurious, moody vibe", color: "#7c2d4b", variantId: "45733508546713" }] as
const;

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
  const delta = (to - from + 540) % 360 - 180;
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
    b: Math.round(hueToRgb(hue - 1 / 3) * 255)
  };
};

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ?
  clean.split("").map((c) => `${c}${c}`).join("") :
  clean;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
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
      chroma0 > 6 && (
      r0 >= g0 - 30 || b0 >= g0 - 20 || lightness0 < 96);

      if (inMouthBand && likelyLipTone && !isTeethLike) {
        lipPriorMask[pixelIndex] = 1;
      }
    }
  }

  // Connected components on original-only lip prior (no edited-image geometry is used).
  const visited = new Uint8Array(pixelCount);
  const components: Array<{indices: number[];area: number;cx: number;cy: number;score: number;}> = [];

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
  Math.abs(secondary.cy - primary.cy) < height * 0.18)
  {
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
  look === "classic-red" ?
  0.94 :
  look === "berry-wine" ?
  0.9 :
  0.88;

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
      0.96
    );

    outputData.data[i] = Math.round(r0 + (tinted.r - r0) * blendOpacity);
    outputData.data[i + 1] = Math.round(g0 + (tinted.g - g0) * blendOpacity);
    outputData.data[i + 2] = Math.round(b0 + (tinted.b - b0) * blendOpacity);
    outputData.data[i + 3] = originalData.data[i + 3];
  }

  outputCtx.putImageData(outputData, 0, 0);
  return outputCanvas.toDataURL("image/png");
};

const createDiscountCode = (skinTone: string, lipTone: string) => {
  const skinSlug = skinTone.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const lipSlug = lipTone.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `TEAK-${skinSlug}-${lipSlug}-${randomSuffix}`;
};

const Index = () => {
  const [state, setState] = useState<AppState>("skin-tone");
  const [skinTone, setSkinTone] = useState<string>("");
  const [lipTone, setLipTone] = useState<string>("");
  const [shirt, setShirt] = useState<string>("");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [selectedLook, setSelectedLook] = useState<LookId>("classic-red");
  const [selectedRecIndex, setSelectedRecIndex] = useState<number>(0);
  const [consentChecked, setConsentChecked] = useState(false);
   const [noStoreChecked, setNoStoreChecked] = useState(false);
   
  const [userEmail, setUserEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { trackEvent, sessionId } = useQuizTracking();

  const recommendations = useRecommendations(skinTone, lipTone);
  const recVariantIds = useMemo(() => recommendations.map((r) => r.variantId), [recommendations]);
  const recVariantNames = useMemo(() => recommendations.map((r) => r.variantName), [recommendations]);
  const variantImages = useVariantImages(recVariantIds);
  const { data: shadeSettings } = useShadeSettings(recVariantNames, skinTone, lipTone);
  const selectedRec = recommendations[selectedRecIndex] || recommendations[0];

  const shadeSpecs = useMemo<ShadeSnapshotSpec[]>(
    () =>
      recommendations.flatMap((rec) => {
        const s = shadeSettings?.[rec.variantName];
        return s ? [{ key: rec.variantName, hex: s.hex, finish: s.finish, opacity: s.opacity }] : [];
      }),
    [recommendations, shadeSettings],
  );
  const banubaSnapshots = useBanubaSnapshots(state === "uploaded" ? originalImage : null, shadeSpecs);

  // Track quiz_started once on mount
  useEffect(() => {
    trackEvent("quiz_started", {}, true);
  }, [trackEvent]);

  // Each quiz step should open at the top of the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state]);

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
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setOriginalImage(base64);
      setState("idle");
      trackEvent("selfie_uploaded", {}, true);
    };
    reader.readAsDataURL(file);
  }, []);



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
    setSelectedLook("classic-red");
    setSelectedRecIndex(0);
    setConsentChecked(false);
    setNoStoreChecked(false);
    setUserEmail("");
    setEmailError(false);
    setDiscountCode(null);
  };

  const currentLookLabel = selectedRec?.label ?? LIPSTICK_LOOKS.find((l) => l.id === selectedLook)?.label ?? "";

  return (
    <div className="bg-background flex flex-col">
      {/* Header */}
      <header className="py-10 text-center">
        <button type="button" onClick={reset} aria-label="Restart the quiz" className="mx-auto block cursor-pointer">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}>

            <img src={teakLogo} alt="TEAK" className="h-10 md:h-12 mx-auto" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-foreground font-display text-[18px] leading-[18px] tracking-normal">

            Virtual Lip Studio <sup className="font-sans font-medium text-[9px]">BETA</sup>
          </motion.p>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">
          {state === "skin-tone" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-8">
              <p className="font-display text-[18px] leading-[18px] text-foreground">
                Get personalized shade recommendations and see how our lipsticks might look on you
              </p>
            </motion.div>
          )}
          <AnimatePresence mode="wait">
            {/* Step 1: Skin Tone */}
            {state === "skin-tone" &&
            <motion.div
              key="skin-tone"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-8">
              
                <div className="text-center w-full">
                  <p className="font-display text-[28px] leading-[29px] text-foreground">
                    What's your general skintone?
                  </p>
                  <div className="mt-8 flex flex-col gap-5 w-full max-w-md mx-auto">
                    {SKIN_TONES.map((tone) => {
                      // MOCKUP: 1×4 horizontal strip of sample photos per skin-tone category.
                      const SAMPLES: Record<string, string[]> = {
                        "light-brown": [stSanna, stSaira, stArris, stHareem],
                        "medium-brown": [stTerushka, stNoreen, stTanvi, stAashi],
                        "deep-brown": [stCynthia, stDoe, stNero, stAnastasia],
                        "rich-brown": [stDivya, stAaliyah, stCharithra, stPritt],
                        "full-brown": [stMaseray, stGeeta, stApoorva, stLakshmi],
                      };
                      const samples = SAMPLES[tone.id] ?? [];
                      return (
                        <button
                          key={tone.id}
                          onClick={() => { setSkinTone(tone.id); trackEvent("skin_tone_selected", { skin_tone: tone.id }); setState("lip-tone"); }}
                          className={`group flex flex-col items-center gap-1.5 transition-all duration-200 overflow-hidden ${
                            skinTone === tone.id ? "ring-2 ring-foreground" : ""
                          }`}
                        >
                          {samples.length === 4 ? (
                            <div className="w-full grid grid-cols-4">
                              {samples.map((src, i) => (
                                src ? (
                                  <img
                                    key={i}
                                    src={src}
                                    alt={`${tone.label} sample ${i + 1}`}
                                    className="w-full aspect-[4/5] object-cover"
                                  />
                                ) : (
                                  <div key={i} className="w-full aspect-[4/5] bg-muted" />
                                )
                              ))}
                            </div>
                          ) : 'image' in tone && tone.image ? (
                            <img src={tone.image} alt={tone.label} className="w-full aspect-[4/5] object-cover" />
                          ) : (
                            <div className="w-full aspect-square" style={{ backgroundColor: tone.color }} />
                          )}
                          <span className="font-sans text-[9px] uppercase text-foreground pb-2">{tone.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            }






            {/* Step 2: Lip Tone */}
            {state === "lip-tone" &&
            <motion.div
              key="lip-tone"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-8">
              
                <div className="text-center w-full">
                  <p className="font-display text-[28px] leading-[29px] text-foreground">
                    Take a look in the mirror! What is your current natural lip tone?
                  </p>
                  <p className="font-display text-[12px] leading-[13px] text-foreground mt-3">
                    (Lip shape doesn't matter here.)
                  </p>
                  <div className="mt-6 flex gap-3 justify-center">
                    <Button
                    onClick={() => setState("skin-tone")}
                    size="lg"
                    variant="outline"
                    className="font-sans font-medium text-[9px] uppercase tracking-normal gap-2 rounded-none border-foreground hover:bg-foreground hover:text-background">
                      Back
                    </Button>
                  </div>
                  <div className="mt-8 flex flex-col gap-5 w-full max-w-md mx-auto">
                    {LIP_TONE_ROWS.map((tone) =>
                  <button
                    key={tone.id}
                    onClick={() => { setLipTone(tone.id); trackEvent("lip_tone_selected", { lip_tone: tone.id }); setState("idle"); }}
                    className={`group flex flex-col items-center gap-1.5 transition-all duration-200 overflow-hidden ${
                    lipTone === tone.id ? "ring-2 ring-foreground" : ""}`
                    }>
                        <div className="w-full grid grid-cols-4">
                          {tone.images.map((src, i) =>
                          <img key={i} src={src} alt={`${tone.label} sample ${i + 1}`} className="w-full aspect-[3/2] object-cover" />
                          )}
                        </div>
                        <span className="font-sans text-[9px] uppercase text-foreground pb-2">{tone.label}</span>
                      </button>
                  )}
                  </div>
                </div>
              </motion.div>
            }

            {/* Step 3: Upload */}
            {state === "idle" &&
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}>
              
                {!originalImage ?
              <>
                <h2 className="font-display text-[28px] leading-[29px] text-foreground text-center mb-6">
                  Who would you like to see our recommended lipstick shades on?
                </h2>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative aspect-[4/5] flex cursor-pointer border border-border bg-background text-center transition-colors hover:border-foreground/60">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleInputChange} />
                      <div className="m-auto flex flex-col items-center gap-3 px-3">
                        <Upload className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <div>
                          <p className="font-display text-[18px] leading-[18px] text-foreground">
                            Upload a selfie
                          </p>
                          <p className="mt-1 text-muted-foreground font-sans text-[9px] uppercase">
                            Drag & drop or click
                          </p>
                        </div>
                      </div>
                    </div>
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          setOriginalImage(avatar.url);
                          trackEvent("results_viewed", { skin_tone: skinTone, lip_tone: lipTone, complexion_type: getComplexionType(skinTone, lipTone), skipped_selfie: true, avatar: avatar.id });
                          setState("uploaded");
                        }}
                        className="group relative aspect-[4/5] overflow-hidden"
                      >
                        <img
                          src={avatar.url}
                          alt="Avatar option"
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                  <p className="font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground text-center">
                    <a href="#" className="underline hover:text-foreground transition-colors">Learn More</a>
                    {" \u00B7 "}
                    <a href="https://teakbeauty.com/pages/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Privacy Policy</a>
                  </p>
                </div>
              </> :

              <div className="flex flex-col items-center">
                <div className="w-80 h-80 mx-auto overflow-hidden relative">
                  <img
                    src={originalImage}
                    alt="Your selfie"
                    className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => {setOriginalImage(null);}}
                  className="mt-3 font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground underline hover:text-foreground transition-colors">
                  Retake
                </button>
              </div>
              }

              {originalImage && (
                  <div className="mt-6 max-w-md mx-auto">

                  <div className="border border-foreground p-5">
                    <p className="font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground mb-4">
                      Optional
                    </p>
                    <div className="select-none">
                      <label htmlFor="consent" className="flex items-start gap-4 cursor-pointer group">
                        <Checkbox
                          id="consent"
                          checked={consentChecked}
                          onCheckedChange={(checked) => {
                            setConsentChecked(checked === true);
                            if (checked) setNoStoreChecked(false);
                          }}
                          className="shrink-0 h-4 w-4 mt-1 rounded-none border border-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" />
                        <span className="block">
                          <span className="block font-display text-[18px] leading-[18px] text-foreground tracking-normal">
                            Get 10% Off
                          </span>
                          <span className="mt-2 block font-display text-[12px] leading-[13px] tracking-normal text-foreground">
                            Save my selections and photo to help Teak create better colors and tools for brown skin.
                          </span>
                        </span>
                      </label>
                      <div className="mt-3 ml-8 flex items-center gap-3">
                        <a href="#" className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground underline hover:text-muted-foreground transition-colors">
                          Learn More
                        </a>
                        <a href="https://teakbeauty.com/pages/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground underline hover:text-muted-foreground transition-colors">
                          Privacy Policy
                        </a>
                      </div>
                      <div className="mt-5 ml-8">
                        <input
                          id="user-email"
                          type="email"
                          placeholder="Enter email to receive discount code"
                          value={userEmail}
                          onChange={(e) => { setUserEmail(e.target.value); setEmailError(false); }}
                          className={`w-full px-0 py-2 bg-transparent border-0 border-b ${emailError ? 'border-destructive' : 'border-foreground/20 focus:border-foreground'} text-foreground font-sans font-medium text-[9px] tracking-normal placeholder:text-foreground/30 focus:outline-none transition-colors`} />
                        {emailError && <p className="text-destructive text-[9px] font-sans font-medium tracking-normal mt-2">Please enter your email address to receive your discount code.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom action bar */}
              <div className="mt-8 flex items-center justify-between max-w-md mx-auto w-full">
                <Button
                  onClick={() => { if (originalImage) { setOriginalImage(null); } else { setState("lip-tone"); } }}
                  size="lg"
                  variant="outline"
                  className="font-sans font-medium text-[9px] uppercase tracking-normal gap-2 rounded-none border-foreground hover:bg-foreground hover:text-background">
                  Back
                </Button>

{originalImage && (
                <Button
                  onClick={async () => {
                    const trimmedEmail = userEmail.trim();

                    // If consent is checked but no email, show error and block
                    if (consentChecked && !trimmedEmail) {
                      setEmailError(true);
                      return;
                    }

                    setState("analyzing");

                    // If consent checked and email provided, store image + submission
                    if (consentChecked && trimmedEmail) {
                      // Fire-and-forget: upload image + save submission in the background
                      void (async () => {
                        try {
                          const sourceImage = originalImage!;
                          const img = new Image();
                          img.crossOrigin = "anonymous";
                          await new Promise<void>((resolve, reject) => {
                            img.onload = () => resolve();
                            img.onerror = reject;
                            img.src = sourceImage;
                          });

                          const maxSize = 768;
                          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                          const canvas = document.createElement("canvas");
                          canvas.width = Math.round(img.width * scale);
                          canvas.height = Math.round(img.height * scale);
                          const ctx = canvas.getContext("2d")!;
                          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                          const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7));
                          const imageId = crypto.randomUUID();
                          const fileName = `${imageId}.jpg`;

                          let imageUrl: string | null = null;
                          const { data: uploadData, error: uploadError } = await supabase.storage.from("cart-images").upload(fileName, blob, { contentType: "image/jpeg" });
                          if (uploadError) {
                            console.error("Failed to upload image:", uploadError);
                          } else {
                            imageUrl = uploadData.path;
                          }

                          const { data: submissionId, error: insertError } = await supabase.rpc("insert_customer_submission" as any, {
                            p_variant_id: "consent-upload",
                            p_image_url: imageUrl,
                            p_image_id: imageId,
                            p_skin_tone: skinTone,
                            p_lip_tone: lipTone,
                            p_email: trimmedEmail,
                            p_shirt: shirt || null,
                          });

                          if (!insertError) {
                            if (submissionId) {
                              const c = document.createElement("canvas");
                              c.width = Math.min(img.width, 1024);
                              c.height = Math.round(img.height * (c.width / img.width));
                              const cx = c.getContext("2d")!;
                              cx.drawImage(img, 0, 0, c.width, c.height);
                              const base64 = c.toDataURL("image/jpeg", 0.7);
                              supabase.functions.invoke("categorize-skin-lip", {
                                body: { imageBase64: base64, submissionId }
                              }).catch((err) => console.error("AI categorization failed:", err));
                            }
                          } else {
                            console.error("Failed to save submission:", insertError);
                          }
                        } catch (e) {
                          console.error("Failed to process consent upload:", e);
                        }
                      })();

                    // Save quiz selections when consent is given
                    supabase.rpc("insert_customer_submission" as any, {
                      p_variant_id: "research-selections",
                      p_skin_tone: skinTone,
                      p_lip_tone: lipTone,
                      p_shirt: shirt || null,
                    }).then(({ error }: any) => {
                      if (error) console.error("Failed to save research selections:", error);
                    });

                      // Await discount creation from Shopify — only show code if confirmed
                      try {
                        const edgeFunctionUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-discount`;
                        console.log("[discount] calling:", edgeFunctionUrl);
                        const discountRes = await fetch(edgeFunctionUrl, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                          },
                          body: JSON.stringify({ skinTone, lipTone }),
                        });
                        console.log("[discount] status:", discountRes.status);
                        const discountText = await discountRes.text();
                        console.log("[discount] raw response:", discountText);
                        
                        let discountData;
                        try {
                          discountData = JSON.parse(discountText);
                        } catch (parseErr) {
                          console.error("[discount] JSON parse error:", parseErr);
                        }

                        if (discountRes.ok && discountData?.code) {
                          setDiscountCode(discountData.code);
                          console.log("[discount] code set:", discountData.code);
                        } else {
                          console.error("[discount] generation failed:", discountData);
                        }
                      } catch (discountErr) {
                        console.error("[discount] fetch error:", discountErr);
                      }
                    } else {
                      await new Promise((resolve) => setTimeout(resolve, 2000));
                    }

                    trackEvent("results_viewed", { skin_tone: skinTone, lip_tone: lipTone, complexion_type: getComplexionType(skinTone, lipTone) });
                    setState("uploaded");
                  }}
                  size="lg"
                  variant="outline"
                  className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground/5">
                  
                      Get My Results <ArrowRight className="h-3 w-3" />
                    </Button>
                )}
              </div>
              </motion.div>
            }

            {/* Analyzing */}
            {state === "analyzing" &&
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8 py-16">
              
                {originalImage &&
              <div className="relative w-64 h-64 overflow-hidden">
                    <img src={originalImage} alt="Your photo" className="w-full h-full object-cover" />
                    <motion.div
                      className="absolute inset-0 bg-foreground/5"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
                  </div>
              }
                <div className="flex flex-col items-center gap-3">
                  <motion.p
                    className="text-foreground font-display text-[18px] leading-[18px]"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                    Analyzing your complexion…
                  </motion.p>
                  <p className="text-muted-foreground font-sans font-medium text-[9px] uppercase tracking-normal">
                    This won't take long
                  </p>
                </div>
              </motion.div>
            }

            {/* Step 2: Pick a look */}
            {state === "uploaded" &&
            <motion.div
              key="pick-look"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-8">
              
                <div className="w-full max-w-lg flex flex-col gap-5">
                   {getComplexionType(skinTone, lipTone) !== null && (
                     <h1 className="font-display text-[28px] leading-[29px] text-foreground text-center">
                       You are Complexion {getComplexionType(skinTone, lipTone)}
                     </h1>
                   )}
                   <label className="font-display text-[18px] leading-[18px] text-foreground text-center">
                     The Best Shades For Your Complexion
                   </label>
                  {recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-2">
                    {recommendations.map((rec, i) => {
                      const img = variantImages[rec.variantId];
                      const isSelected = selectedRecIndex === i;
                      const productUrl = img?.productHandle ? `https://nupoora-784.myshopify.com/products/${img.productHandle}?variant=${rec.variantId}&quiz_session_id=${encodeURIComponent(sessionId)}` : "#";
                      const skinImage = img ? getSkinToneImage(skinTone, img.metaImages) : null;
                      const setting = shadeSettings?.[rec.variantName];
                      const userFace = originalImage;
                      const canRenderBanuba = Boolean(setting && userFace);
                      return (
                        <div
                          key={`${rec.category}-${rec.variantName}`}
                          className="group relative flex flex-col items-center gap-2 p-2 rounded-lg w-full"
                        >
                          <span className="font-display text-[18px] leading-[18px] text-foreground text-center">
                            {rec.categoryLabel}
                          </span>
                          <a href={productUrl} target="_blank" rel="noopener noreferrer" className="w-full" onClick={() => trackEvent("product_clicked", { variant_id: rec.variantId, variant_name: rec.variantName, category: rec.categoryLabel, product_handle: img?.productHandle })}>
                            <div className="w-full aspect-[3/4] rounded-md overflow-hidden bg-muted relative">
                              {canRenderBanuba ? (
                                <>
                                  <img
                                    src={userFace!}
                                    alt="Your photo"
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                  {banubaSnapshots[rec.variantName] && (
                                    <img
                                      src={banubaSnapshots[rec.variantName]!}
                                      alt={`${rec.label} on your photo`}
                                      className="absolute inset-0 w-full h-full object-cover"
                                    />
                                  )}
                                </>
                              ) : img?.imageUrl ? (
                                <>
                                  <img
                                    src={shopifyImg(img.imageUrl, 400)}
                                    srcSet={`${shopifyImg(img.imageUrl, 400)} 1x, ${shopifyImg(img.imageUrl, 800)} 2x`}
                                    sizes="(max-width: 640px) 50vw, 240px"
                                    alt={rec.label}
                                    loading={i < 2 ? "eager" : "lazy"}
                                    decoding="async"
                                    width={400}
                                    height={533}
                                    className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
                                  />
                                  {skinImage && (
                                    <img
                                      src={shopifyImg(skinImage.url, 400)}
                                      srcSet={`${shopifyImg(skinImage.url, 400)} 1x, ${shopifyImg(skinImage.url, 800)} 2x`}
                                      sizes="(max-width: 640px) 50vw, 240px"
                                      alt={skinImage.altText || `${rec.label} on skin`}
                                      loading="lazy"
                                      decoding="async"
                                      width={400}
                                      height={533}
                                      className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                    />
                                  )}
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span
                                    className="w-10 h-10 rounded-full"
                                    style={{ backgroundColor: rec.color }}
                                  />
                                </div>
                              )}
                            </div>
                          </a>
                          <a href={productUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 font-display text-[12px] leading-[13px] text-center hover:underline" onClick={() => trackEvent("product_clicked", { variant_id: rec.variantId, variant_name: rec.variantName, category: rec.categoryLabel, product_handle: img?.productHandle })}>
                            <span
                              className="w-3 h-3 rounded-full border border-foreground/20 shrink-0"
                              style={{ backgroundColor: rec.color }}
                              aria-hidden="true"
                            />
                            {rec.variantName}
                          </a>
                          {(img?.productTitle || img?.price) && (
                            <span className="font-display text-[12px] leading-[13px] tracking-normal text-muted-foreground text-center">
                              {img?.productTitle}
                              {img?.productTitle && img?.price && " · "}
                              {img?.price && `$${parseFloat(img.price).toFixed(2)}`}
                            </span>
                          )}
                          <div className="w-full mt-auto flex flex-wrap gap-2">
                            <Button
                              asChild
                              size="sm"
                              className="flex-1 px-2.5 font-sans font-medium text-[9px] uppercase tracking-normal rounded-none bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background"
                            >
                              <a
                                href={productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackEvent("product_clicked", { variant_id: rec.variantId, variant_name: rec.variantName, category: rec.categoryLabel, product_handle: img?.productHandle, source: "view_in_store_button" })}
                              >
                                Shop Now
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 gap-1 px-2 font-sans font-medium text-[9px] uppercase tracking-normal rounded-none bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background"
                              onClick={() => {
                                trackEvent("share_clicked", { variant_id: rec.variantId, variant_name: rec.variantName, category: rec.categoryLabel });
                                void shareLook({
                                  text: `What do you think of ${rec.label} on me?`,
                                  url: productUrl,
                                  imageUrl: banubaSnapshots[rec.variantName],
                                  brand: { logoUrl: teakLogo, shadeName: rec.variantName, productTitle: img?.productTitle ?? rec.label },
                                });
                              }}
                            >
                              <Share2 className="w-2.5 h-2.5" /> Get A Friend's Opinion
                            </Button>
                            <Button
                              size="sm"
                              aria-label={`Download ${rec.label} on your photo`}
                              className="px-2 rounded-none bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background"
                              disabled={!banubaSnapshots[rec.variantName]}
                              onClick={() => {
                                const snap = banubaSnapshots[rec.variantName];
                                if (!snap) return;
                                trackEvent("download_clicked", { variant_id: rec.variantId, variant_name: rec.variantName, category: rec.categoryLabel });
                                void downloadLook({
                                  imageUrl: snap,
                                  filename: `teak-${rec.variantName.toLowerCase()}.jpg`,
                                  brand: { logoUrl: teakLogo, shadeName: rec.variantName, productTitle: img?.productTitle ?? rec.label },
                                });
                              }}
                            >
                              <Download className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  ) : (
                  <p className="text-muted-foreground text-center text-sm">No recommendations available for this combination.</p>
                  )}

                  {originalImage && (
                    <TryOnOtherShades
                      userFace={originalImage!}
                      skinTone={skinTone}
                      lipTone={lipTone}
                      sessionId={sessionId}
                      trackEvent={trackEvent}
                    />
                  )}



                  {discountCode && (
                    <div className="flex gap-3">
                      <div className="flex-1 bg-background border-2 border-foreground p-4 text-center">
                        <p className="font-sans font-medium text-[9px] text-muted-foreground uppercase tracking-normal mb-1">Your 10% off code</p>
                        <div className="flex items-center justify-center gap-2">
                          <p className="font-display text-[18px] leading-[18px] text-primary tracking-normal">{discountCode}</p>
                          <button
                            onClick={() => { navigator.clipboard.writeText(discountCode); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy code"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <p className="font-sans font-medium text-[9px] text-muted-foreground uppercase tracking-normal mt-1">Expires in 7 days · Apply at checkout</p>
                      </div>
                      <div className="flex-1 bg-background border-2 border-foreground p-4 flex items-center justify-center text-center">
                        <p className="font-sans font-medium text-[9px] text-muted-foreground uppercase tracking-normal">Free U.S. Standard Shipping for Any 2+ Lipsticks</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center pt-2">
                    <Button onClick={() => {setOriginalImage(null);setState("idle");}} size="lg" variant="outline" className="font-sans font-medium text-[9px] uppercase tracking-normal gap-2 rounded-none border-foreground hover:bg-foreground hover:text-background">
                      Back
                    </Button>
                  </div>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </main>
    </div>);

};

export default Index;