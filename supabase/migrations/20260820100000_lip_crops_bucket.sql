-- Public bucket for admin-approved lip crops shown on the Brown Skin Archive
-- page. Only the 3:2 lips crop is ever published here — full photos stay in
-- the locked cart-images bucket, honoring "we only display a crop of the
-- lips". The bucket's contents ARE the publication state: approving a label
-- uploads {submission_id}.jpg, un-labeling deletes it, and the archive page
-- simply lists the bucket. Idempotent for supabase db push over manual runs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('lip-crops', 'lip-crops', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public reads on lip-crops" ON storage.objects;
CREATE POLICY "Public reads on lip-crops" ON storage.objects
  FOR SELECT USING (bucket_id = 'lip-crops');

DROP POLICY IF EXISTS "Admin inserts on lip-crops" ON storage.objects;
CREATE POLICY "Admin inserts on lip-crops" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lip-crops');

DROP POLICY IF EXISTS "Admin updates on lip-crops" ON storage.objects;
CREATE POLICY "Admin updates on lip-crops" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'lip-crops');

DROP POLICY IF EXISTS "Admin deletes on lip-crops" ON storage.objects;
CREATE POLICY "Admin deletes on lip-crops" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'lip-crops');
