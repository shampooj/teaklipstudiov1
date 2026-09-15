// Browser side of the photo quality gate: finds the face with MediaPipe's
// landmarker (already used by the archive flow, on-device, loaded once per
// session), measures the light on the face from a canvas, and hands the
// numbers to assessPhotoQuality. Never throws: if the landmarker can't load
// (offline, CDN blocked) or takes too long, the verdict is a "skipped" pass
// so a tooling hiccup never blocks a quiz-taker.
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { getLandmarker } from "@/lib/lipCrop";
import { assessPhotoQuality, type FaceBox, type LightStats, type QualityResult } from "@/lib/photoQuality";

export interface PhotoCheckOutcome extends QualityResult {
  /** true when the check could not run and the pass is a fallback. */
  skipped: boolean;
  /** milliseconds spent, for the event log */
  durationMs: number;
}

const CHECK_TIMEOUT_MS = 12_000;
// Downscale before sampling: the light stats don't need full resolution and
// a 12MP selfie would make getImageData slow on a phone.
const SAMPLE_MAX_DIM = 512;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

const LIP_INDICES = (() => {
  const indices = new Set<number>();
  for (const { start, end } of FaceLandmarker.FACE_LANDMARKS_LIPS) {
    indices.add(start);
    indices.add(end);
  }
  return [...indices];
})();

/** True when every lip landmark lies inside the image (normalised 0..1). */
function lipsInsideFrame(landmarks: { x: number; y: number }[]): boolean | null {
  if (!landmarks.length) return null;
  for (const i of LIP_INDICES) {
    const p = landmarks[i];
    if (!p) continue;
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return false;
  }
  return true;
}

/** Bounding box of every landmark, in image pixels. */
function faceBoxFromLandmarks(landmarks: { x: number; y: number }[], w: number, h: number): FaceBox | null {
  if (!landmarks.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of landmarks) {
    minX = Math.min(minX, p.x * w);
    maxX = Math.max(maxX, p.x * w);
    minY = Math.min(minY, p.y * h);
    maxY = Math.max(maxY, p.y * h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Mean luminance and clipping inside the face box, sampled from a downscaled draw. */
export function measureFaceLight(img: HTMLImageElement, face: FaceBox): LightStats | null {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(1, SAMPLE_MAX_DIM / Math.max(iw, ih));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(iw * scale));
  canvas.height = Math.max(1, Math.round(ih * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Inset the box slightly so hair and background at the edges don't count.
  const inset = 0.08;
  const x0 = Math.max(0, Math.round((face.x + face.w * inset) * scale));
  const y0 = Math.max(0, Math.round((face.y + face.h * inset) * scale));
  const x1 = Math.min(canvas.width, Math.round((face.x + face.w * (1 - inset)) * scale));
  const y1 = Math.min(canvas.height, Math.round((face.y + face.h * (1 - inset)) * scale));
  const rw = x1 - x0, rh = y1 - y0;
  if (rw <= 0 || rh <= 0) return null;

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(x0, y0, rw, rh).data;
  } catch {
    return null; // tainted canvas (cross-origin image); light check skipped
  }
  let sum = 0, clipped = 0, dark = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    sum += luma;
    if (r >= 250 || g >= 250 || b >= 250) clipped++;
    if (luma < 0.06) dark++;
  }
  return { meanLuma: sum / n, clippedPct: (clipped / n) * 100, darkPct: (dark / n) * 100 };
}

const skipped = (durationMs: number): PhotoCheckOutcome => ({
  pass: true,
  reason: null,
  message: "",
  metrics: { faceHeight: null, offsetX: null, offsetY: null, meanLuma: null, clippedPct: null, darkPct: null },
  skipped: true,
  durationMs,
});

export interface PhotoCheckOptions {
  /** Quiz skin tone id; selects the brightness band. */
  skinTone?: string | null;
}

export async function checkPhotoQuality(imageSrc: string, opts: PhotoCheckOptions = {}): Promise<PhotoCheckOutcome> {
  const started = performance.now();
  try {
    const work = (async () => {
      const [landmarker, img] = await Promise.all([getLandmarker(), loadImage(imageSrc)]);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const result = landmarker.detect(img);
      const landmarks = result.faceLandmarks[0] ?? [];
      const face = faceBoxFromLandmarks(landmarks, w, h);
      const lipsInFrame = lipsInsideFrame(landmarks);
      const light = face ? measureFaceLight(img, face) : null;
      return assessPhotoQuality({ frameW: w, frameH: h, face, lipsInFrame, light, skinTone: opts.skinTone ?? null });
    })();
    const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), CHECK_TIMEOUT_MS));
    const verdict = await Promise.race([work, timeout]);
    const durationMs = Math.round(performance.now() - started);
    if (!verdict) return skipped(durationMs);
    return { ...verdict, skipped: false, durationMs };
  } catch {
    return skipped(Math.round(performance.now() - started));
  }
}
