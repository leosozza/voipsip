
-- 1. Create sip_accounts table
CREATE TABLE public.sip_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Conta SIP',
  sip_server text NOT NULL,
  sip_domain text,
  ws_port integer NOT NULL DEFAULT 8089,
  transport text NOT NULL DEFAULT 'wss',
  sip_username text NOT NULL,
  sip_password text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sip_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sip accounts" ON public.sip_accounts FOR ALL USING (is_company_admin(company_id));
CREATE POLICY "Members can view sip accounts" ON public.sip_accounts FOR SELECT USING (is_company_member(company_id));

CREATE TRIGGER update_sip_accounts_updated_at BEFORE UPDATE ON public.sip_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Create contacts table
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  company_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contacts" ON public.contacts FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Members can manage contacts" ON public.contacts FOR ALL USING (is_company_member(company_id));

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Create extensions table (replaces user_mappings)
CREATE TABLE public.extensions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sip_account_id uuid REFERENCES public.sip_accounts(id) ON DELETE SET NULL,
  extension_number text NOT NULL,
  display_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage extensions" ON public.extensions FOR ALL USING (is_company_admin(company_id));
CREATE POLICY "Members can view extensions" ON public.extensions FOR SELECT USING (is_company_member(company_id));

CREATE TRIGGER update_extensions_updated_at BEFORE UPDATE ON public.extensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Adapt call_logs: add sip_call_id, drop old columns
ALTER TABLE public.call_logs ADD COLUMN sip_call_id text;
ALTER TABLE public.call_logs DROP COLUMN IF EXISTS api4com_call_id;
ALTER TABLE public.call_logs DROP COLUMN IF EXISTS bitrix_call_id;

-- 5. Remove bitrix_member_id from companies
ALTER TABLE public.companies DROP COLUMN IF EXISTS bitrix_member_id;

-- 6. Drop old tables
DROP TABLE IF EXISTS public.user_mappings CASCADE;
DROP TABLE IF EXISTS public.api4com_credentials CASCADE;
DROP TABLE IF EXISTS public.bitrix24_credentials CASCADE;
