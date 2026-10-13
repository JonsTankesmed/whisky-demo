-- Acties en banners voor de ontdeksite (12-10-2026).
-- Uitvoeren in Supabase → SQL Editor (project fbtsezpjutzhvjodexpa). Mag twee keer worden uitgevoerd.
-- Bezoekers lezen alleen lopende, niet-ingetrokken acties; schrijven alleen accounts in ws_toegang.
-- Elke wijziging komt in ws_actie_log (alleen toevoegen). Geen geheimen in dit bestand.
create table if not exists public.ws_acties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  titel text not null check (char_length(titel) between 2 and 80),
  regel text check (char_length(regel) <= 200),
  knop text check (char_length(knop) <= 40),
  code text check (code ~ '^[A-Za-z0-9_-]{0,30}$'),
  code_pct numeric check (code_pct is null or (code_pct >= 0 and code_pct <= 100)),
  code_niet_op_aanbiedingen boolean not null default true,
  voorwaarden text check (char_length(voorwaarden) <= 200),
  van date not null,
  tot date not null,
  plekken text[] not null default '{}',
  selectie text not null default 'lijst' check (selectie in ('lijst','regel','alles')),
  regel_filter text check (char_length(regel_filter) <= 1000),
  beeld_url text check (beeld_url is null or beeld_url ~ '^https://'),
  beeld_bron text check (char_length(beeld_bron) <= 200),
  beeld_rechten text check (char_length(beeld_rechten) <= 200),
  markt text not null default 'NL',
  ingetrokken boolean not null default false,
  bijgewerkt_door uuid default auth.uid(),
  bijgewerkt_op timestamptz not null default now(),
  check (tot >= van),
  check (plekken <@ array['balk','hoofd','tegel','label']::text[])
);
create table if not exists public.ws_actie_producten (
  actie_id uuid not null references public.ws_acties(id) on delete cascade,
  product_id text not null check (product_id ~ '^[0-9]{1,15}$'),
  toegevoegd_op timestamptz not null default now(),
  primary key (actie_id, product_id)
);
create table if not exists public.ws_actie_log (
  id bigint generated always as identity primary key,
  actie_id uuid,
  handeling text not null,
  rij jsonb,
  door uuid default auth.uid(),
  op timestamptz not null default now()
);

create or replace function public.ws_actie_loopt(a public.ws_acties) returns boolean
language sql stable as $$
  select not a.ingetrokken and a.markt = 'NL'
     and (now() at time zone 'Europe/Amsterdam')::date between a.van and a.tot
$$;

create or replace function public.ws_actie_logger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'ws_acties' then
    insert into ws_actie_log(actie_id, handeling, rij)
    values (coalesce(new.id, old.id), tg_op, case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  else
    insert into ws_actie_log(actie_id, handeling, rij)
    values (coalesce(new.actie_id, old.actie_id), tg_op || ' product',
            jsonb_build_object('product_id', coalesce(new.product_id, old.product_id)));
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists ws_acties_log on public.ws_acties;
create trigger ws_acties_log after insert or update or delete on public.ws_acties
  for each row execute function public.ws_actie_logger();
drop trigger if exists ws_actie_producten_log on public.ws_actie_producten;
create trigger ws_actie_producten_log after insert or delete on public.ws_actie_producten
  for each row execute function public.ws_actie_logger();

create or replace function public.ws_acties_stempel() returns trigger language plpgsql as $$
begin new.bijgewerkt_op := now(); new.bijgewerkt_door := auth.uid(); return new; end $$;
drop trigger if exists ws_acties_stempel on public.ws_acties;
create trigger ws_acties_stempel before update on public.ws_acties
  for each row execute function public.ws_acties_stempel();

alter table public.ws_acties enable row level security;
alter table public.ws_actie_producten enable row level security;
alter table public.ws_actie_log enable row level security;

drop policy if exists ws_acties_publiek on public.ws_acties;
drop policy if exists ws_acties_beheer_lezen on public.ws_acties;
drop policy if exists ws_acties_beheer_schrijven on public.ws_acties;
drop policy if exists ws_acties_beheer_wijzigen on public.ws_acties;
create policy ws_acties_publiek on public.ws_acties for select to anon, authenticated
  using (public.ws_actie_loopt(ws_acties));
create policy ws_acties_beheer_lezen on public.ws_acties for select to authenticated using (public.ws_heeft_toegang());
create policy ws_acties_beheer_schrijven on public.ws_acties for insert to authenticated with check (public.ws_heeft_toegang());
create policy ws_acties_beheer_wijzigen on public.ws_acties for update to authenticated using (public.ws_heeft_toegang()) with check (public.ws_heeft_toegang());

drop policy if exists ws_actie_producten_publiek on public.ws_actie_producten;
drop policy if exists ws_actie_producten_beheer_lezen on public.ws_actie_producten;
drop policy if exists ws_actie_producten_beheer_toevoegen on public.ws_actie_producten;
drop policy if exists ws_actie_producten_beheer_verwijderen on public.ws_actie_producten;
create policy ws_actie_producten_publiek on public.ws_actie_producten for select to anon, authenticated
  using (exists (select 1 from public.ws_acties a where a.id = actie_id and public.ws_actie_loopt(a)));
create policy ws_actie_producten_beheer_lezen on public.ws_actie_producten for select to authenticated using (public.ws_heeft_toegang());
create policy ws_actie_producten_beheer_toevoegen on public.ws_actie_producten for insert to authenticated with check (public.ws_heeft_toegang());
create policy ws_actie_producten_beheer_verwijderen on public.ws_actie_producten for delete to authenticated using (public.ws_heeft_toegang());

drop policy if exists ws_actie_log_lezen on public.ws_actie_log;
create policy ws_actie_log_lezen on public.ws_actie_log for select to authenticated using (public.ws_heeft_toegang());

revoke all on public.ws_acties, public.ws_actie_producten, public.ws_actie_log from anon;
grant select on public.ws_acties, public.ws_actie_producten to anon;
grant select, insert, update on public.ws_acties to authenticated;
grant select, insert, delete on public.ws_actie_producten to authenticated;
grant select on public.ws_actie_log to authenticated;
