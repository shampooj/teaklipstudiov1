
-- Create storage bucket for cart click images
INSERT INTO storage.buckets (id, name, public) VALUES ('cart-images', 'cart-images', true);

-- Allow anonymous uploads to cart-images bucket
CREATE POLICY "Allow anonymous uploads" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'cart-images');

-- Allow public reads from cart-images bucket
CREATE POLICY "Allow public reads on cart-images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'cart-images');

-- Add image_url column to cart_click_events
ALTER TABLE public.cart_click_events ADD COLUMN image_url TEXT;
