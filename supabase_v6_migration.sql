-- INSUBRIA APP v6 - MIGRAZIONE SICUREZZA E PERMESSI
-- Eseguire UNA SOLA VOLTA nel SQL Editor del progetto Supabase
-- dopo lo schema base/v5 già eseguito.

-- 1) Ruoli: solo un amministratore può assegnare/modificare i ruoli.
--    Un nuovo profilo nasce sempre come Socio.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin(auth.uid()) then
      new.role := 'Socio';
    end if;
    if new.role is null or trim(new.role) = '' then
      new.role := 'Socio';
    end if;
  else
    if not public.is_admin(auth.uid()) then
      if new.role is distinct from old.role then
        raise exception 'Solo un amministratore può modificare il ruolo di un socio';
      end if;
      if new.is_active is distinct from old.is_active then
        raise exception 'Solo un amministratore può modificare lo stato del socio';
      end if;
      if new.email is distinct from old.email then
        raise exception 'Solo un amministratore può modificare l email del profilo';
      end if;
      if new.avatar_path is distinct from old.avatar_path then
        raise exception 'Solo un amministratore può modificare la foto del profilo';
      end if;
    end if;
  end if;

  if new.role not in ('Socio','Amministratore','Segretario','Presidente') then
    raise exception 'Ruolo non valido';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_security on public.profiles;
drop trigger if exists trg_profiles_v6_security on public.profiles;
create trigger trg_profiles_v6_security
before insert or update on public.profiles
for each row execute function public.protect_profile_fields();

alter table public.profiles alter column role set default 'Socio';
update public.profiles set role='Socio' where role is null or trim(role)='';

-- 2) Bacheca: solo gli amministratori possono creare/modificare/cancellare.
drop policy if exists "members create posts" on public.posts;
drop policy if exists "authors delete posts" on public.posts;
drop policy if exists "admins manage posts" on public.posts;
create policy "admins manage posts" on public.posts
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3) Chat: tutti i soci possono inviare; solo gli amministratori possono cancellare.
drop policy if exists "authors delete chat" on public.chat_messages;
drop policy if exists "admins delete chat" on public.chat_messages;
create policy "admins delete chat" on public.chat_messages
for delete to authenticated using (public.is_admin());

-- 4) Galleria: solo gli amministratori possono caricare/cancellare.
drop policy if exists "members upload photos" on public.gallery_photos;
drop policy if exists "owners delete photos" on public.gallery_photos;
drop policy if exists "admins manage photos" on public.gallery_photos;
create policy "admins manage photos" on public.gallery_photos
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5) Documenti: solo gli amministratori possono caricare/cancellare.
drop policy if exists "members upload documents" on public.documents;
drop policy if exists "owners delete documents" on public.documents;
drop policy if exists "admins manage documents" on public.documents;
create policy "admins manage documents" on public.documents
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 6) Storage Galleria: solo amministratori in upload/delete, tutti i soci possono leggere.
drop policy if exists "members upload gallery" on storage.objects;
drop policy if exists "owners delete gallery" on storage.objects;
drop policy if exists "admins manage gallery storage" on storage.objects;
create policy "admins manage gallery storage" on storage.objects
for all to authenticated
using (bucket_id='gallery' and public.is_admin())
with check (bucket_id='gallery' and public.is_admin());

-- 7) Storage Documenti: solo amministratori in upload/delete, tutti i soci possono leggere.
drop policy if exists "members upload documents" on storage.objects;
drop policy if exists "owners delete documents" on storage.objects;
drop policy if exists "admins manage documents storage" on storage.objects;
create policy "admins manage documents storage" on storage.objects
for all to authenticated
using (bucket_id='documents' and public.is_admin())
with check (bucket_id='documents' and public.is_admin());
