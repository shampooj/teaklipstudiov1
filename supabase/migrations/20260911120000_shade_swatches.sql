-- Admin-tuned swatch colour per shade: the hex behind the coloured dot the
-- quiz shows for each lipstick (results card + admin pickers). One row per
-- variant name; shades without a row fall back to the catalog colour in
-- src/data/lipstickRecommendations.ts. Idempotent for supabase db push.
CREATE TABLE IF NOT EXISTS public.shade_swatches (
  variant_name text PRIMARY KEY,
  hex text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shade_swatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads shade swatches" ON public.shade_swatches;
CREATE POLICY "Public reads shade swatches" ON public.shade_swatches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin inserts shade swatches" ON public.shade_swatches;
CREATE POLICY "Admin inserts shade swatches" ON public.shade_swatches
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admin updates shade swatches" ON public.shade_swatches;
CREATE POLICY "Admin updates shade swatches" ON public.shade_swatches
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin deletes shade swatches" ON public.shade_swatches;
CREATE POLICY "Admin deletes shade swatches" ON public.shade_swatches
  FOR DELETE TO authenticated USING (true);
