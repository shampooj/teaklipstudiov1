
ALTER TABLE public.customer_submissions
ADD COLUMN labeled_by_user_id uuid,
ADD COLUMN labeled_at timestamp with time zone;
