
-- Create admin_labels table
CREATE TABLE public.admin_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id uuid REFERENCES public.customer_submissions(id) ON DELETE CASCADE,
  admin_lip_tone_category text,
  labeled_by_user_id uuid,
  labeled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_labels ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow authenticated reads" ON public.admin_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated inserts" ON public.admin_labels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated updates" ON public.admin_labels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated deletes" ON public.admin_labels FOR DELETE TO authenticated USING (true);

-- Migrate existing data
INSERT INTO public.admin_labels (image_id, admin_lip_tone_category, labeled_by_user_id, labeled_at)
SELECT id, admin_lip_tone_category, labeled_by_user_id, labeled_at
FROM public.customer_submissions
WHERE is_labeled = true;

-- Remove columns from customer_submissions
ALTER TABLE public.customer_submissions DROP COLUMN admin_lip_tone_category;
ALTER TABLE public.customer_submissions DROP COLUMN labeled_by_user_id;
ALTER TABLE public.customer_submissions DROP COLUMN labeled_at;
ALTER TABLE public.customer_submissions DROP COLUMN is_labeled;
