
-- Fix function search_path
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end $$;

-- Revoke public execute on has_role (only RLS / server-side use it)
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;

-- Restrict passport-media listing: allow individual reads but block bucket-wide listing
drop policy if exists "Public read passport-media" on storage.objects;
create policy "Public read passport-media object" on storage.objects for select
  using (bucket_id = 'passport-media' and (storage.foldername(name))[1] is not null);
