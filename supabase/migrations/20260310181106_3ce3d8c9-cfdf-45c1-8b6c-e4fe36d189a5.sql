
CREATE POLICY "Admins can delete bitrix credentials"
  ON public.bitrix_credentials
  FOR DELETE
  TO authenticated
  USING (is_company_admin(company_id));
