// Variant name → variant ID mapping from Shopify
export const VARIANT_MAP: Record<string, string> = {
  "Riya": "45733638275225",
  "Saanvi": "45733638242457",
  "Neha": "45733508546713",
  "Amira": "45733638209689",
  "Kiran": "45733638406297",
  "Priya": "45707281727641",
  "Anjali": "45733508513945",
  "Sejal": "45733508481177",
  "Jiya": "45733638373529",
  "Shivani": "45733424201881",
  "Farrah": "45733502779545",
  "Ruchi": "45733502746777",
  "Amrit": "45733638340761",
  "Nyla": "45707281760409",
  "Karina": "45733638537369",
  "Pooja": "45820766159001",
  "Aaliyah": "45733638307993",
};

// Product details for each variant name
export const PRODUCT_DETAILS: Record<string, { label: string; description: string; color: string }> = {
  "Amira": { label: "Color Study Demi-Satin in Amira", description: "Soft mauve-brown nude with a natural demi-satin finish", color: "#b5837a" },
  "Amrit": { label: "Color Study Demi-Satin in Amrit", description: "Deep rich terracotta-brick with chocolate undertones", color: "#8b4533" },
  "Jiya": { label: "Color Study Demi-Satin in Jiya", description: "Timeless, bold red — think Old Hollywood glamour", color: "#b91c1c" },
  "Riya": { label: "Color Study Demi-Satin in Riya", description: "Warm terracotta-brown matte with a 90s supermodel vibe", color: "#a0522d" },
  "Neha": { label: "Sheer Lipstick Balm in Neha", description: "Deep berry-plum with a luxurious, moody vibe", color: "#7c2d4b" },
  "Saanvi": { label: "Color Study Demi-Satin in Saanvi", description: "Warm rosewood-brown with a velvety finish", color: "#9b5e5e" },
  "Kiran": { label: "Color Study Demi-Satin in Kiran", description: "Classic true red with warm undertones", color: "#c41e3a" },
  "Anjali": { label: "Sheer Lipstick Balm in Anjali", description: "Sheer rosy-nude with a hydrating balm finish", color: "#c98b8b" },
  "Farrah": { label: "Sheer Lipstick Balm in Farrah", description: "Soft peachy-pink with a luminous sheen", color: "#d4917a" },
  "Ruchi": { label: "Sheer Lipstick Balm in Ruchi", description: "Light coral-pink with a dewy glow", color: "#e08b7a" },
  "Pooja": { label: "Color Study Demi-Satin in Pooja", description: "Rich brown-berry with a satin finish", color: "#6b3a4a" },
  "Aaliyah": { label: "Color Study Demi-Satin in Aaliyah", description: "Deep plum-chocolate with warm undertones", color: "#5c2e3e" },
  "Priya": { label: "Color Study Demi-Satin in Priya", description: "Warm dusty rose with a natural finish", color: "#b07070" },
  "Sejal": { label: "Sheer Lipstick Balm in Sejal", description: "Nude-pink with a barely-there tint", color: "#c9907a" },
  "Shivani": { label: "Color Study Demi-Satin in Shivani", description: "Muted mauve with earthy undertones", color: "#8a6070" },
  "Nyla": { label: "Color Study Demi-Satin in Nyla", description: "Warm cinnamon-brown with a smooth satin finish", color: "#8b5a3a" },
  "Karina": { label: "Color Study Demi-Satin in Karina", description: "Cool-toned berry with a sophisticated edge", color: "#7a3050" },
};

export type RecommendationCategory = "MLBB" | "RED" | "DAY" | "EVENING";

export interface Recommendation {
  category: RecommendationCategory;
  categoryLabel: string;
  variantName: string;
  variantId: string;
  label: string;
  description: string;
  color: string;
}

// App skin tone IDs used throughout the frontend and stored in the DB
export const SKIN_TONE_IDS = ["light-brown", "medium-brown", "deep-brown", "rich-brown"] as const;
export type SkinToneId = (typeof SKIN_TONE_IDS)[number];

// App lip tone IDs used throughout the frontend and stored in the DB
export const LIP_TONE_IDS = [
  "beige", "brown-rose", "chestnut", "deep-brown-rose", "grey-rose", "mauve", "mostly-deep-brown", "mostly-grey", "mostly-light-brown", "mostly-pink",
] as const;
export type LipToneId = (typeof LIP_TONE_IDS)[number];

// Skin tone + lip tone → Complexion Type number (kept in code; not admin-editable)
const COMPLEXION_TYPE_MAP: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  let n = 1;
  for (const s of SKIN_TONE_IDS) for (const l of LIP_TONE_IDS) map[`${s}|${l}`] = n++;
  return map;
})();

export const CATEGORY_ORDER: RecommendationCategory[] = ["MLBB", "RED", "DAY", "EVENING"];

export const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  MLBB: "\"My Lips But Better\"",
  RED: "A Statement Red",
  DAY: "An Easy, Everyday",
  EVENING: "An Evening Look",
};

export interface RecommendationRow {
  skin_tone: string;
  lip_tone: string;
  category: string;
  variant_name: string;
}

// Build the display-ready recommendations for a (skin_tone, lip_tone) from raw DB rows.
export function buildRecommendations(
  rows: RecommendationRow[],
  skinToneId: string,
  lipToneId: string,
): Recommendation[] {
  const filtered = rows.filter((r) => r.skin_tone === skinToneId && r.lip_tone === lipToneId);
  const byCat = new Map(filtered.map((r) => [r.category, r.variant_name]));
  const out: Recommendation[] = [];
  for (const cat of CATEGORY_ORDER) {
    const variantName = byCat.get(cat)?.trim();
    if (!variantName) continue;
    const details = PRODUCT_DETAILS[variantName];
    const variantId = VARIANT_MAP[variantName];
    if (!details || !variantId) continue;
    out.push({
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat],
      variantName,
      variantId,
      label: details.label,
      description: details.description,
      color: details.color,
    });
  }
  return out;
}

export function getComplexionType(skinToneId: string, lipToneId: string): number | null {
  return COMPLEXION_TYPE_MAP[`${skinToneId}|${lipToneId}`] ?? null;
}

