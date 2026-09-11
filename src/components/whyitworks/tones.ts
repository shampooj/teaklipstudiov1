// Colour data + tiny colour maths shared by the Why It Works interactives.
// Skin tones come from the quiz taxonomy; lip tones are the mean centre
// colour of the four reference photos behind each quiz lip-tone row
// (src/assets/lip-tone/web), so the demos use the same palette the quiz does.
import { SKIN_TONES } from "@/data/toneOptions";
import { PRODUCT_DETAILS } from "@/data/lipstickRecommendations";

export const SKIN = SKIN_TONES.map((s) => ({ id: s.id, label: `${s.label} Skin`, hex: s.color }));

export const LIP_TONES = [
  { id: "mostly-pink", label: "Mostly Pink", hex: "#c06768" },
  { id: "beige", label: "Beige", hex: "#c07c72" },
  { id: "chestnut", label: "Chestnut", hex: "#965750" },
  { id: "mauve", label: "Mauve", hex: "#9e6569" },
  { id: "brown-rose", label: "Brown Rose", hex: "#a8625f" },
  { id: "grey-rose", label: "Grey Rose", hex: "#b17572" },
  { id: "deep-brown-rose", label: "Deep Brown Rose", hex: "#925956" },
  { id: "mostly-light-brown", label: "Mostly Light Brown", hex: "#9f6b5c" },
  { id: "mostly-deep-brown", label: "Mostly Deep Brown", hex: "#7c4e45" },
  { id: "mostly-purple", label: "Mostly Purple", hex: "#766065" },
] as const;

// A handful of real shades for the demos, one per mood.
export const DEMO_SHADES = ["Jiya", "Amira", "Neha", "Riya"].map((name) => ({
  name,
  hex: PRODUCT_DETAILS[name]?.color ?? "#8f2839",
}));

export type Rgb = [number, number, number];

export const hexToRgb = (hex: string): Rgb => {
  const v = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as Rgb;
};
export const rgbToHex = ([r, g, b]: Rgb) =>
  "#" + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");

// Perceptually closer than straight RGB: blend in a gamma-2.2 linear space.
const toLin = (c: number) => Math.pow(c / 255, 2.2);
const fromLin = (c: number) => Math.pow(c, 1 / 2.2) * 255;
export const mix = (a: string, b: string, t: number): string => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((c, i) => fromLin(toLin(c) * (1 - t) + toLin(B[i]) * t)) as Rgb);
};

// Skin gradient: position 0..1 across the five quiz skin tones.
export const skinAt = (t: number): string => {
  const stops = SKIN.map((s) => s.hex);
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  return mix(stops[i], stops[i + 1], x - i);
};
export const skinLabelAt = (t: number): string => SKIN[Math.round(Math.max(0, Math.min(1, t)) * (SKIN.length - 1))].label;

// Lipstick over natural lip. Plain sRGB alpha blend, the same maths the
// browser uses to paint a translucent layer, so the LipToneDemo's layered
// diagram and its computed "worn" hex agree exactly.
export const wornLip = (lipstick: string, natural: string, coverage: number): string => {
  const L = hexToRgb(lipstick), N = hexToRgb(natural);
  return rgbToHex(N.map((c, i) => c * (1 - coverage) + L[i] * coverage) as Rgb);
};
