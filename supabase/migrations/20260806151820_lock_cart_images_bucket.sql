-- Selfies are PII. Make the cart-images bucket write-only for anonymous
-- users: they can upload their own selfie but can never read, list, or
-- delete stored objects. Reads and deletes are restricted to
-- authenticated (invite-only admin) accounts, which use signed URLs.

DROP POLICY IF EXISTS "Allow public reads on cart-images" ON storage.objects;

-- Duplicate of "Allow anonymous uploads"; drop for clarity.
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;

CREATE POLICY "Admin reads on cart-images" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'cart-images');

-- The admin dashboard deletes storage objects when removing a submission;
-- no policy ever granted that, so it silently failed under RLS.
CREATE POLICY "Admin deletes on cart-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'cart-images');
