import { zipSync, strToU8 } from "fflate";
import { resolveBanubaFinish } from "@/lib/banubaFinish";

// Single source of truth for the per-shade Banuba effect config, shared by the
// customer snapshot queue and the admin live preview so both render identically.

export interface BanubaEffectSpec {
  hex: string;
  finish: string;
  /** makeup_lipstick coverage, 0..1 */
  opacity: number;
  /** makeup_lipsgloss alpha, 0..1. 0 (or absent) = no gloss layer. */
  gloss?: number;
}

export function hexToRgbString(hex: string) {
  const normalized = hex.trim().replace(/^#/, "");
  const value = normalized.length === 3
    ? normalized.split("").map((c) => `${c}${c}`).join("")
    : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return "0 0 0";
  const channels = [0, 2, 4].map((s) => parseInt(value.slice(s, s + 2), 16) / 255);
  return channels.map((c) => Number(c.toFixed(4))).join(" ");
}

export const clampGloss = (gloss: number | undefined) =>
  Math.min(1, Math.max(0, Number(gloss) || 0));

export function buildEffectConfig({ hex, finish, opacity, gloss }: BanubaEffectSpec) {
  const alpha = clampGloss(gloss);
  const face: Record<string, unknown> = {
    makeup_lipstick: {
      color: hexToRgbString(hex),
      finish: resolveBanubaFinish(finish),
      coverage: opacity,
    },
  };
  // The prefab's runtime default alpha is 0 (hidden) even though its schema
  // says 0.7, so alpha must always be passed explicitly when gloss is on.
  if (alpha > 0) face.makeup_lipsgloss = { alpha };
  return {
    scene: "teak-lipstick-preview",
    version: "2.0.0",
    camera: {},
    faces: [face],
  };
}

export function buildEffectZip(spec: BanubaEffectSpec) {
  const archive = zipSync({ "config.json": strToU8(JSON.stringify(buildEffectConfig(spec))) });
  const bytes = new Uint8Array(archive);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/zip" });
}
