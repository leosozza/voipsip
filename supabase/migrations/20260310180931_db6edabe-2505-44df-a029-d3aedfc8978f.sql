
CREATE TABLE public.bitrix_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bitrix_domain text NOT NULL,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE public.bitrix_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bitrix credentials"
  ON public.bitrix_credentials
  FOR ALL
  TO authenticated
  USING (is_company_admin(company_id))
  WITH CHECK (is_company_admin(company_id));

CREATE POLICY "Members can view bitrix credentials"
  ON public.bitrix_credentials
  FOR SELECT
  TO authenticated
  USING (is_company_member(company_id));

CREATE TRIGGER update_bitrix_credentials_updated_at
  BEFORE UPDATE ON public.bitrix_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
