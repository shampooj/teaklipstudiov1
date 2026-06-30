ALTER TABLE public.customer_submissions ADD COLUMN IF NOT EXISTS shirt text;

CREATE OR REPLACE FUNCTION public.insert_customer_submission(
  p_variant_id text,
  p_image_url text DEFAULT NULL::text,
  p_image_id uuid DEFAULT NULL::uuid,
  p_skin_tone text DEFAULT NULL::text,
  p_lip_tone text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_shirt text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.customer_submissions (variant_id, image_url, image_id, skin_tone, lip_tone, email, shirt)
  VALUES (p_variant_id, p_image_url, p_image_id, p_skin_tone, p_lip_tone, p_email, p_shirt)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;