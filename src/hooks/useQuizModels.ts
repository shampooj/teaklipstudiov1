import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Bundled model candidates: everything in the skin_tone/web folder, keyed by
// filename so quiz_models rows can reference them across builds (the hashed
// asset URL changes per build, the filename doesn't).
export const BUNDLED_MODEL_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob("@/assets/skin_tone/web/*.jpg", { eager: true, import: "default" }),
  ).map(([path, url]) => [path.split("/").pop()!, url as string]),
);

export interface QuizModelRow {
  id: string;
  image_key: string | null;
  image_path: string | null;
  skin_tone: string | null;
  lip_tone: string | null;
  display: boolean;
  sort_order: number;
}

export interface QuizModel extends QuizModelRow {
  url: string;
}

export const resolveModelUrl = (row: QuizModelRow): string | null => {
  if (row.image_key) return BUNDLED_MODEL_IMAGES[row.image_key] ?? null;
  if (row.image_path) {
    return supabase.storage.from("quiz-models").getPublicUrl(row.image_path).data.publicUrl;
  }
  return null;
};

const toModels = (rows: QuizModelRow[]): QuizModel[] =>
  rows
    .map((row) => ({ ...row, url: resolveModelUrl(row) }))
    .filter((m): m is QuizModel => !!m.url);

// Quiz-facing: only displayed models (anon RLS enforces the same filter).
export function useDisplayedQuizModels() {
  return useQuery({
    queryKey: ["quiz-models", "displayed"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("quiz_models")
        .select("*")
        .eq("display", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return toModels((data ?? []) as QuizModelRow[]);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Admin-facing: every configured row, displayed or not.
export function useAllQuizModels() {
  return useQuery({
    queryKey: ["quiz-models", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("quiz_models")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuizModelRow[];
    },
  });
}
