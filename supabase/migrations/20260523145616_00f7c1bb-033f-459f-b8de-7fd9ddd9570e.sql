ALTER TABLE public.ownership_records
  ADD CONSTRAINT ownership_records_store_order_id_unique
  UNIQUE (store_order_id);