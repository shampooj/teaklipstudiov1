-- Per-complexion wet-look shine for the Banuba try-on (makeup_lipsshine).
-- shine_intensity is the prefab's K alpha (0..1); 0 leaves the prefab out of
-- the effect entirely so existing shades render exactly as before.
-- shine_scale is the prefab's SS knob; Banuba's shine preset uses 1.
ALTER TABLE public.lipstick_shade_settings
  ADD COLUMN IF NOT EXISTS shine_intensity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shine_scale numeric NOT NULL DEFAULT 1;
