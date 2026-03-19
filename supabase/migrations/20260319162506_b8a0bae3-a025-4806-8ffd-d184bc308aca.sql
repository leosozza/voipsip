
-- Create a security definer function to check if a company has any members
CREATE OR REPLACE FUNCTION public.company_has_no_members(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = p_company_id
  )
$$;

-- Drop and recreate the INSERT policy for company_members
DROP POLICY IF EXISTS "Admins can manage members" ON public.company_members;

CREATE POLICY "Admins can manage members"
ON public.company_members
FOR INSERT
TO authenticated
WITH CHECK (
  is_company_admin(company_id)
  OR (
    company_has_no_members(company_id)
    AND role = 'admin'
    AND user_id = auth.uid()
  )
);
