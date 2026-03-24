// Variant name → variant ID mapping from Shopify
export const VARIANT_MAP: Record<string, string> = {
  "Riya": "45733638275225",
  "Saanvi": "45733638242457",
  "Neha": "45733508546713",
  "Lip Set for Medium Brown Skin": "45763189047449",
  "Lip Set for Deep Brown Skin": "45763189571737",
  "Amira": "45733638209689",
  "Kiran": "45733638406297",
  "Reds Lip Set for All Brown Skin": "45763188981913",
  "Priya": "45707281727641",
  "Anjali": "45733508513945",
  "Sejal": "45733508481177",
  "Jiya": "45733638373529",
  "Lip Set for Light Brown Skin": "45763189014681",
  "Shivani": "45733424201881",
  "Farrah": "45733502779545",
  "Ruchi": "45733502746777",
  "Amrit": "45733638340761",
  "Lip Set for Rich Brown Skin": "45763189604505",
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
  "Lip Set for Light Brown Skin": { label: "Lip Set for Light Brown Skin", description: "Curated set of shades for light brown complexions", color: "#C68642" },
  "Lip Set for Medium Brown Skin": { label: "Lip Set for Medium Brown Skin", description: "Curated set of shades for medium brown complexions", color: "#8D5524" },
  "Lip Set for Deep Brown Skin": { label: "Lip Set for Deep Brown Skin", description: "Curated set of shades for deep brown complexions", color: "#5C3317" },
  "Lip Set for Rich Brown Skin": { label: "Lip Set for Rich Brown Skin", description: "Curated set of shades for rich brown complexions", color: "#3B1E08" },
};

export type RecommendationCategory = "MLBB" | "RED" | "DAY" | "EVENING" | "LIPSET";

export interface Recommendation {
  category: RecommendationCategory;
  categoryLabel: string;
  variantName: string;
  variantId: string;
  label: string;
  description: string;
  color: string;
}

// Skin tone ID (from app) → CSV skin tone value
const SKIN_TONE_MAP: Record<string, string> = {
  "light-brown": "light",
  "medium-brown": "medium brown",
  "deep-brown": "deep brown",
  "rich-brown": "rich brown",
};

// Lip tone ID (from app) → CSV lip tone value
const LIP_TONE_MAP: Record<string, string> = {
  "bright-pink": "bright pink",
  "brown-pink": "brown pink",
  "mauve-pink": "mauve pink",
  "beige": "beige",
  "two-toned-purple": "two-toned purple",
  "two-toned-brown": "two-toned brown",
  "two-toned-grey": "two-toned grey",
  "two-toned-beige": "two-toned beige",
  "neutral-brown": "neutral brown",
  "medium-brown": "medium brown",
  "deep-brown": "deep brown",
  "grey-brown": "grey brown",
};

// Full recommendation lookup: key = "skinTone|lipTone" (CSV values), value = [MLBB, RED, DAY, EVENING, LIPSET]
const RECOMMENDATIONS: Record<string, [string, string, string, string, string]> = {
  "light|bright pink": ["Farrah", "Jiya", "Ruchi", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|brown pink": ["Amira", "Jiya", "Farrah", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|mauve pink": ["Amira", "Kiran", "Farrah", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|beige": ["Amira", "Kiran", "Farrah", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|two-toned purple": ["Amira", "Kiran", "Anjali", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|two-toned brown": ["Amira", "Kiran", "Anjali", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|two-toned grey": ["Amira", "Kiran", "Anjali", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|two-toned beige": ["Amira", "Kiran", "Anjali", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|neutral brown": ["Saanvi", "Kiran", "Anjali", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|medium brown": ["Saanvi", "Kiran", "Anjali", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|deep brown": ["Saanvi", "Kiran", "Anjali", "Saanvi", "Lip Set for Light Brown Skin"],
  "light|grey brown": ["Saanvi", "Kiran", "Anjali", "Saanvi", "Lip Set for Light Brown Skin"],
  "medium brown|bright pink": ["Amira", "Jiya", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|brown pink": ["Amira", "Jiya", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|mauve pink": ["Amira", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|beige": ["Amira", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|two-toned purple": ["Saanvi", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|two-toned brown": ["Saanvi", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|two-toned grey": ["Saanvi", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|two-toned beige": ["Saanvi", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|neutral brown": ["Riya", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|medium brown": ["Riya", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|deep brown": ["Riya", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "medium brown|grey brown": ["Riya", "Kiran", "Neha", "Saanvi", "Lip Set for Medium Brown Skin"],
  "deep brown|bright pink": ["Neha", "Jiya", "Neha", "Saanvi", "Lip Set for Deep Brown Skin"],
  "deep brown|brown pink": ["Neha", "Jiya", "Neha", "Saanvi", "Lip Set for Deep Brown Skin"],
  "deep brown|mauve pink": ["Neha", "Kiran", "Neha", "Saanvi", "Lip Set for Deep Brown Skin"],
  "deep brown|beige": ["Neha", "Jiya", "Neha", "Saanvi", "Lip Set for Deep Brown Skin"],
  "deep brown|two-toned purple": ["Saanvi", "Kiran", "Riya", "Riya", "Lip Set for Deep Brown Skin"],
  "deep brown|two-toned brown": ["Saanvi", "Kiran", "Riya", "Riya", "Lip Set for Deep Brown Skin"],
  "deep brown|two-toned grey": ["Saanvi", "Kiran", "Riya", "Riya", "Lip Set for Deep Brown Skin"],
  "deep brown|two-toned beige": ["Saanvi", "Kiran", "Neha", "Riya", "Lip Set for Deep Brown Skin"],
  "deep brown|neutral brown": ["Pooja", "Kiran", "Neha", "Riya", "Lip Set for Deep Brown Skin"],
  "deep brown|medium brown": ["Pooja", "Kiran", "Neha", "Riya", "Lip Set for Deep Brown Skin"],
  "deep brown|deep brown": ["Pooja", "Kiran", "Neha", "Riya", "Lip Set for Deep Brown Skin"],
  "deep brown|grey brown": ["Pooja", "Kiran", "Neha", "Riya", "Lip Set for Deep Brown Skin"],
  "rich brown|bright pink": ["Neha", "Jiya", "Neha", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|brown pink": ["Neha", "Jiya", "Neha", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|mauve pink": ["Neha", "Kiran", "Neha", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|beige": ["Neha", "Kiran", "Neha", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|two-toned purple": ["Pooja", "Kiran", "Neha", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|two-toned brown": ["Pooja", "Kiran", "Neha", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|two-toned grey": ["Pooja", "Kiran", "Neha", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|two-toned beige": ["Pooja", "Kiran", "Neha", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|neutral brown": ["Amrit", "Kiran", "Aaliyah", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|medium brown": ["Amrit", "Kiran", "Aaliyah", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|deep brown": ["Amrit", "Kiran", "Aaliyah", "Aaliyah", "Lip Set for Rich Brown Skin"],
  "rich brown|grey brown": ["Amrit", "Kiran", "Aaliyah", "Amrit", "Lip Set for Rich Brown Skin"],
};

const CATEGORY_LABELS: Record<number, { key: RecommendationCategory; label: string }> = {
  0: { key: "MLBB", label: "Your Best My Lips But Better Shade" },
  1: { key: "RED", label: "Red" },
  2: { key: "DAY", label: "Day" },
  3: { key: "EVENING", label: "Evening" },
  4: { key: "LIPSET", label: "Lip Set" },
};

export function getRecommendations(skinToneId: string, lipToneId: string): Recommendation[] {
  const csvSkin = SKIN_TONE_MAP[skinToneId];
  const csvLip = LIP_TONE_MAP[lipToneId];
  if (!csvSkin || !csvLip) return [];

  const key = `${csvSkin}|${csvLip}`;
  const rec = RECOMMENDATIONS[key];
  if (!rec) return [];

  return rec.map((variantName, i) => {
    const trimmed = variantName.trim();
    const details = PRODUCT_DETAILS[trimmed];
    const variantId = VARIANT_MAP[trimmed];
    const cat = CATEGORY_LABELS[i];
    if (!details || !variantId || !cat) return null;
    return {
      category: cat.key,
      categoryLabel: cat.label,
      variantName: trimmed,
      variantId,
      label: details.label,
      description: details.description,
      color: details.color,
    };
  }).filter(Boolean) as Recommendation[];
}
