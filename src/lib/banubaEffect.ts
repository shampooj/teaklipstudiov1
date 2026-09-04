import { zipSync, strToU8 } from "fflate";
import { resolveBanubaFinish } from "@/lib/banubaFinish";

// Single source of truth for the per-shade Banuba effect config, shared by the
// customer snapshot queue and the admin live preview so both render identically.

/**
 * makeup_lipsshine, wet-look only. Banuba's "shine" preset
 * (bnb_prefabs/makeup_lipsshine/scripts/settings.js) supplies every shader
 * knob except the two exposed here. MakeupBase.apply accepts the settings
 * bundle itself as `finish`, which is how per-knob values get through.
 */
export interface ShineSpec {
  /** overlay alpha (the prefab's K), 0..1. 0 = no shine layer. */
  intensity: number;
  /** shine scale (the prefab's SS); preset is 1 */
  scale: number;
  /** Overlay tint; defaults to the lipstick hex. */
  hex?: string;
}

export const SHINE_DEFAULT_SCALE = 1;
export const SHINE_SCALE_MAX = 3;

/** Row/spec values → ShineSpec, or null when shine is off. */
export const shineFrom = (intensity: number | undefined, scale: number | undefined): ShineSpec | null => {
  const k = Math.min(1, Math.max(0, Number(intensity) || 0));
  if (k <= 0) return null;
  return { intensity: k, scale: Math.max(0, Number(scale ?? SHINE_DEFAULT_SCALE) || 0) };
};
const SHINE_PRESET = { SAT: 1.5, BR: 1, SI: 1, SB: 0.5, GB: 0, GI: 0, GG: 0 };

export interface BanubaEffectSpec {
  hex: string;
  finish: string;
  /** makeup_lipstick coverage, 0..1 */
  opacity: number;
  /** makeup_lipsgloss alpha, 0..1. 0 (or absent) = no gloss layer. */
  gloss?: number;
  /** Absent, or intensity 0 = no shine layer. */
  shine?: ShineSpec | null;
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

export function buildEffectConfig({ hex, finish, opacity, gloss, shine }: BanubaEffectSpec) {
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
  const shineK = shine ? Math.min(1, Math.max(0, Number(shine.intensity) || 0)) : 0;
  if (shine && shineK > 0) {
    face.makeup_lipsshine = {
      color: hexToRgbString(shine.hex ?? hex),
      // A settings object instead of a preset name: MakeupBase.apply spreads
      // it straight into the shader parameters.
      finish: { ...SHINE_PRESET, SS: Math.max(0, Number(shine.scale) || 0) },
      coverage: shineK,
    };
  }
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
