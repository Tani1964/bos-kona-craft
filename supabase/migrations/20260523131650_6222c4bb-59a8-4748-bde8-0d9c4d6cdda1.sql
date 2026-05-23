
-- ROLES
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users see own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins see all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ASSETS
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique,
  model_name text not null,
  status text not null default 'New',
  lot text,
  hero_style jsonb not null default '{"kind":"radial","spec":"circle_at_30%_30%,oklch(0.5_0.12_45),oklch(0.18_0.04_40)_60%,oklch(0.1_0.01_40)"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.assets enable row level security;

create table public.asset_telemetry (
  asset_id uuid primary key references public.assets(id) on delete cascade,
  wears int not null default 0,
  nfc_scans int not null default 0,
  care_entries int not null default 0,
  repairs int not null default 0,
  age_days int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.asset_telemetry enable row level security;

create table public.provenance_stages (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  position int not null default 0,
  icon_key text not null default 'leaf',
  label text not null,
  title text not null,
  body text not null,
  location text not null,
  date_text text not null
);
alter table public.provenance_stages enable row level security;

create table public.makers (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  position int not null default 0,
  name text not null,
  role text not null,
  years text not null
);
alter table public.makers enable row level security;

create table public.atelier (
  asset_id uuid primary key references public.assets(id) on delete cascade,
  name text not null,
  location text not null,
  lat numeric,
  lng numeric
);
alter table public.atelier enable row level security;

create table public.documentary (
  asset_id uuid primary key references public.assets(id) on delete cascade,
  video_path text,
  poster_path text,
  title text not null default 'Origin · The Making of an Heirloom',
  runtime text not null default '14:22',
  year text not null default '2026',
  format text not null default '9:12 · Vertical Cinema',
  synopsis text not null default '',
  chapters jsonb not null default '[]'::jsonb,
  credits jsonb not null default '[]'::jsonb
);
alter table public.documentary enable row level security;

create table public.module_overrides (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  module_id text not null,
  title_override text,
  subtitle_override text,
  thumbnail_override jsonb,
  unique (asset_id, module_id)
);
alter table public.module_overrides enable row level security;

-- RLS: public read, admin write for narrative tables
do $$
declare t text;
begin
  foreach t in array array['assets','provenance_stages','makers','atelier','documentary','module_overrides']
  loop
    execute format('create policy "Public read %1$s" on public.%1$s for select using (true);', t);
    execute format('create policy "Admin write %1$s" on public.%1$s for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''));', t);
  end loop;
end$$;

-- Telemetry: public read (passport is public), admin can update for now
create policy "Public read telemetry" on public.asset_telemetry for select using (true);
create policy "Admin write telemetry" on public.asset_telemetry for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger assets_touch before update on public.assets for each row execute function public.touch_updated_at();
create trigger telemetry_touch before update on public.asset_telemetry for each row execute function public.touch_updated_at();

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values
  ('documentary', 'documentary', false),
  ('passport-media', 'passport-media', true)
on conflict (id) do nothing;

create policy "Public read passport-media" on storage.objects for select
  using (bucket_id = 'passport-media');
create policy "Admin write passport-media" on storage.objects for all to authenticated
  using (bucket_id = 'passport-media' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'passport-media' and public.has_role(auth.uid(),'admin'));

create policy "Admin read documentary" on storage.objects for select to authenticated
  using (bucket_id = 'documentary' and public.has_role(auth.uid(),'admin'));
create policy "Admin write documentary" on storage.objects for all to authenticated
  using (bucket_id = 'documentary' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'documentary' and public.has_role(auth.uid(),'admin'));
