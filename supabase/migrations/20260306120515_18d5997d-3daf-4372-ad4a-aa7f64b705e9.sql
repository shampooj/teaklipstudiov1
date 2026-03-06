
CREATE TABLE public.cart_click_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shade_id TEXT NOT NULL,
  shade_label TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow anonymous inserts (no auth required since this is a public-facing embed)
ALTER TABLE public.cart_click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON public.cart_click_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated reads" ON public.cart_click_events
  FOR SELECT TO authenticated USING (true);
