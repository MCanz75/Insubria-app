-- INSUBRIA APP v8 - INVITI, FOTO PROFILO E RIMOZIONE SOCI
-- Eseguire UNA SOLA VOLTA dopo lo schema/migrazione v6 già eseguiti.

create table if not exists public.member_invites (
  email text primary key,
  name text not null,
  phone text,
  role text not null default 'Socio' check (role in ('Socio','Amministratore','Segretario','Presidente')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.member_invites enable row level security;

drop policy if exists "admins manage member invites" on public.member_invites;
create policy "admins manage member invites" on public.member_invites
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Verifica se una email è stata invitata. Non espone i dati dell'invito.
create or replace function public.is_email_invited(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.member_invites
    where lower(email)=lower(trim(p_email))
      and accepted_at is null
  );
$$;
revoke all on function public.is_email_invited(text) from public;
grant execute on function public.is_email_invited(text) to anon, authenticated;

-- Dopo la registrazione, associa l'account all'invito e crea il profilo.
create or replace function public.claim_member_invite(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.member_invites%rowtype;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Utente non autenticato'; end if;
  if lower(coalesce((select email from auth.users where id=uid),'')) <> lower(trim(p_email)) then
    raise exception 'Email non coerente con l''account autenticato';
  end if;
  select * into inv from public.member_invites
    where lower(email)=lower(trim(p_email)) and accepted_at is null
    for update;
  if not found then
    raise exception 'Nessun invito attivo per questa email';
  end if;
  insert into public.profiles(id,name,role,phone,email,is_active)
  values(uid,inv.name,'Socio',inv.phone,lower(trim(p_email)),true)
  on conflict(id) do update set name=excluded.name,phone=excluded.phone,email=excluded.email,is_active=true;
  update public.member_invites set accepted_at=now() where email=inv.email;
  return true;
end;
$$;
revoke all on function public.claim_member_invite(text) from public;
grant execute on function public.claim_member_invite(text) to authenticated;

-- Solo utenti attivi possono modificare il proprio profilo.
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
for update to authenticated
using (id=auth.uid() and is_active=true)
with check (id=auth.uid() and is_active=true);

-- Gli amministratori possono gestire anche i profili inattivi.
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Foto profilo: ogni socio gestisce la propria; l'amministratore può gestire quelle dei soci.
drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects
for insert to authenticated
with check (bucket_id='avatars' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar" on storage.objects
for update to authenticated
using (bucket_id='avatars' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()))
with check (bucket_id='avatars' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects
for delete to authenticated
using (bucket_id='avatars' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
