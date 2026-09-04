-- Per-complexion gloss highlight for the Banuba try-on. Stored as the
-- makeup_lipsgloss "alpha" (0..1); 0 leaves the prefab out of the effect
-- entirely so existing shades render exactly as before.
ALTER TABLE public.lipstick_shade_settings
  ADD COLUMN IF NOT EXISTS gloss numeric NOT NULL DEFAULT 0;
