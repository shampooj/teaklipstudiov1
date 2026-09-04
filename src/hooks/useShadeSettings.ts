import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShadeSetting {
  variant_name: string;
  skin_tone: string;
  lip_tone: string;
  hex: string;
  finish: string;
  opacity: number;
  gloss: number;
  shine_intensity: number;
  shine_scale: number;
}

export function useShadeSettings(
  variantNames: string[],
  skinTone: string,
  lipTone: string,
) {
  const key = [...variantNames].sort().join(",");
  return useQuery({
    queryKey: ["shade-settings", key, skinTone, lipTone],
    enabled: variantNames.length > 0 && !!skinTone && !!lipTone,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("lipstick_shade_settings")
        // "*" rather than a column list so a client deployed ahead of the
        // gloss migration (Vercel preview vs. CI db push) still reads rows.
        .select("*")
        .eq("skin_tone", skinTone)
        .eq("lip_tone", lipTone)
        .in("variant_name", variantNames);
      if (error) throw error;
      const map: Record<string, ShadeSetting> = {};
      for (const row of (data ?? []) as ShadeSetting[]) {
        map[row.variant_name] = {
          ...row,
          opacity: Number(row.opacity),
          gloss: Number(row.gloss ?? 0),
          shine_intensity: Number(row.shine_intensity ?? 0),
          shine_scale: Number(row.shine_scale ?? 1),
        };
      }
      return map;
    },
  });
}
