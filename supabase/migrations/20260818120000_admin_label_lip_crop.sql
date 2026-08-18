-- Admins decide per submission whether its lip crop may be shown on the
-- Brown Skin Archive lips page. The crop rectangle (pixels in the original
-- image) is stored alongside so the crop can be regenerated when serving.
ALTER TABLE public.admin_labels
  ADD COLUMN IF NOT EXISTS display_lip_crop boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lip_crop_box jsonb;
