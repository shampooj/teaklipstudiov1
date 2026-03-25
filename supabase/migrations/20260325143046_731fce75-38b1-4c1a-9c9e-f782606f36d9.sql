CREATE POLICY "Allow anon select after insert"
ON public.customer_submissions
FOR SELECT
TO anon
USING (true);