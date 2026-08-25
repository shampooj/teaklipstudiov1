-- Per-image colorimetric measurements captured client-side at upload time:
-- CIELAB skin/lip samples from landmark-anchored facial regions, derived ITA,
-- Monk Skin Tone, undertone, lip-to-skin contrast, plus capture metadata and
-- the normalization parameters that make the numbers comparable (EXIF,
-- gray-world illuminant estimate, exposure stats). Headline metrics live in
-- scalar columns for filtering; the full detail is in measurements jsonb.
-- Idempotent for supabase db push over manual runs.
CREATE TABLE IF NOT EXISTS public.image_colorimetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.customer_submissions(id) ON DELETE CASCADE,
  ita_deg double precision,
  ita_band text,
  monk_tone integer,
  undertone text,
  lip_skin_delta_e double precision,
  measurements jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_colorimetry_submission_idx
  ON public.image_colorimetry (submission_id);

ALTER TABLE public.image_colorimetry ENABLE ROW LEVEL SECURITY;

-- Measurements are computed in the submitter's browser during the consent
-- upload, so the anon role inserts them (same posture as customer_submissions
-- writes); only authenticated admins read.
DROP POLICY IF EXISTS "Anon inserts colorimetry" ON public.image_colorimetry;
CREATE POLICY "Anon inserts colorimetry" ON public.image_colorimetry
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Admin inserts colorimetry" ON public.image_colorimetry;
CREATE POLICY "Admin inserts colorimetry" ON public.image_colorimetry
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admin reads colorimetry" ON public.image_colorimetry;
CREATE POLICY "Admin reads colorimetry" ON public.image_colorimetry
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin deletes colorimetry" ON public.image_colorimetry;
CREATE POLICY "Admin deletes colorimetry" ON public.image_colorimetry
  FOR DELETE TO authenticated USING (true);
