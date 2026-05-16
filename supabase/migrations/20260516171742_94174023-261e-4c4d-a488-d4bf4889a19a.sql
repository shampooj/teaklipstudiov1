
CREATE TABLE public.lipstick_shade_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_name text NOT NULL,
  lip_tone text NOT NULL,
  hex text NOT NULL DEFAULT '#b91c1c',
  finish text NOT NULL DEFAULT 'satin',
  opacity numeric NOT NULL DEFAULT 0.8,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid,
  UNIQUE (variant_name, lip_tone)
);

ALTER TABLE public.lipstick_shade_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read shade settings"
  ON public.lipstick_shade_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert shade settings"
  ON public.lipstick_shade_settings FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update shade settings"
  ON public.lipstick_shade_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete shade settings"
  ON public.lipstick_shade_settings FOR DELETE
  TO authenticated USING (true);
