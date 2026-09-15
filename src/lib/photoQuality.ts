// Photo quality verdict for the try-on: the one pure function the upload
// gate (and later the guided viewfinder) share, so a photo one approves the
// other never rejects. Takes numbers, returns numbers; no camera, no SDK,
// no React. Four checks for now: face found, face size, centering, and
// overall brightness. Pose and left/right light balance come later, once
// real-traffic numbers say which one matters.
//
// THRESHOLDS are initial values from typical selfie framing. Calibrate them
// against the curated model photos (/dev/photo-check in a dev build) and
// against the photo_quality_check events once the gate is live.

export interface FaceBox {
  /** Pixels in the frame's coordinate space. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LightStats {
  /** Mean sRGB luminance of the face region, 0..1. */
  meanLuma: number;
  /** Share of face pixels at or near white (blown highlights), 0..100. */
  clippedPct: number;
  /** Share of face pixels near black (lost shadow), 0..100. */
  darkPct: number;
}

export interface QualityInput {
  frameW: number;
  frameH: number;
  face: FaceBox | null;
  /** Whether every lip landmark sits inside the frame. Null when unknown. */
  lipsInFrame: boolean | null;
  light: LightStats | null;
  /** Quiz skin tone id, which picks the brightness band. Null = default band. */
  skinTone?: string | null;
}

export type QualityReason =
  | "no_face"
  | "lips_cut_off"
  | "too_small"
  | "too_large"
  | "off_center"
  | "too_dark"
  | "too_bright";

export interface QualityMetrics {
  /** Face box height as a fraction of frame height (0..1), null without a face. */
  faceHeight: number | null;
  /** Face centre offset from frame centre, as a fraction of frame width/height. */
  offsetX: number | null;
  offsetY: number | null;
  meanLuma: number | null;
  clippedPct: number | null;
  darkPct: number | null;
}

export interface QualityResult {
  pass: boolean;
  /** The single worst problem, or null on pass. */
  reason: QualityReason | null;
  /** Plain guidance for the reason, empty on pass. */
  message: string;
  metrics: QualityMetrics;
}

export const THRESHOLDS = {
  /** Face box height / frame height. Below: too few lip pixels for the mask. */
  faceHeightMin: 0.22,
  /** Above: the face is closer than any selfie needs. A tight crop is fine
   *  as long as the lips are fully in frame (checked separately). */
  faceHeightMax: 0.9,
  /** |face centre - frame centre| / frame width (or height). */
  centerMaxOffsetX: 0.22,
  centerMaxOffsetY: 0.25,
  /** Mean face luminance, sRGB 0..1, when the skin tone is unknown. */
  lumaMin: 0.2,
  lumaMax: 0.85,
  /** Blown highlights on the face, % of pixels. */
  clippedMaxPct: 6,
  /** Lost shadow on the face, % of pixels. */
  darkMaxPct: 40,
} as const;

// Brightness band per quiz skin tone: a well-lit deep complexion reads
// darker on the sensor than a well-lit light one, so one band can't serve
// both. Falls back to THRESHOLDS.lumaMin/Max for an unknown tone.
export const LUMA_BANDS: Record<string, { min: number; max: number }> = {
  "light-brown": { min: 0.38, max: 0.88 },
  "medium-brown": { min: 0.32, max: 0.82 },
  "deep-brown": { min: 0.26, max: 0.75 },
  "rich-brown": { min: 0.2, max: 0.68 },
  "full-brown": { min: 0.16, max: 0.62 },
};

export const lumaBandFor = (skinTone: string | null | undefined, t = THRESHOLDS) =>
  (skinTone && LUMA_BANDS[skinTone]) || { min: t.lumaMin, max: t.lumaMax };

export const QUALITY_MESSAGES: Record<QualityReason, string> = {
  no_face: "We couldn't find a face. Try a photo taken from the front.",
  lips_cut_off: "Make sure your whole mouth is in the shot.",
  too_small: "Move closer so your face fills more of the frame.",
  too_large: "Back up a little so your whole face is in the shot.",
  off_center: "Center your face in the frame.",
  too_dark: "Find more light. Facing a window works best.",
  too_bright: "That's a lot of light. Step back from the window or turn off the flash.",
};

const round = (n: number, dp = 3) => Math.round(n * 10 ** dp) / 10 ** dp;

export function assessPhotoQuality(input: QualityInput, t = THRESHOLDS): QualityResult {
  const { frameW, frameH, face, lipsInFrame, light, skinTone } = input;
  const band = lumaBandFor(skinTone, t);
  const metrics: QualityMetrics = {
    faceHeight: null,
    offsetX: null,
    offsetY: null,
    meanLuma: light ? round(light.meanLuma) : null,
    clippedPct: light ? round(light.clippedPct, 1) : null,
    darkPct: light ? round(light.darkPct, 1) : null,
  };

  const fail = (reason: QualityReason): QualityResult => ({
    pass: false,
    reason,
    message: QUALITY_MESSAGES[reason],
    metrics,
  });

  if (!face || face.w <= 0 || face.h <= 0 || frameW <= 0 || frameH <= 0) return fail("no_face");
  if (lipsInFrame === false) return fail("lips_cut_off");

  metrics.faceHeight = round(face.h / frameH);
  metrics.offsetX = round((face.x + face.w / 2 - frameW / 2) / frameW);
  metrics.offsetY = round((face.y + face.h / 2 - frameH / 2) / frameH);

  // Order matters: each check assumes the earlier ones passed, and the first
  // failure is the one the visitor is told about.
  if (metrics.faceHeight < t.faceHeightMin) return fail("too_small");
  if (metrics.faceHeight > t.faceHeightMax) return fail("too_large");
  if (Math.abs(metrics.offsetX) > t.centerMaxOffsetX || Math.abs(metrics.offsetY) > t.centerMaxOffsetY) {
    return fail("off_center");
  }
  if (light) {
    if (light.meanLuma < band.min || light.darkPct > t.darkMaxPct) return fail("too_dark");
    if (light.meanLuma > band.max || light.clippedPct > t.clippedMaxPct) return fail("too_bright");
  }

  return { pass: true, reason: null, message: "", metrics };
}
