// Lipstick finish presets accepted by the Banuba makeup module, taken verbatim
// from its schema (public/banuba/modules/makeup.zip → bnb_prefabs/makeup_lipstick/schema.json).
// Grouped mattes → creams → gloss → balms/sheers → metallics → sparkle for dropdown readability.
export const BANUBA_FINISHES = [
  "matte_dry",
  "matte_cream",
  "matte_powder",
  "matte_liquid",
  "matte_velvet",
  "matte_light",
  "matte_sheer_lightcolors",
  "matte_cream_vividcolors",
  "matte_velvet_sparkling",
  "matte_velvet_sparkling_lightcolors",
  "cream",
  "cream_shine",
  "cream_vividcolors",
  "cream_darkcolors",
  "satin",
  "shine",
  "glossy_cream_plumping",
  "glossy_cream_shimmer",
  "balm",
  "balm_light",
  "clear",
  "clear_shimmer",
  "metallic_cream",
  "metallic_shine",
  "metallic_sheer",
  "metallic_dry_lightcolors",
  "shimmer",
  "cream_shine_glitter",
] as const;

export type BanubaFinish = (typeof BANUBA_FINISHES)[number];

// Rows saved before the full preset list was exposed store these friendly names.
const LEGACY_ALIASES: Record<string, BanubaFinish> = {
  matte: "matte_cream",
  satin: "satin",
  glossy: "shine",
};

export const resolveBanubaFinish = (finish: string): BanubaFinish => {
  const aliased = LEGACY_ALIASES[finish];
  if (aliased) return aliased;
  return (BANUBA_FINISHES as readonly string[]).includes(finish)
    ? (finish as BanubaFinish)
    : "satin";
};

export const finishLabel = (finish: string) => finish.replace(/_/g, " ");
