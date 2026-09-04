import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Share2 } from "lucide-react";
import { Upload, Download, RotateCcw, ArrowRight, ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getComplexionType, Recommendation, PRODUCT_DETAILS, VARIANT_MAP } from "@/data/lipstickRecommendations";
import { shareLook, downloadLook } from "@/lib/shareLook";
import { isEmbedded, requestCartAdd } from "@/lib/cartAdd";
import { isMobileDevice } from "@/lib/device";
import LearnMoreDialog from "@/components/LearnMoreDialog";
import { useRecommendations, useRecommendationRows } from "@/hooks/useRecommendations";
import { useShadeSettings } from "@/hooks/useShadeSettings";
import { useBanubaSnapshots } from "@/hooks/useBanubaSnapshots";
import type { ShadeSnapshotSpec } from "@/lib/banubaSnapshots";
import TryOnOtherShades from "@/components/TryOnOtherShades";
import { useQuizTracking } from "@/hooks/useQuizTracking";
import { useDisplayedQuizModels } from "@/hooks/useQuizModels";
import { useEmbedAutoHeight, postEmbedScrollTop } from "@/hooks/useEmbedAutoHeight";
import { recordImageColorimetry } from "@/lib/colorimetry";
import teakLogo from "@/assets/teak-logo.png";
import { SKIN_TONES, LIP_TONE_ROWS } from "@/data/toneOptions";
import nero from "@/assets/nero.jpg";
import cynthia from "@/assets/cynthia.jpg";
import anastasia from "@/assets/anastasia.jpg";
import maseray from "@/assets/maseray.jpg";
import sanna from "@/assets/sanna.jpg";
import hareem from "@/assets/hareem.png";
import noreen from "@/assets/noreen.jpg";
import arris from "@/assets/arris.jpg";
import stSanna from "@/assets/skin_tone/web/skin_tone_sanna.jpg";
import stTerushka from "@/assets/skin_tone/web/skin_tone_terushka.jpg";
import stTanvi from "@/assets/skin_tone/web/skin_tone_tanvi.jpg";
import stAashi from "@/assets/skin_tone/web/skin_tone_aashi.jpg";
import stCynthia from "@/assets/skin_tone/web/skin_tone_cynthia.jpg";
import stAnastasia from "@/assets/skin_tone/web/skin_tone_anastasia.jpg";
import stNero from "@/assets/skin_tone/web/skin_tone_nero.jpg";
import stMaseray from "@/assets/skin_tone/web/skin_tone_maseray.jpg";
import stAaliyah from "@/assets/skin_tone/web/skin_tone_aaliyah.jpg";
import stDivya from "@/assets/skin_tone/web/skin_tone_divya.jpg";
import stGeeta from "@/assets/skin_tone/web/skin_tone_geeta.jpg";
import stApoorva from "@/assets/skin_tone/web/skin_tone_apoorva.jpg";
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

type AppState = "landing" | "skin-tone" | "lip-tone" | "idle" | "analyzing" | "uploaded";

const ALL_VARIANT_NAMES = Object.keys(VARIANT_MAP);

const SHIRT_OPTIONS = [
  { id: "Pure White", label: "Pure White", color: "#FFFFFF" },
  { id: "Cream", label: "Off White", color: "#FAF7F0" },
  { id: "I'm not sure", label: "I'm not sure", color: null as string | null },
] as const;



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

// The optional research consent is only offered for selfies taken on a mobile
// device moments before upload: the camera path is fresh by construction, and
// library picks qualify when the file's lastModified is within this window.
const FRESH_CAPTURE_WINDOW_MS = 5 * 60 * 1000;

const Index = () => {
  const [state, setState] = useState<AppState>("landing");
  const [skinTone, setSkinTone] = useState<string>("");
  const [lipTone, setLipTone] = useState<string>("");
  const [shirt, setShirt] = useState<string>("");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [selectedLook, setSelectedLook] = useState<LookId>("classic-red");
  const [consentChecked, setConsentChecked] = useState(false);
   const [noStoreChecked, setNoStoreChecked] = useState(false);
   
  const [userEmail, setUserEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [discountEmail, setDiscountEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mobile = useMemo(isMobileDevice, []);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [freshMobileCapture, setFreshMobileCapture] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [cartStates, setCartStates] = useState<Record<string, "adding" | "added" | "error">>({});
  const embedded = useMemo(isEmbedded, []);

  const { trackEvent, sessionId } = useQuizTracking();

  const addToCart = useCallback(async (variantId: string, variantName: string, source: string) => {
    setCartStates((prev) => ({ ...prev, [variantId]: "adding" }));
    // Track intent immediately so the funnel works even if the parent cart write fails
    trackEvent("add_to_cart", { variant_id: variantId, variant_name: variantName, source });
    const success = await requestCartAdd(variantId, sessionId);
    if (!success) {
      trackEvent("add_to_cart_failed", { variant_id: variantId, variant_name: variantName, source, reason: "no_response_or_error" });
    }
    setCartStates((prev) => ({ ...prev, [variantId]: success ? "added" : "error" }));
  }, [trackEvent, sessionId]);

  // When a model avatar is chosen, its admin-labeled tones drive the results
  // (recommendations, Banuba settings, complexion number) instead of the
  // quiz-taker's own selections — the face on screen matches the shades shown.
  const [modelTones, setModelTones] = useState<{ skin: string; lip: string } | null>(null);
  const effectiveSkinTone = modelTones?.skin ?? skinTone;
  const effectiveLipTone = modelTones?.lip ?? lipTone;
  const { data: quizModels } = useDisplayedQuizModels();

  // Admin-curated model roster; falls back to the built-in set (which carries
  // no tone labels, so results follow the quiz-taker's own selections) until
  // models are configured in /admin.
  const avatarOptions = useMemo(
    () =>
      quizModels && quizModels.length > 0
        ? quizModels.map((m) => ({ id: m.id, url: m.url, skin: m.skin_tone, lip: m.lip_tone }))
        : AVATAR_OPTIONS.map((a) => ({ id: a.id, url: a.url as string, skin: null as string | null, lip: null as string | null })),
    [quizModels],
  );

  const recommendations = useRecommendations(effectiveSkinTone, effectiveLipTone);
  // Same query key as the unified try-on card, so its data is warm at reveal.
  const { data: shadeSettings } = useShadeSettings(ALL_VARIANT_NAMES, effectiveSkinTone, effectiveLipTone);

  const shadeSpecs = useMemo<ShadeSnapshotSpec[]>(
    () => {
      if (!shadeSettings) return [];
      // Must mirror the unified card's tuned-or-fallback settings exactly so
      // these preloads are cache hits when the card renders.
      return recommendations.map((rec) => {
        const s = shadeSettings[rec.variantName];
        if (s) return { key: rec.variantName, hex: s.hex, finish: s.finish, opacity: s.opacity, gloss: s.gloss };
        const details = PRODUCT_DETAILS[rec.variantName];
        return { key: rec.variantName, hex: details?.color ?? "#000000", finish: "satin", opacity: 0.8, gloss: 0 };
      });
    },
    [recommendations, shadeSettings],
  );
  // Snapshots start rendering during the "Gathering…" screen so the results
  // page can appear with every card image already in place.
  const banubaSnapshots = useBanubaSnapshots(
    state === "analyzing" || state === "uploaded" ? originalImage : null,
    shadeSpecs,
  );

  const { isLoading: recsLoading } = useRecommendationRows();
  const resultsReady =
    !recsLoading &&
    shadeSettings !== undefined &&
    (recommendations.length === 0 ||
      shadeSpecs.every((s) => banubaSnapshots[s.key] !== undefined));

  // Hold the "Gathering…" screen until every card image is settled, with a
  // safety cap so a stuck loader can't trap the user there.
  useEffect(() => {
    if (state !== "analyzing" || !analysisDone) return;
    if (resultsReady) {
      setState("uploaded");
      setAnalysisDone(false);
      return;
    }
    const t = window.setTimeout(() => {
      setState("uploaded");
      setAnalysisDone(false);
    }, 30_000);
    return () => window.clearTimeout(t);
  }, [state, analysisDone, resultsReady]);

  // Track quiz_started once on mount
  useEffect(() => {
    trackEvent("quiz_started", {}, true);
  }, [trackEvent]);

  // Warm the NEXT step's images while the user reads the current one, so the
  // tone pages appear fully rendered instead of trickling in on mobile. The
  // short delay lets the current page's own images claim bandwidth first.
  const prefetchedUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls: string[] =
      state === "landing"
        ? SKIN_TONES.flatMap((t) => [...t.samples])
        : state === "skin-tone"
        ? LIP_TONE_ROWS.flatMap((t) => [...t.images])
        : state === "lip-tone"
        ? avatarOptions.map((a) => a.url)
        : [];
    const timer = window.setTimeout(() => {
      for (const url of urls) {
        if (prefetchedUrls.current.has(url)) continue;
        prefetchedUrls.current.add(url);
        const img = new Image();
        img.src = url;
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state, avatarOptions]);

  // Framed on the storefront: report content height so the theme sizes the
  // iframe to fit and all scrolling happens on the parent page.
  useEmbedAutoHeight(embedded);

  // Each quiz step should open at the top of the page. Embedded, the inner
  // page has no scroll position — ask the parent to scroll to the iframe top.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (embedded) postEmbedScrollTop();
  }, [state, embedded]);

  // Selfies require the biometric consent checkbox before results (face
  // mapping only runs on the results screen); stock avatars skip the review
  // page entirely and carry no user biometrics.
  const handleFile = useCallback((file: File, source: "camera" | "library") => {
    // Some mobile camera captures arrive with an empty MIME type — treat
    // typeless files as images rather than rejecting the capture.
    if (file.type && !file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image must be under 15MB");
      return;
    }
    // The camera path is fresh by construction (capture="user" opens the
    // camera directly); library picks fall back to the timestamp heuristic.
    const takenJustNow =
      source === "camera" ||
      (isMobileDevice() && Date.now() - file.lastModified <= FRESH_CAPTURE_WINDOW_MS);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setOriginalImage(base64);
      // A selfie is the quiz-taker's own face — results follow their selections
      setModelTones(null);
      setFreshMobileCapture(takenJustNow);
      // Every new photo starts with fresh, unchecked consents
      setBiometricChecked(false);
      setConsentChecked(false);
      setNoStoreChecked(false);
      setState("idle");
      trackEvent("selfie_uploaded", { fresh_mobile_capture: takenJustNow, source }, true);
    };
    reader.onerror = () => {
      toast.error("Couldn't read that photo — please try again");
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, [trackEvent]);



  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file, "library");
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file, "library");
    },
    [handleFile]
  );

  const handleCameraChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file, "camera");
    },
    [handleFile]
  );

  const reset = () => {
    setState("landing");
    setSkinTone("");
    setLipTone("");
    setOriginalImage(null);
    setSelectedLook("classic-red");
    setConsentChecked(false);
    setNoStoreChecked(false);
    setBiometricChecked(false);
    setFreshMobileCapture(false);
    setModelTones(null);
    setAnalysisDone(false);
    setUserEmail("");
    setEmailError(false);
    setDiscountEmail(null);
  };


  return (
    <div className="bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-10 pb-16">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Landing */}
            {state === "landing" &&
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-8 text-center">

              <div>
                <h1 className="font-display text-[28px] leading-[29px] text-foreground">
                  The Virtual Lip Studio
                </h1>
                <p className="mt-4 font-display text-[18px] leading-[22px] text-foreground max-w-lg mx-auto">
                  In just 3 questions, discover our top lip color recs for your unique brown skin tone and lip tone. Use our Virtual Try On, custom built for brown skin, to see how they might look on.
                </p>
              </div>
              <div className="w-full max-w-lg grid grid-cols-3">
                {[tanvi, nero, cynthia].map((src, i) => (
                  <img key={i} src={src} alt="" className="w-full aspect-[3/4] object-cover" />
                ))}
              </div>
              <Button
                onClick={() => { trackEvent("take_quiz_clicked"); setState("skin-tone"); }}
                size="lg"
                variant="outline"
                className="font-sans font-medium text-[9px] uppercase h-8 tracking-normal gap-2 rounded-full border-foreground hover:bg-foreground hover:text-background">
                Let's Go <ArrowRight className="h-3 w-3" />
              </Button>
            </motion.div>
            }

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
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => { setSkinTone(tone.id); trackEvent("skin_tone_selected", { skin_tone: tone.id }); setState("lip-tone"); }}
                        className={`group flex flex-col items-center gap-1.5 transition-all duration-200 overflow-hidden ${
                          skinTone === tone.id ? "ring-2 ring-foreground" : ""
                        }`}
                      >
                        <div className="w-full grid grid-cols-4">
                          {tone.samples.map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt={`${tone.label} sample ${i + 1}`}
                              className="w-full aspect-[4/5] object-cover"
                            />
                          ))}
                        </div>
                        <span className="font-sans text-[9px] uppercase text-foreground pb-2">{tone.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-8 flex gap-3 justify-center">
                    <Button
                    onClick={() => setState("landing")}
                    size="lg"
                    variant="outline"
                    className="font-sans font-medium text-[9px] uppercase h-8 tracking-normal gap-2 rounded-full border-foreground hover:bg-foreground hover:text-background">
                      Back
                    </Button>
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
                  <p className="font-display text-[18px] leading-[18px] text-foreground">
                    Take a look in the mirror!
                  </p>
                  <p className="mt-3 font-display text-[28px] leading-[29px] text-foreground">
                    What is your current natural lip tone?
                  </p>
                  <p className="font-display text-[12px] leading-[15px] text-foreground mt-3 max-w-md mx-auto">
                    (Tip: Turn your device brightness up. Feel free to ignore lip shape and focus on the natural colors in your lip skin.)
                  </p>
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
                  <div className="mt-8 flex gap-3 justify-center">
                    <Button
                    onClick={() => setState("skin-tone")}
                    size="lg"
                    variant="outline"
                    className="font-sans font-medium text-[9px] uppercase h-8 tracking-normal gap-2 rounded-full border-foreground hover:bg-foreground hover:text-background">
                      Back
                    </Button>
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
                    {/* Camera tile (mobile only): capture="user" opens the front
                        camera directly, so this path is fresh by construction. */}
                    {mobile && (
                      <div
                        onClick={() => cameraInputRef.current?.click()}
                        className="group relative aspect-[4/5] flex cursor-pointer border border-foreground bg-background text-center transition-colors hover:border-foreground/60">
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="user"
                          className="hidden"
                          onChange={handleCameraChange} />
                        <div className="m-auto flex flex-col items-center gap-2.5 px-4 py-4">
                          <Camera className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                          <div>
                            <p className="font-display text-[18px] leading-[18px] text-foreground">
                              Myself!
                            </p>
                            <p className="mt-2 font-display text-[12px] leading-[16px] text-foreground">
                              Take a selfie now!
                            </p>
                            <p className="mt-1 font-display text-[12px] leading-[16px] text-foreground">
                              Opens your camera — best in front of a window
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative aspect-[4/5] flex cursor-pointer border border-border bg-background text-center transition-colors hover:border-foreground/60">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        // On iOS, `multiple` skips the Photo Library / Take
                        // Photo / Choose File sheet and opens the Photo Library
                        // directly (the camera has its own tile). Only the
                        // first selected file is used. Desktop keeps the
                        // normal single-select dialog.
                        multiple={mobile}
                        className="hidden"
                        onChange={handleInputChange} />
                      <div className="m-auto flex flex-col items-center gap-2.5 px-4 py-4">
                        <Upload className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <div>
                          <p className="font-display text-[18px] leading-[18px] text-foreground">
                            Myself!
                          </p>
                          {mobile && (
                            <p className="mt-2 font-display text-[12px] leading-[16px] text-foreground">
                              Upload a pic
                            </p>
                          )}
                          <p className={`${mobile ? "mt-1" : "mt-2"} font-display text-[12px] leading-[16px] text-foreground`}>
                            {mobile
                              ? "Choose one from your photos"
                              : "Upload a selfie, preferably taken in front of a window"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {avatarOptions.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          const tones = avatar.skin && avatar.lip ? { skin: avatar.skin, lip: avatar.lip } : null;
                          setModelTones(tones);
                          const effSkin = tones?.skin ?? skinTone;
                          const effLip = tones?.lip ?? lipTone;
                          setOriginalImage(avatar.url);
                          trackEvent("results_viewed", { skin_tone: effSkin, lip_tone: effLip, user_skin_tone: skinTone, user_lip_tone: lipTone, complexion_type: getComplexionType(effSkin, effLip), skipped_selfie: true, avatar: avatar.id });
                          setState("analyzing");
                          setAnalysisDone(true);
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
                    <button type="button" onClick={() => setLearnMoreOpen(true)} className="underline hover:text-foreground transition-colors uppercase">Learn More</button>
                    {" \u00B7 "}
                    <a href="https://teakbeauty.com/pages/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Privacy Policy</a>
                  </p>
                </div>
              </> :

              <div className="flex flex-col items-center">
                <div className="w-80 aspect-[3/4] mx-auto overflow-hidden relative">
                  <img
                    src={originalImage}
                    alt="Your selfie"
                    className="w-full h-full object-cover" />
                </div>
                <div className="mt-3 flex items-center justify-center gap-4">
                  <button
                    onClick={() => {setOriginalImage(null); setBiometricChecked(false);}}
                    className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground underline hover:text-muted-foreground transition-colors">
                    Retake
                  </button>
                  <button
                    onClick={() => {setOriginalImage(null); setBiometricChecked(false);}}
                    className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground underline hover:text-muted-foreground transition-colors">
                    Use A Model Instead
                  </button>
                </div>
              </div>
              }

              {originalImage && (
                  <div className="mt-6 max-w-md mx-auto">

                  <div className="border border-foreground p-5">
                    <label htmlFor="biometric-consent" className="flex items-start gap-4 cursor-pointer select-none">
                      <Checkbox
                        id="biometric-consent"
                        checked={biometricChecked}
                        onCheckedChange={(checked) => setBiometricChecked(checked === true)}
                        className="shrink-0 h-4 w-4 mt-1 rounded-none border border-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" />
                      <span className="block">
                        <span className="block font-display text-[18px] leading-[18px] text-foreground tracking-normal">
                          Great, let's use this pic!
                        </span>
                        <span className="mt-2 block font-display text-[12px] leading-[15px] tracking-normal text-foreground">
                          I understand my photo will be scanned for facial features (like lip outline) on my device to create the lipstick previews.
                        </span>
                      </span>
                    </label>

                    {/* The research opt-in is only offered for selfies taken on a
                        mobile device just now — camera-roll uploads and desktop
                        files only get the on-device try-on. */}
                    {freshMobileCapture && (
                    <>
                    <p className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground mb-4 mt-6 pt-6 border-t border-foreground/20">
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
                            Add my pic to{" "}
                            <a
                              href="https://teakbeauty.com/pages/the-brown-skin-archive"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-muted-foreground transition-colors"
                              // New tab + no propagation: following the link must
                              // neither toggle the consent checkbox nor lose the
                              // quiz-taker's progress.
                              onClick={(e) => e.stopPropagation()}
                            >
                              The Brown Skin Archive
                            </a>
                          </span>
                          <span className="mt-2 block font-display text-[12px] leading-[15px] tracking-normal text-foreground">
                            Teak can save my photo, quiz selections, and email to help create better products for brown skin, and use AI to analyze my skin tone (which might suggest ethnicity).
                          </span>
                        </span>
                      </label>
                      <div className="mt-5 ml-8">
                        {/* The placeholder overlay centers against this wrapper,
                            so it must contain ONLY the input — text below it
                            would pull the overlay out of the field. */}
                        <div className="relative">
                          <input
                            id="user-email"
                            type="email"
                            aria-label="Enter email for 10% off as a thank you!"
                            value={userEmail}
                            onChange={(e) => { setUserEmail(e.target.value); setEmailError(false); }}
                            className={`w-full px-0 py-2 bg-transparent border-0 border-b ${emailError ? 'border-destructive' : 'border-foreground/20 focus:border-foreground'} text-foreground font-sans font-medium text-[12px] tracking-normal focus:outline-none transition-colors`} />
                          {!userEmail && (
                            <span aria-hidden="true" className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none font-sans font-medium text-[12px] tracking-normal text-foreground/50 truncate w-full text-left">
                              Enter email for <span className="text-green-700">10% off</span> as a thank you!
                            </span>
                          )}
                        </div>
                        {emailError && <p className="text-destructive text-[9px] font-sans font-medium tracking-normal mt-2">Please enter your email address to receive your discount code.</p>}
                        <p className="font-display text-[12px] leading-[15px] text-muted-foreground mt-2">
                          Double-check your email! It's where your code lands, and how we find your pic if you ever ask us to delete it.
                        </p>
                      </div>
                    </div>
                    </>
                    )}
                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button type="button" onClick={() => setLearnMoreOpen(true)} className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground underline hover:text-muted-foreground transition-colors">
                          Learn More
                        </button>
                        <a href="https://teakbeauty.com/pages/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground underline hover:text-muted-foreground transition-colors">
                          Privacy Policy
                        </a>
                      </div>
                  </div>
                </div>
              )}

              {/* Bottom action bar */}
              <div className={`mt-8 flex items-center ${originalImage ? "justify-between" : "justify-center"} max-w-md mx-auto w-full`}>
                <Button
                  onClick={() => { if (originalImage) { setOriginalImage(null); } else { setState("lip-tone"); } }}
                  size="lg"
                  variant="outline"
                  className="font-sans font-medium text-[9px] uppercase h-8 tracking-normal gap-2 rounded-full border-foreground hover:bg-foreground hover:text-background">
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

                          // Store the original file bytes untouched — research
                          // wants full resolution, so no downscaling here. (The
                          // AI categorization payload below is still resized to
                          // keep the edge-function request small.)
                          const blob = await (await fetch(sourceImage)).blob();
                          const contentType = blob.type || "image/jpeg";
                          const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
                          const imageId = crypto.randomUUID();
                          const fileName = `${imageId}.${ext === "jpeg" ? "jpg" : ext}`;

                          let imageUrl: string | null = null;
                          const { data: uploadData, error: uploadError } = await supabase.storage.from("cart-images").upload(fileName, blob, { contentType });
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
                              void recordImageColorimetry(submissionId, sourceImage);
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

                      // The code is emailed via Klaviyo rather than shown
                      // on-screen — a real address gets the reward, a mistyped
                      // one silently doesn't.
                      setDiscountEmail(trimmedEmail);
                      supabase.functions
                        .invoke("send-discount-email", {
                          body: { email: trimmedEmail, skinTone, lipTone, source: "quiz" },
                        })
                        .then(({ error }) => {
                          if (error) console.error("[discount] email dispatch failed:", error);
                        });
                    } else {
                      await new Promise((resolve) => setTimeout(resolve, 2000));
                    }

                    trackEvent("results_viewed", { skin_tone: effectiveSkinTone, lip_tone: effectiveLipTone, complexion_type: getComplexionType(effectiveSkinTone, effectiveLipTone) });
                    setAnalysisDone(true);
                  }}
                  size="lg"
                  variant="outline"
                  disabled={!biometricChecked}
                  className="font-sans font-medium text-[9px] uppercase h-8 tracking-normal gap-2 rounded-full border-foreground hover:bg-foreground hover:text-background">
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
                    Gathering our lipstick recommendations for you…
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
                  {originalImage && (
                    <TryOnOtherShades
                      userFace={originalImage!}
                      skinTone={effectiveSkinTone}
                      lipTone={effectiveLipTone}
                      sessionId={sessionId}
                      trackEvent={trackEvent}
                      embedded={embedded}
                      cartStates={cartStates}
                      addToCart={addToCart}
                      recommendations={recommendations}
                      complexionType={getComplexionType(effectiveSkinTone, effectiveLipTone)}
                    />
                  )}



                  {discountEmail && (
                    // Stacked full-width on mobile; equal halves from sm up
                    // (min-w-0 stops the long email from stealing width).
                    <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
                      <div className="flex-1 min-w-0 bg-background border-2 border-foreground p-4 text-center flex flex-col items-center justify-center">
                        <p className="font-sans font-medium text-[9px] text-muted-foreground uppercase tracking-normal mb-1">Your 10% off code</p>
                        <p className="font-display text-[18px] leading-[22px] text-foreground tracking-normal break-words w-full">
                          On its way to <span className="text-green-700">{discountEmail}</span>
                        </p>
                        <p className="font-sans font-medium text-[9px] text-muted-foreground uppercase tracking-normal mt-1">Give it a few minutes · Check spam if it's hiding</p>
                      </div>
                      <div className="flex-1 min-w-0 bg-background border-2 border-foreground p-4 flex items-center justify-center text-center">
                        <p className="font-sans font-medium text-[9px] text-muted-foreground uppercase tracking-normal">Free U.S. Standard Shipping for Any 2+ Lipsticks</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center pt-2">
                    <Button onClick={() => {setOriginalImage(null);setState("idle");}} size="lg" variant="outline" className="font-sans font-medium text-[9px] uppercase h-8 tracking-normal gap-2 rounded-full border-foreground hover:bg-foreground hover:text-background">
                      Back
                    </Button>
                  </div>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </main>

      <LearnMoreDialog open={learnMoreOpen} onOpenChange={setLearnMoreOpen} />
    </div>);

};

export default Index;