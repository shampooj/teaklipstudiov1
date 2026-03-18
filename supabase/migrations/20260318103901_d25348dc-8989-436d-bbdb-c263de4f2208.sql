
CREATE TABLE public.ai_categorization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.customer_submissions(id) ON DELETE CASCADE,
  ai_skin_tone text,
  ai_lip_tone text,
  model_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_categorization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon inserts" ON public.ai_categorization FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON public.ai_categorization FOR ALL TO authenticated USING (true) WITH CHECK (true);
