
-- Table for mapping Bitrix24 users to local SIP accounts
CREATE TABLE public.bitrix_user_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bitrix_user_id text NOT NULL,
  bitrix_user_name text,
  sip_account_id uuid REFERENCES public.sip_accounts(id) ON DELETE SET NULL,
  inner_number text,
  is_queue_member boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, bitrix_user_id)
);

ALTER TABLE public.bitrix_user_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage user mappings"
  ON public.bitrix_user_mappings FOR ALL
  TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

CREATE POLICY "Members can view user mappings"
  ON public.bitrix_user_mappings FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

-- Updated_at trigger
CREATE TRIGGER update_bitrix_user_mappings_updated_at
  BEFORE UPDATE ON public.bitrix_user_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
