import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useVariantImages, getSkinToneImage } from "@/hooks/useVariantImages";
import { shopifyImg } from "@/lib/shopifyImg";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { Upload, Download, RotateCcw, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getComplexionType, Recommendation, PRODUCT_DETAILS, VARIANT_MAP } from "@/data/lipstickRecommendations";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useShadeSettings } from "@/hooks/useShadeSettings";
import BanubaProductPreview from "@/components/BanubaProductPreview";
import TryOnOtherShades from "@/components/TryOnOtherShades";
import { useQuizTracking } from "@/hooks/useQuizTracking";
import teakLogo from "@/assets/teak-logo.png";
import skinLightBrown from "@/assets/skin-light-brown.jpg";
import skinMediumBrown from "@/assets/skin-medium-brown.jpg";
import skinDeepBrown from "@/assets/skin-deep-brown.jpg";
import skinRichBrown from "@/assets/skin-rich-brown.jpg";
import lipBeige from "@/assets/lip-beige.webp";
import lipBrightPink from "@/assets/lip-bright-pink.webp";
import lipMediumBrownAsset from "@/assets/lip-two-toned-deep-brown.png.asset.json";
const lipMediumBrown = lipMediumBrownAsset.url;
import lipDeepBrown from "@/assets/lip-deep-brown.webp";
import lipTwoTonedPurple from "@/assets/lip-two-toned-purple.webp";
import lipNeutralBrownAsset from "@/assets/lip-brick-v2.png.asset.json";
const lipNeutralBrown = lipNeutralBrownAsset.url;
import lipTwoTonedGrey from "@/assets/lip-two-toned-grey.webp";
import lipMauvePink from "@/assets/lip-mauve-pink.webp";
import lipTwoTonedBrownAsset from "@/assets/lip-two-toned-brown.png.asset.json";
const lipTwoTonedBrown = lipTwoTonedBrownAsset.url;
import lipTwoTonedBeigeAsset from "@/assets/lip-two-toned-beige.png.asset.json";
const lipTwoTonedBeige = lipTwoTonedBeigeAsset.url;
import lipBrownPink from "@/assets/lip-brown-pink.webp";
import lipGreyBrownAsset from "@/assets/lip-mostly-purple.png.asset.json";
const lipGreyBrown = lipGreyBrownAsset.url;
import avatar3Asset from "@/assets/avatar-3.jpg.asset.json";
import avatar4Asset from "@/assets/avatar-4.jpg.asset.json";
import avatar5Asset from "@/assets/avatar-5.jpg.asset.json";
import avatar6Asset from "@/assets/avatar-6.jpg.asset.json";
import avatarSkinLightAsset from "@/assets/avatar-skin-light-brown.jpg.asset.json";
import avatarSkinMediumAsset from "@/assets/avatar-skin-medium-brown.jpg.asset.json";
import avatarSkinDeepAsset from "@/assets/avatar-skin-deep-brown.jpg.asset.json";
import avatarSkinRichAsset from "@/assets/avatar-skin-rich-brown.jpg.asset.json";
import avatarNupooraAsset from "@/assets/avatar-nupoora.jpg.asset.json";
import avatarMauveModelAsset from "@/assets/avatar-mauve-model.png.asset.json";

const AVATAR_OPTIONS = [
  { id: "avatar-3", url: avatar3Asset.url },
  { id: "avatar-4", url: avatar4Asset.url },
  { id: "avatar-5", url: avatar5Asset.url },
  { id: "avatar-6", url: avatar6Asset.url },
  { id: "skin-light-brown", url: avatarSkinLightAsset.url },
  { id: "skin-medium-brown", url: avatarSkinMediumAsset.url },
  { id: "avatar-nupoora", url: avatarNupooraAsset.url },
  { id: "avatar-mauve-model", url: avatarMauveModelAsset.url },
  { id: "skin-rich-brown", url: avatarSkinRichAsset.url },
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
{ id: "rich-brown", label: "Rich Brown", color: "#3B1E08", image: skinRichBrown }] as
const;

const LIP_TONES = [
{ id: "bright-pink", label: "Bright Pink", color: "#E8577E", image: lipBrightPink },
{ id: "beige", label: "Beige", color: "#D4A98C", image: lipBeige },
{ id: "mauve-pink", label: "Mauve", color: "#B5838D", image: lipMauvePink },
{ id: "neutral-brown", label: "Chestnut", color: "#A0705A", image: lipNeutralBrown },
{ id: "two-toned-grey", label: "Two-Toned Grey", color: "#9A8B8B", image: lipTwoTonedGrey },
{ id: "two-toned-purple", label: "Two-Toned Purple", color: "#7A3B5E", image: lipTwoTonedPurple },
{ id: "two-toned-brown", label: "Two-Toned Brown", color: "#8B5E3C", image: lipTwoTonedBrown },
{ id: "medium-brown", label: "Two-toned Deep Brown", color: "#7A5240", image: lipMediumBrown },
{ id: "deep-brown", label: "Mostly Brown", color: "#4A2228", image: lipDeepBrown }] as
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
  const [skinTone, setSkinTone] = useState<string>("medium-brown");
  const [lipTone, setLipTone] = useState<string>("neutral-brown");
  const [shirt, setShirt] = useState<string>("");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [faceCropImage, setFaceCropImage] = useState<string | null>(null);
  const [croppingFace, setCroppingFace] = useState(false);
  const [selectedLook, setSelectedLook] = useState<LookId>("classic-red");
  const [selectedRecIndex, setSelectedRecIndex] = useState<number>(0);
  const [consentChecked, setConsentChecked] = useState(false);
   const [noStoreChecked, setNoStoreChecked] = useState(false);
   
  const [userEmail, setUserEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [cartStates, setCartStates] = useState<Record<string, "adding" | "added" | "error">>({});
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { trackEvent, sessionId } = useQuizTracking();

  const recommendations = useRecommendations(skinTone, lipTone);
  const recVariantIds = useMemo(() => recommendations.map((r) => r.variantId), [recommendations]);
  const recVariantNames = useMemo(() => recommendations.map((r) => r.variantName), [recommendations]);
  const variantImages = useVariantImages(recVariantIds);
  const { data: shadeSettings } = useShadeSettings(recVariantNames, skinTone, lipTone);
  const selectedRec = recommendations[selectedRecIndex] || recommendations[0];

  // Track quiz_started once on mount
  useEffect(() => {
    trackEvent("quiz_started", {}, true);
  }, [trackEvent]);

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
      
      // Detect and crop face
      setCroppingFace(true);
      try {
        const resized = await downscaleImage(base64, 512);
        const { data, error } = await supabase.functions.invoke("detect-face-region", {
          body: { imageBase64: resized }
        });
        if (!error && data && data.top !== undefined) {
          const cropped = await cropImage(base64, data);
          setFaceCropImage(cropped);
        }
      } catch (err) {
        console.error("Face crop failed, showing original:", err);
      } finally {
        setCroppingFace(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const downscaleImage = (base64: string, maxSize = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        if (scale >= 1) {resolve(base64);return;}
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = base64;
    });
  };

  const cropImage = (base64: string, region: { top: number; bottom: number; left: number; right: number }): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const sx = Math.round(region.left * img.width);
        const sy = Math.round(region.top * img.height);
        const sw = Math.round((region.right - region.left) * img.width);
        const sh = Math.round((region.bottom - region.top) * img.height);
        const canvas = document.createElement("canvas");
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = base64;
    });
  };


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
    setFaceCropImage(null);
    setSelectedLook("classic-red");
    setSelectedRecIndex(0);
  };

  const currentLookLabel = selectedRec?.label ?? LIPSTICK_LOOKS.find((l) => l.id === selectedLook)?.label ?? "";

  return (
    <div className="bg-background flex flex-col">
      {/* Header */}
      <header className="py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}>
          
          <img src={teakLogo} alt="TEAK" className="h-10 md:h-12 mx-auto" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-foreground font-display text-lg tracking-wide">
          
          Virtual Lip Studio <sup className="font-sans text-[10px]">BETA</sup>
        </motion.p>
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
              <p className="font-display text-xl md:text-2xl text-foreground leading-snug">
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
                  <p className="font-display text-xl text-foreground">
                    What's your general skintone?
                  </p>
                  <p className="text-sm text-foreground mt-2 font-display">
                    If you're in between, go with the deeper shade.
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm mx-auto">
                    {SKIN_TONES.map((tone) =>
                  <button
                    key={tone.id}
                    onClick={() => setSkinTone(tone.id)}
                    className={`group flex flex-col items-center gap-1.5 transition-all duration-200 overflow-hidden ${
                    skinTone === tone.id ? "ring-2 ring-foreground" : ""}`
                    }>
                    
                        {'image' in tone && tone.image ?
                    <img
                      src={tone.image}
                      alt={tone.label}
                      className="w-full aspect-square object-cover" /> :


                    <div
                      className="w-full aspect-square"
                      style={{ backgroundColor: tone.color }} />

                    }
                        <span className="font-sans text-[9px] uppercase text-foreground pb-2">{tone.label}</span>
                      </button>
                  )}
                   </div>
                  <div className="mt-8">
                    <Button
                    onClick={() => { trackEvent("skin_tone_selected", { skin_tone: skinTone }); setState("lip-tone"); }}
                    disabled={!skinTone}
                    size="lg"
                    className="bg-foreground text-background hover:bg-foreground/85 font-sans text-[9px] uppercase gap-2 px-8">
                    
                      Next
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
                  <p className="font-display text-xl text-foreground">
                    Choose your closest lip tone category
                  </p>
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
                    {LIP_TONES.map((tone) =>
                  <button
                    key={tone.id}
                    onClick={() => setLipTone(tone.id)}
                    className={`group flex flex-col items-center gap-1.5 transition-all duration-200 overflow-hidden ${
                    lipTone === tone.id ? "ring-2 ring-foreground" : ""}`
                    }>
                    
                        {'image' in tone && tone.image ?
                    <img src={tone.image} alt={tone.label} className="w-full aspect-square object-cover" /> :

                    <div
                      className="w-full aspect-square"
                      style={{ backgroundColor: tone.color }} />

                    }
                        <span className="font-sans text-[9px] uppercase text-foreground pb-2">{tone.label}</span>
                      </button>
                  )}
                  </div>
                  <div className="mt-8 flex gap-3 justify-center">
                    <Button
                    onClick={() => setState("skin-tone")}
                    size="lg"
                    variant="outline"
                    className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground/5">
                    
                      Back
                    </Button>
                    <Button
                    onClick={() => { trackEvent("lip_tone_selected", { lip_tone: lipTone }); setState("idle"); }}
                    disabled={!lipTone}
                    size="lg"
                    className="bg-foreground text-background hover:bg-foreground/85 font-sans text-[9px] uppercase gap-2 px-8">
                    
                      Next
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
                <h2 className="font-display text-xl md:text-2xl text-foreground text-center leading-snug mb-6">
                  Try our recommended lipstick shades on
                </h2>
                <div className="flex flex-col gap-4 md:gap-6">
                  <div className="flex flex-col border border-border bg-background transition-all duration-300 hover:border-foreground/40">
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative flex flex-1 cursor-pointer p-8 sm:p-10 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleInputChange} />
                      <div className="m-auto flex flex-col items-center gap-6">
                        <Upload className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <div>
                          <p className="font-display text-xl text-foreground">
                            Upload a selfie
                          </p>
                          <p className="mt-2 text-muted-foreground font-sans text-[9px] uppercase">
                            Drag & drop or click to upload
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-4 text-center">
                      <p className="text-xs text-muted-foreground font-sans">
                        <a href="#" className="underline hover:text-foreground transition-colors">Learn More</a>
                        {" \u00B7 "}
                        <a href="https://teakbeauty.com/pages/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Privacy Policy</a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <span className="font-display text-lg text-muted-foreground uppercase tracking-widest">or</span>
                  </div>

                  <div className="border border-border bg-background p-6 sm:p-8">
                    <p className="font-display text-xl text-foreground text-center">
                      Choose an avatar
                    </p>
                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {AVATAR_OPTIONS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => {
                            setOriginalImage(avatar.url);
                            setFaceCropImage(avatar.url);
                            trackEvent("results_viewed", { skin_tone: skinTone, lip_tone: lipTone, complexion_type: getComplexionType(skinTone, lipTone), skipped_selfie: true, avatar: avatar.id });
                            setState("uploaded");
                          }}
                          className="group relative aspect-[4/5] overflow-hidden border border-border hover:border-foreground/60 transition-colors"
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
                  </div>

                </div>
              </> :

              <div className="flex flex-col items-center">
                <div className="w-80 h-80 mx-auto overflow-hidden relative">
                  {croppingFace && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                      <motion.p className="text-foreground font-display text-sm" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>Detecting face…</motion.p>
                    </div>
                  )}
                  <img
                    src={faceCropImage || originalImage}
                    alt="Your selfie"
                    className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => {setOriginalImage(null); setFaceCropImage(null);}}
                  className="mt-3 font-sans text-[9px] uppercase text-muted-foreground underline hover:text-foreground transition-colors tracking-wider">
                  Retake
                </button>
              </div>
              }

              {faceCropImage && (
                  <div className="mt-6 max-w-md mx-auto">

                  <div className="border-t border-foreground/10 pt-6">
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
                        <span className="block font-display text-[15px] text-foreground leading-snug">
                          Save my selections and photo to help AI work better for brown skin and get a 10% off discount code in return
                        </span>
                      </label>
                      <div className="mt-5 ml-8">
                        <input
                          id="user-email"
                          type="email"
                          placeholder="you@example.com"
                          value={userEmail}
                          onChange={(e) => { setUserEmail(e.target.value); setEmailError(false); }}
                          className={`w-full px-0 py-2 bg-transparent border-0 border-b ${emailError ? 'border-destructive' : 'border-foreground/20 focus:border-foreground'} text-foreground text-sm font-sans placeholder:text-foreground/30 focus:outline-none transition-colors`} />
                        {emailError && <p className="text-destructive text-[10px] font-sans mt-2">Please enter your email address to receive your discount code.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom action bar */}
              <div className="mt-8 flex items-center justify-between max-w-md mx-auto w-full">
                <Button
                  onClick={() => setState("lip-tone")}
                  size="lg"
                  variant="ghost"
                  className="font-sans text-[9px] uppercase gap-2 text-muted-foreground hover:text-foreground hover:bg-transparent">
                  <ArrowLeft className="h-3 w-3" /> Go Back
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
                          const sourceImage = faceCropImage || originalImage!;
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
                    <img src={faceCropImage || originalImage} alt="Your photo" className="w-full h-full object-cover" />
                    <motion.div
                      className="absolute inset-0 bg-foreground/5"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
                  </div>
              }
                <div className="flex flex-col items-center gap-3">
                  <motion.p
                    className="text-foreground font-display text-lg"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                    Analyzing your complexion…
                  </motion.p>
                  <p className="text-muted-foreground font-sans text-[10px] uppercase">
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
                   <label className="font-display text-lg text-foreground text-center">
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
                      const userFace = faceCropImage || originalImage;
                      const canRenderBanuba = Boolean(setting && userFace);
                      return (
                        <div
                          key={`${rec.category}-${rec.variantName}`}
                          className="group relative flex flex-col items-center gap-2 p-2 rounded-lg w-full"
                        >
                          <span className="font-sans text-[10px] text-foreground uppercase tracking-wider">
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
                                  <div className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0">
                                    <BanubaProductPreview
                                      imageUrl={userFace!}
                                      hex={setting!.hex}
                                      finish={setting!.finish}
                                      opacity={setting!.opacity}
                                      alt={`${rec.label} on your photo`}
                                    />
                                  </div>
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
                          <a href={productUrl} target="_blank" rel="noopener noreferrer" className="font-display text-xs leading-tight text-center hover:underline" onClick={() => trackEvent("product_clicked", { variant_id: rec.variantId, variant_name: rec.variantName, category: rec.categoryLabel, product_handle: img?.productHandle })}>
                            {rec.variantName}
                          </a>
                          {img?.productTitle && (
                            <span className="font-sans text-[10px] text-muted-foreground text-center leading-tight">{img.productTitle}</span>
                          )}
                          {img?.price && (
                            <span className="font-sans text-[10px] text-foreground">${parseFloat(img.price).toFixed(2)}</span>
                          )}
                          <Button
                            size="sm"
                            className={`w-full mt-auto font-sans text-[8px] uppercase tracking-wider transition-all duration-300 rounded-full ${
                              cartStates[rec.variantId] === "added"
                                ? "bg-green-700 text-white hover:bg-green-700 border border-green-700"
                                : cartStates[rec.variantId] === "error"
                                ? "bg-red-700 text-white hover:bg-red-700 border border-red-700"
                                : "bg-background text-foreground border-2 border-foreground hover:bg-foreground hover:text-background"
                            }`}
                            disabled={cartStates[rec.variantId] === "adding" || cartStates[rec.variantId] === "added"}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setCartStates((prev) => ({ ...prev, [rec.variantId]: "adding" }));
                              // Track intent immediately so funnel works even if parent cart write fails (e.g. incognito)
                              trackEvent("add_to_cart", { variant_id: rec.variantId, variant_name: rec.variantName, category: rec.categoryLabel });
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
                                  variantId: parseInt(rec.variantId),
                                  quantity: 1,
                                  quizSessionId: sessionId
                                }, "*");
                                const success = await cartPromise;
                                if (!success) {
                                  trackEvent("add_to_cart_failed", { variant_id: rec.variantId, variant_name: rec.variantName, category: rec.categoryLabel, reason: "no_response_or_error" });
                                }
                                setCartStates((prev) => ({ ...prev, [rec.variantId]: success ? "added" : "error" }));
                              } catch (err) {
                                trackEvent("add_to_cart_failed", { variant_id: rec.variantId, variant_name: rec.variantName, category: rec.categoryLabel, reason: "exception" });
                                setCartStates((prev) => ({ ...prev, [rec.variantId]: "error" }));
                              }
                            }}
                          >
                            {cartStates[rec.variantId] === "adding" ? (
                              <><span className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> Adding…</>
                            ) : cartStates[rec.variantId] === "added" ? (
                              <><Check className="w-2.5 h-2.5" /> Added</>
                            ) : cartStates[rec.variantId] === "error" ? (
                              <>Failed</>
                            ) : (
                              <>Add to Cart</>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  ) : (
                  <p className="text-muted-foreground text-center text-sm">No recommendations available for this combination.</p>
                  )}

                  {(faceCropImage || originalImage) && (
                    <TryOnOtherShades
                      userFace={(faceCropImage || originalImage)!}
                      skinTone={skinTone}
                      lipTone={lipTone}
                    />
                  )}



                  {discountCode && (
                    <div className="flex gap-3">
                      <div className="flex-1 bg-background border-2 border-foreground p-4 text-center">
                        <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider mb-1">Your 10% off code</p>
                        <div className="flex items-center justify-center gap-2">
                          <p className="font-display text-lg text-primary tracking-wide">{discountCode}</p>
                          <button
                            onClick={() => { navigator.clipboard.writeText(discountCode); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy code"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <p className="font-sans text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Expires in 7 days · Apply at checkout</p>
                      </div>
                      <div className="flex-1 bg-background border-2 border-foreground p-4 flex items-center justify-center text-center">
                        <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">Free U.S. Standard Shipping for Any 2+ Lipsticks</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center pt-2">
                    <Button onClick={() => {setOriginalImage(null);setFaceCropImage(null);setState("idle");}} size="lg" variant="outline" className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground hover:text-background">
                      Go Back
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