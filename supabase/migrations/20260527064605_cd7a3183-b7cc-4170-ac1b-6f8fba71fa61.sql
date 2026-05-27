
CREATE TABLE public.wear_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL,
  owner_phone TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  transport_mode TEXT NOT NULL DEFAULT 'walking',
  location_lat NUMERIC,
  location_lng NUMERIC,
  weather_snapshot JSONB,
  rain_probability NUMERIC,
  effective_stress NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wear_events_asset_phone ON public.wear_events (asset_id, owner_phone, started_at DESC);
CREATE INDEX idx_wear_events_open ON public.wear_events (asset_id, owner_phone) WHERE ended_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wear_events TO authenticated;
GRANT ALL ON public.wear_events TO service_role;

ALTER TABLE public.wear_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read wear_events" ON public.wear_events
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin write wear_events" ON public.wear_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


CREATE TABLE public.care_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL,
  owner_phone TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  source_ref JSONB,
  shown_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_care_insights_asset_phone ON public.care_insights (asset_id, owner_phone, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_insights TO authenticated;
GRANT ALL ON public.care_insights TO service_role;

ALTER TABLE public.care_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read care_insights" ON public.care_insights
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin write care_insights" ON public.care_insights
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

NOTIFY pgrst, 'reload schema';
