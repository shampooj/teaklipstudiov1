ALTER TABLE public.lipstick_shade_settings ADD COLUMN skin_tone text;

INSERT INTO public.lipstick_shade_settings (variant_name, lip_tone, hex, finish, opacity, skin_tone, updated_at)
SELECT s.variant_name, s.lip_tone, s.hex, s.finish, s.opacity, st.tone, now()
FROM public.lipstick_shade_settings s
CROSS JOIN (VALUES ('medium-brown'),('deep-brown'),('rich-brown')) AS st(tone)
WHERE s.skin_tone IS NULL;

UPDATE public.lipstick_shade_settings SET skin_tone = 'light-brown' WHERE skin_tone IS NULL;

ALTER TABLE public.lipstick_shade_settings ALTER COLUMN skin_tone SET NOT NULL;

ALTER TABLE public.lipstick_shade_settings DROP CONSTRAINT lipstick_shade_settings_variant_name_lip_tone_key;
ALTER TABLE public.lipstick_shade_settings ADD CONSTRAINT lipstick_shade_settings_variant_skin_lip_key UNIQUE (variant_name, skin_tone, lip_tone);