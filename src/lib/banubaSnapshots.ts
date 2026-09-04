import { supabase } from "@/integrations/supabase/client";
import { BANUBA_SDK_BASE, locateBanubaFile } from "@/lib/banubaAssets";
import { resolveBanubaFinish } from "@/lib/banubaFinish";
import { buildEffectZip, clampGloss } from "@/lib/banubaEffect";

// One shared Banuba player renders every shade sequentially and hands callers
// static snapshots. Mobile tabs cannot afford a WASM face tracker per product
// card — mounting several at once got the tab OOM-killed (page reload, quiz
// reset), so all try-on imagery must go through this queue.

export interface ShadeSnapshotSpec {
  key: string;
  hex: string;
  finish: string;
  opacity: number;
  /** makeup_lipsgloss alpha, 0..1; 0 = off */
  gloss?: number;
}

const MODULE_IDS = ["face_tracker", "lips", "skin", "makeup"];
const MAX_INPUT_DIM = 1280;
const SNAPSHOT_TIMEOUT_MS = 20_000;

interface EngineCtx {
  sdk: any;
  player: any;
  capture: any;
}

let engineCtx: Promise<EngineCtx> | null = null;

function getEngine(): Promise<EngineCtx> {
  if (!engineCtx) {
    engineCtx = (async () => {
      const { data, error } = await supabase.functions.invoke("get-banuba-token");
      if (error || !data?.token) throw new Error("Banuba token unavailable");
      const sdk: any = await import(/* @vite-ignore */ `${BANUBA_SDK_BASE}/BanubaSDK.browser.esm.js`);
      const player = await sdk.Player.create({
        clientToken: data.token,
        locateFile: locateBanubaFile,
      });
      await player.addModule(
        ...MODULE_IDS.map((id: string) => new sdk.Module(`${BANUBA_SDK_BASE}/modules/${id}.zip`)),
      );
      return { sdk, player, capture: new sdk.ImageCapture(player) };
    })();
    // Allow a later attempt to retry after e.g. a transient token fetch failure.
    engineCtx.catch(() => {
      engineCtx = null;
    });
  }
  return engineCtx;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

const inputFiles = new Map<string, Promise<File>>();

async function makeInputFile(imageUrl: string): Promise<File> {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(MAX_INPUT_DIM / Math.max(w, h), 1);
    if (scale >= 1) {
      return new File([blob], "face.png", { type: blob.type || "image/png" });
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.9),
    );
    return new File([out], "face.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getInputFile(imageUrl: string): Promise<File> {
  let file = inputFiles.get(imageUrl);
  if (!file) {
    file = makeInputFile(imageUrl);
    file.catch(() => inputFiles.delete(imageUrl));
    inputFiles.set(imageUrl, file);
  }
  return file;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("Banuba snapshot timed out")), ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function blobSignature(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let a = 0;
  let b = 0;
  for (let i = 0; i < bytes.length; i += 31) a = (a * 33 + bytes[i]) >>> 0;
  for (let i = 0; i < bytes.length; i += 53) b = (b * 31 + bytes[i]) >>> 0;
  return `${bytes.length}:${a}:${b}`;
}

let lastCaptureSignature: string | null = null;

async function renderSnapshot(imageUrl: string, spec: ShadeSnapshotSpec): Promise<string> {
  const { sdk, player, capture } = await getEngine();
  const file = await getInputFile(imageUrl);
  const effect = new sdk.Effect(buildEffectZip(spec));
  await player.applyEffect(effect);
  await player.use(new sdk.Image(file));
  player.play({ pauseOnEmpty: false });
  // takePhoto races the render pipeline: it rejects ("Unable to create Blob")
  // until any frame exists, and just after applyEffect it can return the
  // PREVIOUS shade's frame. Poll until the captured bytes differ from the
  // previous snapshot; if they stay identical for a while, accept them —
  // two settings can legitimately render the same image.
  let lastError: unknown = new Error("Banuba snapshot failed");
  let identicalPolls = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const photo: Blob = await capture.takePhoto();
      const signature = await blobSignature(photo);
      if (lastCaptureSignature !== null && signature === lastCaptureSignature && identicalPolls < 8) {
        identicalPolls++;
        await sleep(250);
        continue;
      }
      lastCaptureSignature = signature;
      return URL.createObjectURL(photo);
    } catch (e) {
      lastError = e;
      await sleep(250);
    }
  }
  throw lastError;
}

const snapshotCache = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

export function snapshotShade(imageUrl: string, spec: ShadeSnapshotSpec): Promise<string> {
  // Key on the resolved finish so legacy aliases share a cache entry with
  // their canonical preset instead of re-rendering an identical frame.
  const cacheKey = `${imageUrl}|${spec.hex}|${resolveBanubaFinish(spec.finish)}|${spec.opacity}|${clampGloss(spec.gloss)}`;
  const hit = snapshotCache.get(cacheKey);
  if (hit) return hit;

  const job = queue.then(() => withTimeout(renderSnapshot(imageUrl, spec), SNAPSHOT_TIMEOUT_MS));
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  const cached = job.catch((e) => {
    snapshotCache.delete(cacheKey);
    throw e;
  });
  snapshotCache.set(cacheKey, cached);
  return cached;
}
