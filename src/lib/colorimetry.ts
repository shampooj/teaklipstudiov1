// Client-side colorimetry for consent uploads: landmark-anchored CIELAB
// samples of skin (cheeks, forehead, jawline) and lips, derived ITA, Monk
// Skin Tone, undertone, and lip-to-skin contrast, plus the capture metadata
// and normalization parameters (EXIF, gray-world illuminant estimate,
// exposure stats) that make measurements comparable across photos. Phone
// cameras bake in auto white balance and tone mapping, so these are estimates
// — which is why as-shot AND normalized values are both stored, with the
// gains that connect them.
import { supabase } from "@/integrations/supabase/client";
import { getLandmarker } from "@/lib/lipCrop";

interface Lab {
  L: number;
  a: number;
  b: number;
}

interface RegionSample {
  as_shot_lab: Lab;
  normalized_lab: Lab;
  sample_px: number;
}

export interface ColorimetryResult {
  ita_deg: number;
  ita_band: string;
  monk_tone: number;
  undertone: string;
  lip_skin_delta_e: number | null;
  measurements: Record<string, unknown>;
}

// Landmark anchors per region (MediaPipe 468-point face mesh).
const SKIN_REGIONS: Record<string, number[]> = {
  forehead: [10, 108, 151, 337],
  left_cheek: [50, 205, 187],
  right_cheek: [280, 425, 411],
  jawline: [172, 397, 152],
};
// Vermilion mid-points, avoiding mouth corners and the inner gap.
const LIP_POINTS = [0, 13, 14, 17];

// Google's published Monk Skin Tone orb swatches (sRGB), 1..10.
const MONK_HEX = [
  "#f6ede4", "#f3e7db", "#f7ead0", "#eadaba", "#d7bd96",
  "#a07e56", "#825c43", "#604134", "#3a312a", "#292420",
];

const srgbToLinear = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

// Linear sRGB -> XYZ (D65), then XYZ -> CIELAB (D65 reference white).
const linearRgbToLab = (r: number, g: number, b: number): Lab => {
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) * 100;
  const Y = (0.2126729 * r + 0.7151522 * g + 0.072175 * b) * 100;
  const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) * 100;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X / 95.047);
  const fy = f(Y / 100);
  const fz = f(Z / 108.883);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
};

const hexToLab = (hex: string): Lab => {
  const n = parseInt(hex.slice(1), 16);
  return linearRgbToLab(
    srgbToLinear((n >> 16) & 255),
    srgbToLinear((n >> 8) & 255),
    srgbToLinear(n & 255),
  );
};

const deltaE76 = (x: Lab, y: Lab): number =>
  Math.sqrt((x.L - y.L) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2);

// CIEDE2000 (Sharma et al. reference implementation).
const deltaE2000 = (lab1: Lab, lab2: Lab): number => {
  const rad = Math.PI / 180;
  const C1 = Math.sqrt(lab1.a ** 2 + lab1.b ** 2);
  const C2 = Math.sqrt(lab2.a ** 2 + lab2.b ** 2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = lab1.a * (1 + G);
  const a2p = lab2.a * (1 + G);
  const C1p = Math.sqrt(a1p ** 2 + lab1.b ** 2);
  const C2p = Math.sqrt(a2p ** 2 + lab2.b ** 2);
  const h1p = C1p === 0 ? 0 : ((Math.atan2(lab1.b, a1p) / rad) + 360) % 360;
  const h2p = C2p === 0 ? 0 : ((Math.atan2(lab2.b, a2p) / rad) + 360) % 360;
  const dLp = lab2.L - lab1.L;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbarp = (lab1.L + lab2.L) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbarp += h1p + h2p < 360 ? 360 : -360;
    hbarp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbarp - 30) * rad) +
    0.24 * Math.cos(2 * hbarp * rad) +
    0.32 * Math.cos((3 * hbarp + 6) * rad) -
    0.2 * Math.cos((4 * hbarp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;
  return Math.sqrt(
    (dLp / SL) ** 2 +
      (dCp / SC) ** 2 +
      (dHp / SH) ** 2 +
      RT * (dCp / SC) * (dHp / SH),
  );
};

// ITA = arctan((L* - 50) / b*), degrees; standard dermatological bands.
const itaOf = (lab: Lab): number => (Math.atan2(lab.L - 50, lab.b) * 180) / Math.PI;
const itaBand = (ita: number): string =>
  ita > 55 ? "very_light"
  : ita > 41 ? "light"
  : ita > 28 ? "intermediate"
  : ita > 10 ? "tan"
  : ita > -30 ? "brown"
  : "dark";

// v1 heuristic, deliberately simple and documented: undertone from the Lab
// hue angle of normalized skin. Olive = weak red with sustained yellow.
const undertoneOf = (lab: Lab): string => {
  const hue = ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360;
  if (lab.a < 8 && lab.b > 18) return "olive";
  if (hue >= 55) return "warm";
  if (hue < 40) return "cool";
  return "neutral";
};

const monkToneOf = (lab: Lab): number => {
  let best = 1;
  let bestD = Infinity;
  MONK_HEX.forEach((hex, i) => {
    const d = deltaE76(lab, hexToLab(hex));
    if (d < bestD) {
      bestD = d;
      best = i + 1;
    }
  });
  return best;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

interface LinearPixel {
  r: number;
  g: number;
  b: number;
}

// Median linear-RGB of the pooled pixels, with the brightest/darkest 5%
// dropped (specular highlights, shadow), then to Lab — optionally through
// gray-world gains first.
const robustLab = (pixels: LinearPixel[], gains?: LinearPixel): Lab | null => {
  if (pixels.length < 12) return null;
  const withLum = pixels.map((p) => ({ ...p, y: 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b }));
  withLum.sort((x, y) => x.y - y.y);
  const lo = Math.floor(withLum.length * 0.05);
  const hi = Math.ceil(withLum.length * 0.95);
  const kept = withLum.slice(lo, hi);
  const median = (vals: number[]) => {
    vals.sort((x, y) => x - y);
    return vals[Math.floor(vals.length / 2)];
  };
  let r = median(kept.map((p) => p.r));
  let g = median(kept.map((p) => p.g));
  let b = median(kept.map((p) => p.b));
  if (gains) {
    r = Math.min(1, r * gains.r);
    g = Math.min(1, g * gains.g);
    b = Math.min(1, b * gains.b);
  }
  return linearRgbToLab(r, g, b);
};

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
const roundLab = (lab: Lab): Lab => ({ L: round(lab.L), a: round(lab.a), b: round(lab.b) });

export async function measureImageColorimetry(
  imageDataUrl: string,
): Promise<ColorimetryResult | null> {
  const [landmarker, img] = await Promise.all([getLandmarker(), loadImage(imageDataUrl)]);

  // Work at a bounded size; landmarks are normalized so scale is irrelevant.
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);

  const result = landmarker.detect(canvas);
  const landmarks = result.faceLandmarks[0];
  if (!landmarks) return null;

  const data = ctx.getImageData(0, 0, w, h).data;
  const linearAt = (x: number, y: number): LinearPixel => {
    const i = (y * w + x) * 4;
    return {
      r: srgbToLinear(data[i]),
      g: srgbToLinear(data[i + 1]),
      b: srgbToLinear(data[i + 2]),
    };
  };

  // Gray-world illuminant estimate over a decimated whole image.
  let sumR = 0, sumG = 0, sumB = 0, n = 0;
  let clippedHi = 0, deepShadow = 0;
  const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 40000)));
  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      const i = (y * w + x) * 4;
      const R = data[i], G = data[i + 1], B = data[i + 2];
      if (R >= 250 || G >= 250 || B >= 250) clippedHi++;
      if (R <= 5 && G <= 5 && B <= 5) deepShadow++;
      const p = linearAt(x, y);
      sumR += p.r; sumG += p.g; sumB += p.b; n++;
    }
  }
  const meanR = sumR / n, meanG = sumG / n, meanB = sumB / n;
  const meanGray = (meanR + meanG + meanB) / 3;
  const gains: LinearPixel = {
    r: meanGray / Math.max(meanR, 1e-6),
    g: meanGray / Math.max(meanG, 1e-6),
    b: meanGray / Math.max(meanB, 1e-6),
  };
  // Estimated illuminant chromaticity + CCT (McCamy) from the image means.
  const X = 0.4124564 * meanR + 0.3575761 * meanG + 0.1804375 * meanB;
  const Y = 0.2126729 * meanR + 0.7151522 * meanG + 0.072175 * meanB;
  const Z = 0.0193339 * meanR + 0.119192 * meanG + 0.9503041 * meanB;
  const cx = X / (X + Y + Z);
  const cy = Y / (X + Y + Z);
  const nn = (cx - 0.332) / (0.1858 - cy);
  const cct = 449 * nn ** 3 + 3525 * nn ** 2 + 6823.3 * nn + 5520.33;

  // Landmark-anchored patch sampling.
  const faceXs = landmarks.map((p) => p.x * w);
  const faceW = Math.max(...faceXs) - Math.min(...faceXs);
  const radius = Math.max(3, Math.round(faceW * 0.02));
  const samplePatches = (indices: number[]): LinearPixel[] => {
    const px: LinearPixel[] = [];
    for (const idx of indices) {
      const lm = landmarks[idx];
      if (!lm) continue;
      const cxp = Math.round(lm.x * w);
      const cyp = Math.round(lm.y * h);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cxp + dx;
          const y = cyp + dy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          px.push(linearAt(x, y));
        }
      }
    }
    return px;
  };

  const regions: Record<string, RegionSample> = {};
  const skinPixels: LinearPixel[] = [];
  for (const [name, indices] of Object.entries(SKIN_REGIONS)) {
    const px = samplePatches(indices);
    const asShot = robustLab(px);
    const normalized = robustLab(px, gains);
    if (asShot && normalized) {
      regions[name] = { as_shot_lab: roundLab(asShot), normalized_lab: roundLab(normalized), sample_px: px.length };
      skinPixels.push(...px);
    }
  }
  const lipPx = samplePatches(LIP_POINTS);
  const lipAsShot = robustLab(lipPx);
  const lipNormalized = robustLab(lipPx, gains);
  if (lipAsShot && lipNormalized) {
    regions.lips = { as_shot_lab: roundLab(lipAsShot), normalized_lab: roundLab(lipNormalized), sample_px: lipPx.length };
  }

  const skinAsShot = robustLab(skinPixels);
  const skinNormalized = robustLab(skinPixels, gains);
  if (!skinAsShot || !skinNormalized) return null;

  // Headline metrics use AS-SHOT Lab: phone cameras already auto-white-
  // balance, and gray-world over-corrects portraits (the face dominates the
  // frame mean, so "average is gray" cancels the very skin color being
  // measured). The gray-world variant is stored alongside as reference.
  const ita = itaOf(skinAsShot);
  const undertone = undertoneOf(skinAsShot);
  const monk = monkToneOf(skinAsShot);
  const contrast = lipAsShot
    ? {
        delta_e2000: round(deltaE2000(skinAsShot, lipAsShot)),
        delta_e76: round(deltaE76(skinAsShot, lipAsShot)),
        dL: round(lipAsShot.L - skinAsShot.L),
        da: round(lipAsShot.a - skinAsShot.a),
        db: round(lipAsShot.b - skinAsShot.b),
      }
    : null;

  // EXIF from the original bytes (the data URL preserves them verbatim).
  let exif: Record<string, unknown> | null = null;
  try {
    const exifr = (await import("exifr")).default;
    const blob = await (await fetch(imageDataUrl)).blob();
    const parsed = await exifr.parse(blob, [
      "Make", "Model", "Software", "LensModel", "DateTimeOriginal",
      "ExposureTime", "ISO", "FNumber", "WhiteBalance", "LightSource",
      "Flash", "BrightnessValue", "ExposureBiasValue",
    ]);
    if (parsed) {
      exif = Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
      );
    }
  } catch {
    exif = null;
  }

  return {
    ita_deg: round(ita),
    ita_band: itaBand(ita),
    monk_tone: monk,
    undertone,
    lip_skin_delta_e: contrast?.delta_e2000 ?? null,
    measurements: {
      version: 1,
      regions,
      skin: {
        as_shot_lab: roundLab(skinAsShot),
        normalized_lab: roundLab(skinNormalized),
        ita_deg: round(ita),
        ita_band: itaBand(ita),
        monk_tone: monk,
        undertone,
        hue_angle_deg: round(((Math.atan2(skinAsShot.b, skinAsShot.a) * 180) / Math.PI + 360) % 360),
      },
      lip_skin_contrast: contrast,
      normalization: {
        method: "gray_world_to_neutral",
        gains_linear: { r: round(gains.r, 4), g: round(gains.g, 4), b: round(gains.b, 4) },
        note: "Headline metrics (ITA, Monk, undertone, contrast) use as_shot_lab: phone AWB is already applied and gray-world over-corrects face-dominated frames. normalized_lab = as-shot linear RGB scaled by gains_linear, stored for reference/re-analysis.",
      },
      illuminant_estimate: {
        chromaticity_xy: { x: round(cx, 4), y: round(cy, 4) },
        cct_kelvin: Number.isFinite(cct) ? Math.round(cct) : null,
      },
      exposure: {
        mean_luminance_linear: round(Y, 4),
        clipped_highlight_pct: round((clippedHi / n) * 100),
        deep_shadow_pct: round((deepShadow / n) * 100),
      },
      capture: {
        exif,
        user_agent: navigator.userAgent,
        image: { width: img.naturalWidth, height: img.naturalHeight },
      },
    },
  };
}

// Fire-and-forget: measure and store, never blocking or breaking the upload.
export async function recordImageColorimetry(
  submissionId: string,
  imageDataUrl: string,
): Promise<void> {
  try {
    const result = await measureImageColorimetry(imageDataUrl);
    if (!result) return;
    const { error } = await (supabase.from as any)("image_colorimetry").insert({
      submission_id: submissionId,
      ...result,
    });
    if (error) console.error("Failed to store colorimetry:", error);
  } catch (e) {
    console.error("Colorimetry measurement failed:", e);
  }
}
