
ALTER TABLE public.customer_submissions ADD COLUMN is_labeled boolean NOT NULL DEFAULT false;

-- Sync existing labeled rows
UPDATE public.customer_submissions
SET is_labeled = true
WHERE id IN (SELECT image_id FROM public.admin_labels);
