-- 1. Product identity anchor on assets
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS store_product_id text;

CREATE INDEX IF NOT EXISTS idx_assets_store_product_id
  ON public.assets(store_product_id);

COMMENT ON COLUMN public.assets.store_product_id IS
  'Permanent link to Bos'' Kọ́nà store product (catalog identity anchor). Nullable until wired to the storefront.';

-- 2. Ownership history table
CREATE TABLE IF NOT EXISTS public.ownership_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL,
  store_order_id text,
  owner_ref text,
  event_type text NOT NULL DEFAULT 'purchase',
  acquired_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ownership_records_asset_id
  ON public.ownership_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_ownership_records_store_order_id
  ON public.ownership_records(store_order_id);

ALTER TABLE public.ownership_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ownership_records"
  ON public.ownership_records FOR SELECT
  USING (true);

CREATE POLICY "Admin write ownership_records"
  ON public.ownership_records FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.ownership_records IS
  'Ownership history per asset. Each row = one acquisition event (purchase, gift, resale). Linked to store order via store_order_id (nullable until wired).';
COMMENT ON COLUMN public.ownership_records.event_type IS
  'purchase | transfer | resale | gift';