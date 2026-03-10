
CREATE TABLE public.bitrix_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL UNIQUE,
  domain text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bitrix_installations ENABLE ROW LEVEL SECURITY;

-- Service role can insert/update during installation
CREATE POLICY "Service role can manage installations"
  ON public.bitrix_installations
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Members can view their company installations
CREATE POLICY "Members can view installations"
  ON public.bitrix_installations
  FOR SELECT
  TO authenticated
  USING (is_company_member(company_id));

-- Trigger for updated_at
CREATE TRIGGER update_bitrix_installations_updated_at
  BEFORE UPDATE ON public.bitrix_installations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bitrix_installations;
