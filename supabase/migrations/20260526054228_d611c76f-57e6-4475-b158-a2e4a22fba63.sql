
-- 1. Ownership: phone-based lookup
ALTER TABLE public.ownership_records
  ADD COLUMN IF NOT EXISTS owner_phone TEXT;

CREATE INDEX IF NOT EXISTS ownership_records_owner_phone_idx
  ON public.ownership_records (owner_phone);

CREATE INDEX IF NOT EXISTS ownership_records_asset_id_idx
  ON public.ownership_records (asset_id);

-- 2. Care tools catalog
CREATE TABLE IF NOT EXISTS public.care_tools (
  tool_id     TEXT PRIMARY KEY,
  tool_name   TEXT NOT NULL,
  tool_type   TEXT NOT NULL,          -- cleaning | finishing | sole | ...
  kfi_weight  NUMERIC NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.care_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read care_tools"
  ON public.care_tools FOR SELECT
  USING (true);

CREATE POLICY "Admin write care_tools"
  ON public.care_tools FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Care sessions (grouping)
CREATE TABLE IF NOT EXISTS public.care_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  owner_phone     TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress | completed | partial
  classification  TEXT,                                  -- "Maintenance Session" | "Partial Care" | ...
  tools_used      TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS care_sessions_asset_phone_idx
  ON public.care_sessions (asset_id, owner_phone, started_at DESC);

ALTER TABLE public.care_sessions ENABLE ROW LEVEL SECURITY;

-- Public read intentionally OFF; reads go through server fns that verify the
-- requester's verified phone matches owner_phone. Admins read via has_role.
CREATE POLICY "Admin read care_sessions"
  ON public.care_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin write care_sessions"
  ON public.care_sessions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Care events (one per NFC tap)
CREATE TABLE IF NOT EXISTS public.care_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  owner_phone  TEXT NOT NULL,
  tool_id      TEXT NOT NULL REFERENCES public.care_tools(tool_id),
  session_id   UUID REFERENCES public.care_sessions(id) ON DELETE SET NULL,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS care_events_asset_phone_idx
  ON public.care_events (asset_id, owner_phone, occurred_at DESC);
CREATE INDEX IF NOT EXISTS care_events_session_idx
  ON public.care_events (session_id);

ALTER TABLE public.care_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read care_events"
  ON public.care_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin write care_events"
  ON public.care_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Seed care tool catalog
INSERT INTO public.care_tools (tool_id, tool_name, tool_type, kfi_weight, active) VALUES
  ('premium_brush_v1',     'Premium Care Brush', 'cleaning',  1.0, true),
  ('microfiber_finish_v1', 'Microfiber Cloth',   'finishing', 0.5, true),
  ('sole_maintenance_v1',  'Sole Maintenance Tool', 'sole',  0.75, false)
ON CONFLICT (tool_id) DO NOTHING;

-- 6. Refresh PostgREST schema cache for new FKs
NOTIFY pgrst, 'reload schema';
