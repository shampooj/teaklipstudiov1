-- Admin-managed site features that render on the Shopify storefront via a
-- pasted Custom Liquid snippet. One row per feature (key), config as jsonb.
-- The pasted snippet reads the row with the anon key, so public SELECT is
-- intended; only admins write. Idempotent for supabase db push.
CREATE TABLE IF NOT EXISTS public.web_features (
  key text PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.web_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads web features" ON public.web_features;
CREATE POLICY "Public reads web features" ON public.web_features
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin inserts web features" ON public.web_features;
CREATE POLICY "Admin inserts web features" ON public.web_features
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admin updates web features" ON public.web_features;
CREATE POLICY "Admin updates web features" ON public.web_features
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin deletes web features" ON public.web_features;
CREATE POLICY "Admin deletes web features" ON public.web_features
  FOR DELETE TO authenticated USING (true);

-- Images uploaded for these features (e.g. bestseller card photos) are
-- storefront marketing imagery: public-read, admin-write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('web-features', 'web-features', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public reads on web-features" ON storage.objects;
CREATE POLICY "Public reads on web-features" ON storage.objects
  FOR SELECT USING (bucket_id = 'web-features');

DROP POLICY IF EXISTS "Admin inserts on web-features" ON storage.objects;
CREATE POLICY "Admin inserts on web-features" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'web-features');

DROP POLICY IF EXISTS "Admin deletes on web-features" ON storage.objects;
CREATE POLICY "Admin deletes on web-features" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'web-features');
