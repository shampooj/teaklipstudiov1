
CREATE TABLE public.quiz_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon inserts" ON public.quiz_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated full access" ON public.quiz_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_quiz_events_session ON public.quiz_events (session_id);
CREATE INDEX idx_quiz_events_name ON public.quiz_events (event_name);
CREATE INDEX idx_quiz_events_created ON public.quiz_events (created_at);
