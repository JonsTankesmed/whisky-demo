-- Triggerfunctie ws_actie_logger() niet meer van buitenaf aanroepbaar (14-11-2026).
-- Uitvoeren in Supabase → SQL Editor. Mag twee keer worden uitgevoerd.
-- Aanleiding: de waarschuwing van Supabase dat deze functie (security definer) zonder inloggen
-- aanroepbaar is. De functie is alleen bedoeld als trigger op ws_acties en ws_actie_producten.
-- Raakt: alleen het recht om de functie rechtstreeks aan te roepen. De triggers blijven werken;
-- een trigger heeft dit recht niet nodig. Er verandert niets aan tabellen, rijen of policies.
-- Geen geheimen in dit bestand.
revoke execute on function public.ws_actie_logger() from public, anon, authenticated;

-- Zelfde soort functie (geen security definer, dus geen waarschuwing). Ook gesloten op 15-11-2026.
revoke execute on function public.ws_acties_stempel() from public, anon, authenticated;

-- Controle: verwacht alleen postgres en service_role bij beide functies.
select p.proname, p.proacl::text as rechten
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('ws_actie_logger', 'ws_acties_stempel');
