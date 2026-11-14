-- Acties gelden voor alle markten (besluit Jack 20-10 en 05-11-2026: iedereen ziet de actie).
-- Uitvoeren in Supabase → SQL Editor. Mag twee keer worden uitgevoerd.
-- Uitvoeren VOORDAT de bijbehorende versie van acties.js live staat: die bewaart nieuwe acties
-- met markt 'ALLE', en de oude functie laat bezoekers alleen markt 'NL' zien.
-- Raakt: functie ws_actie_loopt (bepaalt wat bezoekers mogen lezen), de standaardwaarde van
-- ws_acties.markt en de bestaande rijen met markt 'NL'. Er wordt niets verwijderd.
-- Geen geheimen in dit bestand.

-- 1. Een actie loopt als hij niet is ingetrokken en vandaag (Nederlandse tijd) binnen de data valt.
--    Het veld markt telt niet meer mee.
create or replace function public.ws_actie_loopt(a public.ws_acties) returns boolean
language sql stable set search_path = public as $$
  select not a.ingetrokken
     and (now() at time zone 'Europe/Amsterdam')::date between a.van and a.tot
$$;

-- 2. Nieuwe acties krijgen standaard markt 'ALLE'.
alter table public.ws_acties alter column markt set default 'ALLE';

-- 3. Bestaande acties op de nieuwe waarde. Elke gewijzigde rij komt in ws_actie_log (trigger);
--    bijgewerkt_door wordt leeg, omdat de SQL Editor geen ingelogd account heeft.
update public.ws_acties set markt = 'ALLE' where markt = 'NL';

-- Controle: verwacht alle acties met markt 'ALLE'.
select slug, markt, van, tot, ingetrokken, public.ws_actie_loopt(ws_acties) as loopt
from public.ws_acties order by van;
