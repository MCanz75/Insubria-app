-- INSUBRIA APP - DATABASE SUPABASE
-- Eseguire tutto nello SQL Editor del progetto Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text default 'Socio',
  phone text,
  email text,
  avatar_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date timestamptz not null,
  location text,
  details text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_attendees (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','yes','no')),
  updated_at timestamptz not null default now(),
  primary key(event_id,user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id=uid and role in ('Presidente','Segretario','Amministratore')); $$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.posts enable row level security;
alter table public.chat_messages enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.documents enable row level security;

-- PROFILE
create policy "members can read active profiles" on public.profiles for select to authenticated using (is_active=true or id=auth.uid());
create policy "users create own profile" on public.profiles for insert to authenticated with check (id=auth.uid());
create policy "users update own profile" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- EVENTS
create policy "members read events" on public.events for select to authenticated using (true);
create policy "admins manage events" on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- RSVP
create policy "members read attendance" on public.event_attendees for select to authenticated using (true);
create policy "users manage own attendance" on public.event_attendees for insert to authenticated with check (user_id=auth.uid());
create policy "users update own attendance" on public.event_attendees for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "users delete own attendance" on public.event_attendees for delete to authenticated using (user_id=auth.uid());

-- BOARD
create policy "members read posts" on public.posts for select to authenticated using (true);
create policy "members create posts" on public.posts for insert to authenticated with check (author_id=auth.uid());
create policy "authors delete posts" on public.posts for delete to authenticated using (author_id=auth.uid() or public.is_admin());

-- CHAT
create policy "members read chat" on public.chat_messages for select to authenticated using (true);
create policy "members create chat" on public.chat_messages for insert to authenticated with check (author_id=auth.uid());
create policy "authors delete chat" on public.chat_messages for delete to authenticated using (author_id=auth.uid() or public.is_admin());

-- GALLERY
create policy "members read photos" on public.gallery_photos for select to authenticated using (true);
create policy "members upload photos" on public.gallery_photos for insert to authenticated with check (owner_id=auth.uid());
create policy "owners delete photos" on public.gallery_photos for delete to authenticated using (owner_id=auth.uid() or public.is_admin());

-- DOCUMENTS
create policy "members read documents" on public.documents for select to authenticated using (true);
create policy "members upload documents" on public.documents for insert to authenticated with check (owner_id=auth.uid());
create policy "owners delete documents" on public.documents for delete to authenticated using (owner_id=auth.uid() or public.is_admin());

-- STORAGE BUCKETS
insert into storage.buckets (id,name,public) values ('avatars','avatars',false) on conflict (id) do nothing;
insert into storage.buckets (id,name,public) values ('gallery','gallery',false) on conflict (id) do nothing;
insert into storage.buckets (id,name,public) values ('documents','documents',false) on conflict (id) do nothing;

-- Storage policies: each user gets access to their own folder; authenticated members can read all shared content.
create policy "members read avatars" on storage.objects for select to authenticated using (bucket_id='avatars');
create policy "users upload own avatar" on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users update own avatar" on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "members read gallery" on storage.objects for select to authenticated using (bucket_id='gallery');
create policy "members upload gallery" on storage.objects for insert to authenticated with check (bucket_id='gallery' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "owners delete gallery" on storage.objects for delete to authenticated using (bucket_id='gallery' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy "members read documents" on storage.objects for select to authenticated using (bucket_id='documents');
create policy "members upload documents" on storage.objects for insert to authenticated with check (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "owners delete documents" on storage.objects for delete to authenticated using (bucket_id='documents' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

-- Realtime
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_attendees;
alter publication supabase_realtime add table public.gallery_photos;
alter publication supabase_realtime add table public.documents;

-- DOPO aver creato il primo account, promuovilo ad amministratore sostituendo l'email:
-- update public.profiles set role='Presidente' where email='tuamail@example.com';

-- V5: sicurezza ruoli. Solo un amministratore può cambiare il campo role.
create or replace function public.prevent_non_admin_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin(auth.uid()) then
    raise exception 'Solo un amministratore può modificare il ruolo di un socio';
  end if;
  if new.role is null or trim(new.role) = '' then
    new.role := 'Socio';
  end if;
  if new.role not in ('Socio','Amministratore','Segretario','Presidente') then
    raise exception 'Ruolo non valido';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_security on public.profiles;
create trigger trg_profiles_role_security
before update on public.profiles
for each row execute function public.prevent_non_admin_role_change();

-- Mantiene Socio come ruolo predefinito per i nuovi profili.
alter table public.profiles alter column role set default 'Socio';
update public.profiles set role='Socio' where role is null or trim(role)='';
