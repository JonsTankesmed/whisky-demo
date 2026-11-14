-- Stappenplan naar de testsite: afvinklijst voor Jack en John (14-11-2026).
-- Uitvoeren in Supabase → SQL Editor. Mag twee keer worden uitgevoerd.
-- Alleen accounts in ws_toegang kunnen lezen en schrijven (RLS, via ws_heeft_toegang()).
-- Wie en wanneer wordt door de database zelf ingevuld, niet door de browser.
-- Elke wijziging komt in ws_stappen_log (alleen toevoegen). Geen geheimen in dit bestand.
create table if not exists public.ws_stappen (
  stap_id text primary key check (stap_id ~ '^[a-z0-9-]{2,40}$'),
  gedaan boolean not null default false,
  door uuid,
  door_naam text,
  op timestamptz not null default now()
);
create table if not exists public.ws_stappen_log (
  id bigint generated always as identity primary key,
  stap_id text not null,
  gedaan boolean not null,
  door uuid,
  door_naam text,
  op timestamptz not null default now()
);

create or replace function public.ws_stappen_stempel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.door := auth.uid();
  new.op := now();
  select t.naam into new.door_naam from ws_toegang t where t.user_id = auth.uid();
  insert into ws_stappen_log(stap_id, gedaan, door, door_naam) values (new.stap_id, new.gedaan, new.door, new.door_naam);
  return new;
end $$;
revoke all on function public.ws_stappen_stempel() from public, anon, authenticated;

drop trigger if exists ws_stappen_stempel on public.ws_stappen;
create trigger ws_stappen_stempel before insert or update on public.ws_stappen
  for each row execute function public.ws_stappen_stempel();

alter table public.ws_stappen enable row level security;
alter table public.ws_stappen_log enable row level security;

drop policy if exists ws_stappen_lezen on public.ws_stappen;
create policy ws_stappen_lezen on public.ws_stappen for select to authenticated using (public.ws_heeft_toegang());
drop policy if exists ws_stappen_invoegen on public.ws_stappen;
create policy ws_stappen_invoegen on public.ws_stappen for insert to authenticated with check (public.ws_heeft_toegang());
drop policy if exists ws_stappen_wijzigen on public.ws_stappen;
create policy ws_stappen_wijzigen on public.ws_stappen for update to authenticated using (public.ws_heeft_toegang()) with check (public.ws_heeft_toegang());
-- Geen delete-policy: een stap terugzetten is uitvinken, niet verwijderen.
drop policy if exists ws_stappen_log_lezen on public.ws_stappen_log;
create policy ws_stappen_log_lezen on public.ws_stappen_log for select to authenticated using (public.ws_heeft_toegang());
-- In het logboek schrijft alleen de trigger.

revoke all on public.ws_stappen, public.ws_stappen_log from anon, authenticated;
grant select, insert, update on public.ws_stappen to authenticated;
grant select on public.ws_stappen_log to authenticated;
