CREATE TABLE IF NOT EXISTS public.presence_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_phone text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.presence_pings TO authenticated;
GRANT ALL ON public.presence_pings TO service_role;
ALTER TABLE public.presence_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read presence_pings" ON public.presence_pings
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS presence_pings_owner_idx
  ON public.presence_pings (owner_phone, observed_at DESC);

ALTER TABLE public.owner_settings
  ADD COLUMN IF NOT EXISTS home_lat numeric,
  ADD COLUMN IF NOT EXISTS home_lng numeric,
  ADD COLUMN IF NOT EXISTS home_radius_m integer NOT NULL DEFAULT 900,
  ADD COLUMN IF NOT EXISTS last_prompt_at timestamptz;