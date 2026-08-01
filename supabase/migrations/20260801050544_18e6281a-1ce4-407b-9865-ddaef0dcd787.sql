ALTER TABLE public.documentary
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS transform_external_url text;
NOTIFY pgrst, 'reload schema';