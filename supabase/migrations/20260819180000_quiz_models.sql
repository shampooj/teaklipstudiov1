-- Admin-curated model roster for the quiz's "who would you like to see the
-- shades on?" grid. Each model carries its own skin/lip tone so picking a
-- model shows THAT complexion's recommendations and Banuba settings, not the
-- quiz-taker's own selections. image_key points at a bundled
-- assets/skin_tone/web file; image_path points at an uploaded object in the
-- public quiz-models bucket. Exactly one of the two is set.
-- Idempotent: this schema may already exist from a manual SQL-editor run.
CREATE TABLE IF NOT EXISTS public.quiz_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_key text UNIQUE,
  image_path text,
  skin_tone text,
  lip_tone text,
  display boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads displayed models" ON public.quiz_models;
CREATE POLICY "Anon reads displayed models" ON public.quiz_models
  FOR SELECT TO anon USING (display = true);

DROP POLICY IF EXISTS "Admin reads all models" ON public.quiz_models;
CREATE POLICY "Admin reads all models" ON public.quiz_models
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin inserts models" ON public.quiz_models;
CREATE POLICY "Admin inserts models" ON public.quiz_models
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admin updates models" ON public.quiz_models;
CREATE POLICY "Admin updates models" ON public.quiz_models
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin deletes models" ON public.quiz_models;
CREATE POLICY "Admin deletes models" ON public.quiz_models
  FOR DELETE TO authenticated USING (true);

-- Uploaded model photos are quiz-facing marketing imagery (not PII like
-- cart-images), so the bucket is public-read, admin-write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-models', 'quiz-models', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public reads on quiz-models" ON storage.objects;
CREATE POLICY "Public reads on quiz-models" ON storage.objects
  FOR SELECT USING (bucket_id = 'quiz-models');

DROP POLICY IF EXISTS "Admin inserts on quiz-models" ON storage.objects;
CREATE POLICY "Admin inserts on quiz-models" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'quiz-models');

DROP POLICY IF EXISTS "Admin deletes on quiz-models" ON storage.objects;
CREATE POLICY "Admin deletes on quiz-models" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'quiz-models');
