
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cart-images');
CREATE POLICY "Allow anon uploads" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'cart-images');
