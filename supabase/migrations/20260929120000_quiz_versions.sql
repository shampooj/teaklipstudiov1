-- Quiz versions. Each version's flow is built in code (src/lib/quizVersions.ts
-- lists them); this table only holds the admin's switch for each one: on/off
-- and its traffic weight in the split. Visitors read it with the anon key to
-- pick a version, so public SELECT is intended; only admins write.
-- Idempotent for supabase db push.
CREATE TABLE IF NOT EXISTS public.quiz_versions (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  weight integer NOT NULL DEFAULT 0 CHECK (weight >= 0),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads quiz versions" ON public.quiz_versions;
CREATE POLICY "Public reads quiz versions" ON public.quiz_versions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin inserts quiz versions" ON public.quiz_versions;
CREATE POLICY "Admin inserts quiz versions" ON public.quiz_versions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admin updates quiz versions" ON public.quiz_versions;
CREATE POLICY "Admin updates quiz versions" ON public.quiz_versions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin deletes quiz versions" ON public.quiz_versions;
CREATE POLICY "Admin deletes quiz versions" ON public.quiz_versions
  FOR DELETE TO authenticated USING (true);

-- The quiz as it stands today is version 1, live for all traffic.
INSERT INTO public.quiz_versions (key, enabled, weight)
VALUES ('v1', true, 100)
ON CONFLICT (key) DO NOTHING;
