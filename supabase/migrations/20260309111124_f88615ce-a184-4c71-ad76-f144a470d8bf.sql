
ALTER TABLE public.customer_submissions
ADD COLUMN admin_lip_tone_category text;

CREATE POLICY "Allow authenticated updates"
ON public.customer_submissions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
