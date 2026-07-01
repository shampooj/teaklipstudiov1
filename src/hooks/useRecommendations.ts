import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildRecommendations,
  Recommendation,
  RecommendationRow,
} from "@/data/lipstickRecommendations";

async function fetchAllRecommendations(): Promise<RecommendationRow[]> {
  const { data, error } = await supabase
    .from("recommendations")
    .select("skin_tone, lip_tone, category, variant_name");
  if (error) throw error;
  return (data ?? []) as RecommendationRow[];
}

export function useRecommendationRows() {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: fetchAllRecommendations,
    staleTime: 60_000,
  });
}

export function useRecommendations(skinToneId: string, lipToneId: string): Recommendation[] {
  const { data } = useRecommendationRows();
  return useMemo(
    () => (data ? buildRecommendations(data, skinToneId, lipToneId) : []),
    [data, skinToneId, lipToneId],
  );
}
