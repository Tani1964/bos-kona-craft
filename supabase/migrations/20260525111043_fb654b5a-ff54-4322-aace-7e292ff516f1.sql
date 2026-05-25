ALTER TABLE public.ownership_records
  ADD CONSTRAINT ownership_records_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ownership_records_asset_id_idx
  ON public.ownership_records (asset_id);