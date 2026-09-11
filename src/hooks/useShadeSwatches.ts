import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_DETAILS } from "@/data/lipstickRecommendations";

// Admin-tuned dot colour per shade (shade_swatches table). Anything without a
// row falls back to the catalog colour, so the quiz never shows a blank dot.
export type ShadeSwatches = Record<string, string>;

export const SHADE_SWATCHES_QUERY_KEY = ["shade-swatches"] as const;

export function useShadeSwatches() {
  return useQuery({
    queryKey: SHADE_SWATCHES_QUERY_KEY,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ShadeSwatches> => {
      const { data, error } = await (supabase.from as any)("shade_swatches").select("variant_name, hex");
      if (error) throw error;
      const map: ShadeSwatches = {};
      for (const row of (data ?? []) as { variant_name: string; hex: string }[]) {
        if (row.hex) map[row.variant_name] = row.hex;
      }
      return map;
    },
  });
}

export const swatchColor = (name: string, swatches?: ShadeSwatches | null): string =>
  swatches?.[name] ?? PRODUCT_DETAILS[name]?.color ?? "#000000";
