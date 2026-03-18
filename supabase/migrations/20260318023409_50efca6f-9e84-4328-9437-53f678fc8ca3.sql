
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS bitrix_call_id text;

CREATE INDEX IF NOT EXISTS idx_bitrix_user_mappings_company_user 
  ON public.bitrix_user_mappings(company_id, bitrix_user_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_bitrix_call_id 
  ON public.call_logs(bitrix_call_id);

-- Allow service role to update call_logs (for finishing calls)
CREATE POLICY "Service role can update call logs"
  ON public.call_logs FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
