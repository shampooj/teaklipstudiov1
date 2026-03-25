
-- Create a security definer function to insert a customer submission and return the id
CREATE OR REPLACE FUNCTION public.insert_customer_submission(
  p_variant_id text,
  p_image_url text DEFAULT NULL,
  p_image_id uuid DEFAULT NULL,
  p_skin_tone text DEFAULT NULL,
  p_lip_tone text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.customer_submissions (variant_id, image_url, image_id, skin_tone, lip_tone, email)
  VALUES (p_variant_id, p_image_url, p_image_id, p_skin_tone, p_lip_tone, p_email)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Drop the anon SELECT policy since it's no longer needed
DROP POLICY IF EXISTS "Allow anon select after insert" ON public.customer_submissions;
