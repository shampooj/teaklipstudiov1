
CREATE POLICY "Allow authenticated inserts" ON public.customer_submissions FOR INSERT TO authenticated WITH CHECK (true);
