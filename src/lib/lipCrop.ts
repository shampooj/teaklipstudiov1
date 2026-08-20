// Lip-crop detection for the admin dashboard: MediaPipe's face landmarker
// finds the lip landmarks in a submission photo and we cut a 3:2 crop around
// them — the same aspect the Brown Skin Archive grid displays.
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Pixel rect in the original image's natural coordinates.
export interface LipCropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LipCropResult {
  dataUrl: string;
  box: LipCropBox;
}

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

const getLandmarker = (): Promise<FaceLandmarker> => {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
      );
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        runningMode: "IMAGE",
        numFaces: 1,
      });
    })();
    // A failed init (offline, CDN blocked) shouldn't poison later retries.
    landmarkerPromise.catch(() => {
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
};

const LIP_INDICES = (() => {
  const indices = new Set<number>();
  for (const { start, end } of FaceLandmarker.FACE_LANDMARKS_LIPS) {
    indices.add(start);
    indices.add(end);
  }
  return [...indices];
})();

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

// Returns null when no face (and so no lips) is found in the image.
export const detectLipCrop = async (imageUrl: string): Promise<LipCropResult | null> => {
  const [landmarker, img] = await Promise.all([getLandmarker(), loadImage(imageUrl)]);
  const result = landmarker.detect(img);
  const landmarks = result.faceLandmarks[0];
  if (!landmarks) return null;

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const i of LIP_INDICES) {
    const p = landmarks[i];
    if (!p) continue;
    minX = Math.min(minX, p.x * iw);
    maxX = Math.max(maxX, p.x * iw);
    minY = Math.min(minY, p.y * ih);
    maxY = Math.max(maxY, p.y * ih);
  }
  if (!Number.isFinite(minX)) return null;

  // Frame like the src/assets/lip-tone reference crops: lips spanning most of
  // the 3:2 frame with a slim skin margin — not a nose-to-chin view.
  const lipW = maxX - minX;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let cropW = Math.min(iw, lipW * 1.35);
  let cropH = Math.min(ih, (cropW * 2) / 3);
  cropW = (cropH * 3) / 2;
  const x = Math.min(Math.max(cx - cropW / 2, 0), iw - cropW);
  const y = Math.min(Math.max(cy - cropH / 2, 0), ih - cropH);
  const box: LipCropBox = { x: Math.round(x), y: Math.round(y), w: Math.round(cropW), h: Math.round(cropH) };

  const canvas = document.createElement("canvas");
  const outW = Math.min(600, box.w);
  canvas.width = outW;
  canvas.height = Math.round((outW * 2) / 3);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), box };
};
