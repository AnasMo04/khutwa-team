-- =====================================================================
-- KHUTWA TEAM - Supabase setup. Run ONCE: Supabase > SQL Editor > New query > paste > Run.
-- BEFORE running: replace PUT-YOUR-EMAIL@example.com with the organizer email
-- (the same email you create under Authentication > Users). Add more lines for more organizers.
-- =====================================================================

-- ---------- organizers ----------
create table if not exists public.admins (email text primary key);
insert into public.admins (email) values ('anaselnairia91@gmail.com') on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins
                 where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- the server decides the time, never the visitor
create or replace function public.force_now() returns trigger
language plpgsql as $$
begin new.date := now(); return new; end $$;

-- ---------- public site content (events, photos, shop, settings...) ----------
create table if not exists public.content (
  kind text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);

-- ---------- people data (private: organizers only can read) ----------
create table if not exists public.registrations (
  id text primary key,
  name text not null check (char_length(name) between 3 and 80),
  phone text not null check (phone ~ '^[0-9]{7,15}$'),
  email text not null default '' check (char_length(email) <= 120),
  ev text not null,
  note text not null default '' check (char_length(note) <= 200),
  date timestamptz not null default now(),
  unique (ev, phone)
);

create table if not exists public.join_requests (
  id text primary key,
  name text not null check (char_length(name) between 3 and 80),
  phone text not null check (phone ~ '^[0-9]{7,15}$'),
  email text not null default '' check (char_length(email) <= 120),
  level text not null check (level in ('lv1','lv2','lv3')),
  reason text not null check (char_length(reason) between 1 and 300),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  date timestamptz not null default now()
);
create unique index if not exists join_one_pending on public.join_requests (phone) where status = 'pending';

create table if not exists public.orders (
  id text primary key,
  pid text not null,
  name text not null check (char_length(name) between 3 and 80),
  phone text not null check (phone ~ '^[0-9]{7,15}$'),
  email text not null default '' check (char_length(email) <= 120),
  size text not null check (char_length(size) between 1 and 10),
  qty int not null check (qty between 1 and 10),
  note text not null default '' check (char_length(note) <= 200),
  status text not null default 'new' check (status in ('new','contacted','confirmed','delivered','cancelled')),
  date timestamptz not null default now()
);
create unique index if not exists orders_one_open on public.orders (pid, phone, size) where status = 'new';

create table if not exists public.checkins (
  id text primary key,
  ev text not null,
  name text not null check (char_length(name) between 5 and 80
        and array_length(regexp_split_to_array(btrim(name), '\s+'), 1) >= 3),
  phone text not null check (phone ~ '^[0-9]{7,15}$'),
  age int not null check (age between 1 and 99),
  consent boolean not null check (consent),
  date timestamptz not null default now(),
  unique (ev, phone)
);

-- ---------- triggers ----------
drop trigger if exists reg_now on public.registrations;
create trigger reg_now before insert on public.registrations for each row execute function public.force_now();
drop trigger if exists join_now on public.join_requests;
create trigger join_now before insert on public.join_requests for each row execute function public.force_now();
drop trigger if exists ord_now on public.orders;
create trigger ord_now before insert on public.orders for each row execute function public.force_now();
drop trigger if exists chk_now on public.checkins;
create trigger chk_now before insert on public.checkins for each row execute function public.force_now();

-- ---------- security (Row Level Security) ----------
alter table public.admins enable row level security;
alter table public.content enable row level security;
alter table public.registrations enable row level security;
alter table public.join_requests enable row level security;
alter table public.orders enable row level security;
alter table public.checkins enable row level security;

drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select to authenticated using (public.is_admin());

drop policy if exists content_read on public.content;
create policy content_read on public.content for select to anon, authenticated using (true);
drop policy if exists content_admin on public.content;
create policy content_admin on public.content for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- visitors may only ADD rows (never read, change or delete)
drop policy if exists reg_insert on public.registrations;
create policy reg_insert on public.registrations for insert to anon, authenticated with check (true);
drop policy if exists reg_admin on public.registrations;
create policy reg_admin on public.registrations for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists join_insert on public.join_requests;
create policy join_insert on public.join_requests for insert to anon, authenticated with check (status = 'pending');
drop policy if exists join_admin on public.join_requests;
create policy join_admin on public.join_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists ord_insert on public.orders;
create policy ord_insert on public.orders for insert to anon, authenticated with check (status = 'new');
drop policy if exists ord_admin on public.orders;
create policy ord_admin on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- check-in is accepted ONLY while the organizer has opened it for that exact run
drop policy if exists chk_insert on public.checkins;
create policy chk_insert on public.checkins for insert to anon, authenticated
  with check (exists (select 1 from public.content c
                      where c.kind = 'set' and c.id = 'main'
                        and c.data -> 'checkin' ->> 'open' = 'true'
                        and c.data -> 'checkin' ->> 'ev' = checkins.ev));
drop policy if exists chk_admin on public.checkins;
create policy chk_admin on public.checkins for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- table permissions ----------
grant usage on schema public to anon, authenticated;
grant select on public.content to anon, authenticated;
grant insert, update, delete on public.content to authenticated;
grant insert on public.registrations, public.join_requests, public.orders, public.checkins to anon;
grant select, insert, update, delete on public.registrations, public.join_requests, public.orders, public.checkins to authenticated;
grant select on public.admins to authenticated;

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true)
  on conflict (id) do update set public = true;
drop policy if exists gallery_admin on storage.objects;
create policy gallery_admin on storage.objects for all to authenticated
  using (bucket_id = 'gallery' and public.is_admin())
  with check (bucket_id = 'gallery' and public.is_admin());
