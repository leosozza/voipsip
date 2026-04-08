-- Add status tracking to extensions
ALTER TABLE public.extensions ADD COLUMN IF NOT EXISTS last_heartbeat timestamptz;
ALTER TABLE public.extensions ADD COLUMN IF NOT EXISTS status text DEFAULT 'offline';
