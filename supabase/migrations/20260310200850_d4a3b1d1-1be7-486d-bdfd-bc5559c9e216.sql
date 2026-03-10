
CREATE TABLE public.bitrix_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  phone_number TEXT,
  bitrix_user_id TEXT,
  call_id TEXT,
  crm_entity_type TEXT,
  crm_entity_id TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.bitrix_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view events"
  ON public.bitrix_events FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Service role can insert events"
  ON public.bitrix_events FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.bitrix_events;
