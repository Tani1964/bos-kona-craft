-- 1. Wear events: potential → confirmed lifecycle
ALTER TABLE public.wear_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS detected_via text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS notification_provider text,
  ADD COLUMN IF NOT EXISTS outing_key text;

-- Existing rows were all explicit owner actions.
UPDATE public.wear_events
  SET status = 'confirmed',
      detected_via = 'manual',
      confirmed_at = COALESCE(confirmed_at, started_at)
  WHERE status IS NULL OR status = 'confirmed';

CREATE OR REPLACE FUNCTION public.wear_events_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('potential','awaiting_confirmation','confirmed','rejected','dismissed','expired') THEN
    RAISE EXCEPTION 'invalid wear_events.status: %', NEW.status;
  END IF;
  IF NEW.detected_via NOT IN ('manual','inference','nfc','prompt') THEN
    RAISE EXCEPTION 'invalid wear_events.detected_via: %', NEW.detected_via;
  END IF;
  IF NEW.notification_status NOT IN ('none','pending','sent','failed','unavailable') THEN
    RAISE EXCEPTION 'invalid wear_events.notification_status: %', NEW.notification_status;
  END IF;
  IF NEW.status = 'confirmed' AND NEW.confirmed_at IS NULL THEN
    NEW.confirmed_at = now();
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS wear_events_validate_trg ON public.wear_events;
CREATE TRIGGER wear_events_validate_trg
  BEFORE INSERT OR UPDATE ON public.wear_events
  FOR EACH ROW EXECUTE FUNCTION public.wear_events_validate();

-- One real-world outing = at most one row per asset+owner.
CREATE UNIQUE INDEX IF NOT EXISTS wear_events_outing_key_uidx
  ON public.wear_events (asset_id, owner_phone, outing_key)
  WHERE outing_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS wear_events_status_idx
  ON public.wear_events (owner_phone, status, started_at DESC);

-- 2. Push devices (provider-agnostic)
CREATE TABLE IF NOT EXISTS public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_phone text NOT NULL,
  provider text NOT NULL DEFAULT 'fcm',
  token text NOT NULL,
  device_label text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, token)
);
GRANT SELECT ON public.push_devices TO authenticated;
GRANT ALL ON public.push_devices TO service_role;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read push_devices" ON public.push_devices
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER push_devices_touch BEFORE UPDATE ON public.push_devices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Notification log
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_phone text NOT NULL,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  wear_event_id uuid,
  kind text NOT NULL,
  provider text NOT NULL DEFAULT 'fcm',
  status text NOT NULL DEFAULT 'queued',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read notification_log" ON public.notification_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS notification_log_owner_idx
  ON public.notification_log (owner_phone, created_at DESC);

-- 4. Owner settings
CREATE TABLE IF NOT EXISTS public.owner_settings (
  owner_phone text PRIMARY KEY,
  wear_intelligence boolean NOT NULL DEFAULT true,
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.owner_settings TO authenticated;
GRANT ALL ON public.owner_settings TO service_role;
ALTER TABLE public.owner_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read owner_settings" ON public.owner_settings
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER owner_settings_touch BEFORE UPDATE ON public.owner_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();