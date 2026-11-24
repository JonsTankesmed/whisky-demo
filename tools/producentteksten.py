#!/usr/bin/env python3
"""Maakt producentteksten.js: een eigen Nederlandse productomschrijving voor flessen zonder
Nederlandse winkeltekst, op basis van feiten en smaakwoorden van distilleerderij, bottelaar,
importeur of leverancier.

Waarom zo (besluiten John 2026-11-23):
- De zinnen van de bron worden NIET vertaald of geparafraseerd (auteursrecht). Uit de ruwe tekst
  komen alleen feiten (vat, finish, ppm, vatsterkte, niet koudgefilterd) en losse smaakwoorden uit
  een vaste woordenlijst. De tekst zelf is een vaste opbouw: inleiding uit feiten, dan
  Neus / Smaak / Afdronk als opsomming van smaakwoorden.
- De bron staat erbij zoals hij is (distilleerderij, bottelaar, importeur of leverancier).
- Smaakassen alleen boven een drempel en alleen waar de catalogus nog geen assen heeft;
  per as aan of uit na toetsing (zie ASSEN_AAN).
- Een bron is pas zichtbaar voor bezoekers als Jack zijn steekproef heeft goedgekeurd
  (OORDELEN.prodJa / prodNee uit oordelen-jack.js). Tot dan: wacht = alleen in beheer.

Ruwe bronnen staan buiten de repo: C:\\Obsidian\\_Bouw\\whisky-pijplijn\\producentbron\\ruw\\<id>.json

Gebruik (vanuit whisky-demo):
    python tools/producentteksten.py C:/Obsidian/_Bouw/whisky-pijplijn/producentbron producentteksten.js
    python tools/producentteksten.py <bronmap> producentteksten.js --toets   (alleen de assentoets)
"""
import json
import re
import sys
import zlib
from collections import Counter, defaultdict
from pathlib import Path

# ---------------------------------------------------------------- woordenlijst
# Engels/Nederlands smaakwoord -> Nederlandse weergave. Alleen wat hier staat komt in de tekst.
# Volgorde in de tekst = volgorde van voorkomen in de bron; dubbelen vallen weg.
WOORDEN = {
    # zoet
    "vanilla": "vanille", "vanille": "vanille", "honey": "honing", "honing": "honing",
    "heather honey": "heidehoning", "caramel": "karamel", "karamel": "karamel",
    "toffee": "toffee", "butterscotch": "butterscotch", "fudge": "fudge",
    "brown sugar": "bruine suiker", "bruine suiker": "bruine suiker", "molasses": "melasse",
    "treacle": "stroop", "stroop": "stroop", "syrup": "siroop", "maple": "ahornsiroop", "maple syrup": "ahornsiroop",
    "chocolate": "chocolade", "chocolade": "chocolade", "dark chocolate": "pure chocolade",
    "milk chocolate": "melkchocolade", "cocoa": "cacao", "cacao": "cacao", "marzipan": "marsepein",
    "marsepein": "marsepein", "nougat": "nougat", "custard": "vanillevla", "creme brulee": "crème brûlée",
    "crème brûlée": "crème brûlée", "candyfloss": "suikerspin", "liquorice": "zoethout",
    "licorice": "zoethout", "zoethout": "zoethout", "shortbread": "boterkoek", "biscuit": "biscuit",
    "pastry": "gebak", "gebak": "gebak", "cake": "cake", "fruitcake": "vruchtencake",
    "christmas cake": "kerstcake", "brioche": "brioche", "malt": "mout", "malty": "mout",
    "mout": "mout", "cereal": "granen", "granen": "granen", "barley": "gerst", "gerst": "gerst",
    "oat": "haver", "porridge": "havermout", "bread": "brood", "toast": "toast", "honeycomb": "honingraat",
    "honingraat": "honingraat", "sweet": "zoet", "zoet": "zoet", "cream": "room", "creamy": "romig",
    "butter": "boter", "buttery": "boterig", "boter": "boter",
    # fruit
    "apple": "appel", "appel": "appel", "green apple": "groene appel", "baked apple": "gebakken appel",
    "pear": "peer", "peer": "peer", "citrus": "citrus", "lemon": "citroen", "citroen": "citroen",
    "lime": "limoen", "limoen": "limoen", "orange": "sinaasappel", "sinaasappel": "sinaasappel",
    "orange peel": "sinaasappelschil", "orange blossom": "sinaasappelbloesem",
    "orange zest": "sinaasappelschil", "grapefruit": "grapefruit", "mandarin": "mandarijn",
    "tangerine": "mandarijn", "apricot": "abrikoos", "abrikoos": "abrikoos", "peach": "perzik",
    "perzik": "perzik", "banana": "banaan", "banaan": "banaan", "pineapple": "ananas", "ananas": "ananas",
    "mango": "mango", "passion fruit": "passievrucht", "coconut": "kokos", "kokos": "kokos",
    "tropical fruit": "tropisch fruit", "tropisch fruit": "tropisch fruit", "melon": "meloen",
    "cherry": "kers", "cherries": "kers", "kers": "kers", "plum": "pruim", "pruim": "pruim",
    "prune": "gedroogde pruim", "raisin": "rozijn", "raisins": "rozijn", "rozijn": "rozijn",
    "sultana": "sultana", "fig": "vijg", "figs": "vijg", "vijg": "vijg", "date": "dadel", "dates": "dadel",
    "dadel": "dadel", "berries": "bessen", "red berries": "rode bessen", "blackcurrant": "zwarte bes",
    "blackberry": "braam", "raspberry": "framboos", "framboos": "framboos", "strawberry": "aardbei",
    "aardbei": "aardbei", "redcurrant": "rode bes", "cranberry": "cranberry", "dried fruit": "gedroogd fruit",
    "gedroogd fruit": "gedroogd fruit", "stewed fruit": "gestoofd fruit", "orchard fruit": "boomgaardfruit",
    "marmalade": "marmelade", "marmelade": "marmelade", "jam": "jam", "grape": "druif", "druif": "druif",
    "quince": "kweepeer", "gooseberry": "kruisbes", "fruity": "fruitig", "fruitig": "fruitig",
    # kruidig
    "spice": "specerijen", "spices": "specerijen", "spicy": "kruidig", "kruidig": "kruidig",
    "specerijen": "specerijen", "pepper": "peper", "peper": "peper", "black pepper": "zwarte peper",
    "white pepper": "witte peper", "cinnamon": "kaneel", "kaneel": "kaneel", "ginger": "gember",
    "gember": "gember", "nutmeg": "nootmuskaat", "nootmuskaat": "nootmuskaat", "clove": "kruidnagel",
    "cloves": "kruidnagel", "kruidnagel": "kruidnagel", "aniseed": "anijs", "anise": "anijs",
    "anijs": "anijs", "star anise": "steranijs", "cardamom": "kardemom", "kardemom": "kardemom",
    "allspice": "piment", "chilli": "chili", "mint": "munt", "munt": "munt", "menthol": "menthol",
    "eucalyptus": "eucalyptus", "herbal": "kruiden", "herbs": "kruiden",
    # hout, noot, overig
    "oak": "eikenhout", "eikenhout": "eikenhout", "toasted oak": "getoast eikenhout",
    "charred oak": "gebrand eikenhout", "sandalwood": "sandelhout", "cedar": "ceder", "leather": "leer",
    "leer": "leer", "tobacco": "tabak", "tabak": "tabak", "coffee": "koffie", "koffie": "koffie",
    "espresso": "espresso", "walnut": "walnoot", "walnoot": "walnoot", "hazelnut": "hazelnoot",
    "hazelnoot": "hazelnoot", "almond": "amandel", "almonds": "amandel", "amandel": "amandel",
    "nuts": "noten", "nutty": "nootachtig", "noten": "noten", "pecan": "pecannoot", "polish": "boenwas",
    "beeswax": "bijenwas", "wax": "was", "floral": "bloemig", "bloemig": "bloemig", "heather": "heide",
    "heide": "heide", "rose": "roos", "violet": "viooltje", "grass": "gras", "grassy": "grasachtig",
    "gras": "gras", "hay": "hooi", "hooi": "hooi", "green tea": "groene thee", "tea": "thee",
    "sherry": "sherry", "wine": "wijn", "port": "port", "rum": "rum",
    # rook en zee
    "peat": "turf", "peaty": "turf", "turf": "turf", "smoke": "rook", "smoky": "rook", "smoked": "rook",
    "rook": "rook", "rokerig": "rook", "bonfire": "kampvuur", "campfire": "kampvuur", "kampvuur": "kampvuur",
    "ash": "as", "iodine": "jodium", "jodium": "jodium", "medicinal": "medicinaal", "medicinaal": "medicinaal",
    "tar": "teer", "teer": "teer", "tarry": "teer", "embers": "smeulend vuur", "charcoal": "houtskool",
    "bbq": "barbecue", "barbecue": "barbecue", "sea salt": "zeezout", "salt": "zout", "salty": "zilt",
    "zout": "zout", "zilt": "zilt", "brine": "pekel", "briny": "pekel", "seaweed": "zeewier",
    "zeewier": "zeewier", "maritime": "maritiem", "maritiem": "maritiem", "sea spray": "zeenevel",
    "mineral": "mineraal", "mineraal": "mineraal",
}
# Na de controle van 2026-11-24 eruit: woorden die vaker een vat, grondstof, proces of iets
# anders aanduiden dan een smaak ('date back', 'single malt', 'barley sugar', 'maple charcoal').
for _w in ("sherry", "wine", "port", "rum", "malt", "mout", "barley", "gerst", "maple", "charcoal",
           "date", "dates", "sea spray", "cereal", "granen", "oat", "sweet", "zoet", "smoked"):
    WOORDEN.pop(_w, None)
TAALGEBONDEN = {"as": "nl", "rose": "en", "tea": "en"}
ONTKENNING = re.compile(r"\b(geen|niet|zonder|nauwelijks|never|not|no|without|unpeated|non-peated)\b", re.I)

# Asindeling voor de smaakassen (rook, zoet, fruit, kruid), op de Nederlandse weergave.
ASWOORD = {
    0: {"turf", "rook", "kampvuur", "jodium", "medicinaal", "teer", "smeulend vuur", "houtskool", "barbecue", "as"},
    1: {"vanille", "honing", "heidehoning", "karamel", "toffee", "butterscotch", "fudge", "bruine suiker",
        "melasse", "stroop", "siroop", "ahornsiroop", "chocolade", "melkchocolade", "marsepein", "nougat",
        "vanillevla", "crème brûlée", "suikerspin", "zoet", "honingraat", "boterkoek"},
    2: {"appel", "groene appel", "gebakken appel", "peer", "citrus", "citroen", "limoen", "sinaasappel",
        "sinaasappelschil", "grapefruit", "mandarijn", "abrikoos", "perzik", "banaan", "ananas", "mango",
        "passievrucht", "tropisch fruit", "meloen", "kers", "pruim", "gedroogde pruim", "rozijn", "sultana",
        "vijg", "dadel", "bessen", "rode bessen", "zwarte bes", "braam", "framboos", "aardbei", "rode bes",
        "gedroogd fruit", "gestoofd fruit", "boomgaardfruit", "marmelade", "druif", "kweepeer", "fruitig"},
    3: {"specerijen", "kruidig", "peper", "zwarte peper", "witte peper", "kaneel", "gember", "nootmuskaat",
        "kruidnagel", "anijs", "steranijs", "kardemom", "piment", "chili"},
}
# Drempel: zoveel verschillende woorden van een as nodig voordat de as een waarde krijgt.
DREMPEL = 2
# Welke assen mee mogen, vastgesteld met --toets (zie rapportage in de commit). Rook is de enige
# as die tegen een onafhankelijk veld getoetst kan worden; de rest gaat pas aan na toetsing.
ASSEN_AAN = [False, False, False, False]

def _kop(woorden):
    """Een kopje is een kopje: aan het begin van een regel, of direct gevolgd door een dubbele punt.
    'Port Wood Finish' midden in een zin is geen afdronk."""
    return re.compile(r"(?:(?:^|\n)[ \t]*[-•*]?[ \t]*(?:" + woorden + r")\b[ \t]*[:\-–]?"
                      r"|\b(?:" + woorden + r")[ \t]*:)", re.I)


SECTIES = [
    ("Neus", _kop(r"nose|on the nose|aroma|neus")),
    ("Smaak", _kop(r"palate|taste|on the palate|mouth|smaak")),
    ("Afdronk", _kop(r"finish|afdronk")),
]

# Eén naam per bron, zoals de bezoeker hem moet zien (agents schreven soms een toevoeging).
BRONNAAM = {"Wm Cadenhead's": "Cadenhead", "Wm Cadenhead": "Cadenhead", "Tomatin (Cù Bòcan)": "Tomatin",
            "Johnnie Walker (Diageo)": "Johnnie Walker", "Suntory Global Spirits (eigenaar Bowmore)": "Suntory Global Spirits",
            "Brave New Spirits (Cask Noir)": "Brave New Spirits"}

SOORT_TEKST = {"distilleerderij": "distilleerderij", "bottelaar": "bottelaar",
               "importeur": "importeur", "leverancier": "leverancier"}


def laad_js(pad, var=None):
    t = Path(pad).read_text(encoding="utf-8")
    t = t[t.index("=", t.index("var ")) + 1:].strip().rstrip(";")
    return json.loads(t)


def taal(t):
    nl = len(re.findall(r"\b(de|het|een|van|met|voor|wordt|deze)\b", t, re.I))
    en = len(re.findall(r"\b(the|and|with|from|this|that|which|of)\b", t, re.I))
    return "nl" if nl > en else "en"


def woorden_in(stuk, tl):
    """Smaakwoorden in volgorde van voorkomen, langste eerst gematcht, ontkenning eruit."""
    gevonden = []
    bezet = []
    for w in sorted(WOORDEN, key=len, reverse=True):
        if TAALGEBONDEN.get(w) and TAALGEBONDEN[w] != tl:
            continue
        for m in re.finditer(r"(?<![\w-])" + re.escape(w) + r"(?:s|es)?(?![\w-])", stuk, re.I):
            if any(a <= m.start() < b for a, b in bezet):
                continue
            voor = stuk[max(0, m.start() - 25):m.start()]
            if ONTKENNING.search(voor):
                continue
            bezet.append((m.start(), m.end()))
            gevonden.append((m.start(), WOORDEN[w]))
    uit = []
    for _, nl in sorted(gevonden):
        if nl not in uit:
            uit.append(nl)
    return uit


def secties(ruw):
    """Knipt de ruwe tekst in neus/smaak/afdronk als die kopjes erin staan."""
    hits = []
    for naam, rx in SECTIES:
        for m in rx.finditer(ruw):
            hits.append((m.start(), m.end(), naam))
    hits.sort()
    # alleen de eerste keer dat elk kopje voorkomt, en in een logische volgorde
    gezien, gekozen = set(), []
    for a, b, naam in hits:
        if naam not in gezien:
            gezien.add(naam)
            gekozen.append((a, b, naam))
    if len(gekozen) < 2:
        return None
    uit = {}
    for i, (a, b, naam) in enumerate(gekozen):
        # stop bij het volgende kopje, een lege regel of na 300 tekens
        eind = gekozen[i + 1][0] if i + 1 < len(gekozen) else len(ruw)
        stuk = ruw[b:min(eind, b + 300)]
        leeg = re.search(r"\n[ \t]*\n", stuk)
        stuk = stuk[:leeg.start()] if leeg else stuk
        # ook een andere kopregel ('Maturation', 'PEATY SWEETNESS…') sluit de sectie af
        kop = re.search(r"\n[ \t]*[A-Z][A-Za-z'&]+(?:[ \t]+[A-Za-z'&]+){0,5}[ \t]*:?[ \t]*(?:\n|$)", stuk[1:])
        uit[naam] = stuk[:kop.start() + 1] if kop else stuk
    return uit


def opsomming(w, n=5):
    w = w[:n]
    t = w[0] if len(w) == 1 else ", ".join(w[:-1]) + " en " + w[-1]
    return t[:1].upper() + t[1:]


def vaten(cask):
    """'Ex-Bourbon & Sherry' -> 'ex-bourbon- en sherryvaten'; 'Port' -> 'portvaten'."""
    delen = [d.strip().lower() for d in cask.split("&") if d.strip()]
    heel = ("vat", "butt", "hogshead", "barrel", "cask", "oak", "puncheon")
    uit = []
    for i, d in enumerate(delen):
        if any(h in d for h in heel):
            uit.append(d)
        elif i < len(delen) - 1:
            uit.append(d + "-")
        else:
            uit.append(d + "vaten")
    if len(uit) == 1:
        return uit[0]
    return ", ".join(uit[:-1]) + " en " + uit[-1]


def feiten(ruw, p):
    r = ruw.lower()
    f = {}
    m = re.search(r"(\d{1,3})\s*ppm", r)
    if m:
        f["ppm"] = int(m.group(1))
    if re.search(r"non[- ]chill[- ]filtered|niet koud ?gefilterd|unchillfiltered|un-chill", r):
        f["nck"] = True
    if re.search(r"natural colou?r|no (added )?colou?r|zonder kleurstof|natuurlijke kleur", r):
        f["kleur"] = True
    if re.search(r"cask strength|vatsterkte|barrel proof", r) or re.search(r"cask strength", p["name"], re.I):
        f["vs"] = True
    m = re.search(r"finish(?:ed)? in ([a-z\- ]{3,30}?)(?: casks?| barrels?| butts?|[.,])", r)
    if m:
        f["finish"] = m.group(1).strip()
    return f


STREKEN = ("highland", "speyside", "islay", "lowland", "campbeltown", "islands")


def inleiding(p, f, ruw="", soort_bron=""):
    n = p["name"].lower()
    us = p.get("country") in ("Amerika", "Ierland") or "whiskey" in n
    if "single malt" in n:
        soort = "Single malt"
    elif "blended malt" in n:
        soort = "Blended malt"
    elif "single grain" in n:
        soort = "Single grain"
    elif "bourbon" in n:
        soort = "Bourbon"
    elif re.search(r"\brye\b", n):
        soort = "Rye whiskey"
    elif "blend" in n:
        soort = "Blended " + ("whiskey" if us else "whisky")
    else:
        soort = "Whiskey" if us else "Whisky"
    # onder 40% of als de bron een likeur noemt: geen whisky (EU-definitie)
    abv = float((p.get("abv") or "40").replace("%", "").replace(",", ".") or 40)
    if abv < 40 or re.search(r"\bliqueur\b|\blikeur\b", ruw, re.I):
        soort = "Whiskeylikeur" if us else "Whiskylikeur"
    r = ruw.lower()
    regio = p.get("region") or ""
    # noemt de bron een andere streek en niet de onze, dan alleen het land
    ander = [x for x in STREKEN if re.search(r"\b" + x + r"\b", r) and x != regio.lower()]
    if regio.lower() in STREKEN and ander and not re.search(r"\b" + re.escape(regio.lower()) + r"\b", r):
        regio = p.get("country") or ""
    waar = regio if regio == p.get("country") else f'{regio}, {p.get("country")}'
    # een bottelaar die de distilleerderij niet noemt (of geheim houdt): niet invullen
    dist = p["dist"] if p.get("dist") and p["dist"] != "Onbekend" else ""
    if dist and soort_bron != "distilleerderij" and dist.split()[0].lower() not in r:
        dist = ""
    if re.search(r"closely guarded secret|undisclosed|secret distillery|geheime distilleerderij", r):
        dist = ""
    delen = [f"{soort} van {dist} uit {waar}"] if dist else [f"{soort} uit {waar}"]
    # Het vat staat in de specificatietabel. In de zin noemde de catalogus vaak maar één vat waar
    # de bron er meer noemt (hercontrole 2026-11-24); daarom hier alleen de leeftijd.
    if p.get("age") and p["age"] != "NAS":
        delen.append(f"{p['age'].replace(' jr', '')} jaar gerijpt")
    zin1 = ", ".join(delen) + "."
    extra = []
    if p.get("abv"):
        extra.append(f"Gebotteld op {p['abv']}" + (" (vatsterkte)" if f.get("vs") else ""))
    if f.get("nck"):
        extra.append("niet koudgefilterd")
    if f.get("kleur"):
        extra.append("zonder toegevoegde kleurstof")
    if f.get("ppm"):
        extra.append(f"turf rond {f['ppm']} ppm")
    zin2 = (", ".join(extra) + ".") if extra else ""
    zin2 = zin2[:1].upper() + zin2[1:]
    return (zin1 + " " + zin2).strip()


def tekst_voor(p, bron):
    ruw = bron.get("ruw") or ""
    tl = taal(ruw)
    sec = secties(ruw)
    blokken = []
    alle = []
    if sec:
        for naam in ("Neus", "Smaak", "Afdronk"):
            if naam in sec:
                w = woorden_in(sec[naam], tl)
                if w:
                    blokken.append({"k": naam, "t": opsomming(w) + "."})
                    alle += w
    if len(set(alle)) < 3:
        return None, None
    f = feiten(ruw, p)
    tekst = [{"t": inleiding(p, f, ruw, (bron.get("bron") or {}).get("soort", ""))}] + blokken
    assen = []
    for i in range(4):
        n = len(set(alle) & ASWOORD[i])
        assen.append(None if n < DREMPEL else min(5, 1 + n))
    # rook expliciet ontkend of geen rookwoord: 0 alleen als de bron dat zegt
    if assen[0] is None and re.search(r"\b(unpeated|non-peated|ongeturfd|no peat|geen turf)\b", ruw, re.I):
        assen[0] = 0
    return tekst, assen


def steekproef(ids, n=5):
    return set(sorted(ids, key=lambda i: zlib.crc32(i.encode()))[:n])


def main():
    bronmap, doel = Path(sys.argv[1]), sys.argv[2]
    toets = "--toets" in sys.argv
    cat = {p["id"]: p for p in laad_js("catalogus-lokaal.js")}
    oord = laad_js("oordelen-jack.js") if Path("oordelen-jack.js").exists() else {}
    ja, nee = set(oord.get("prodJa", [])), set(oord.get("prodNee", []))

    per_bron = defaultdict(list)
    items = {}
    tel = Counter()
    toetsrij = []
    for f in sorted((bronmap / "ruw").glob("*.json")):
        try:
            r = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            tel["onleesbaar"] += 1
            continue
        tel["status " + r.get("status", "?")] += 1
        if r.get("status") != "gekoppeld" or r.get("zekerheid") != "hoog":
            continue
        p = cat.get(str(r["id"]))
        b = r.get("bron") or {}
        if not p or not b.get("naam") or not b.get("url") or not r.get("ruw"):
            tel["onvolledig"] += 1
            continue
        tekst, assen = tekst_voor(p, r)
        if not tekst:
            tel["te weinig smaakwoorden"] += 1
            continue
        if p.get("t"):
            toetsrij.append((p["t"], assen, p["name"]))
        b = dict(b, naam=BRONNAAM.get(b["naam"], b["naam"]))
        it = {"b": b["naam"], "u": b["url"], "d": b.get("datum", ""), "x": tekst}
        if not p.get("t") and any(a is not None and ASSEN_AAN[i] for i, a in enumerate(assen)):
            it["a"] = [a if ASSEN_AAN[i] else None for i, a in enumerate(assen)]
        items[p["id"]] = it
        per_bron[(b["naam"], SOORT_TEKST.get(b.get("soort"), "bron"))].append(p["id"])
        tel["tekst gemaakt"] += 1

    # samples volgen hun hoofdfles als die een tekst kreeg
    for p in cat.values():
        if p.get("_sample") and p.get("_ouder") in items and p["id"] not in items:
            items[p["id"]] = dict(items[p["_ouder"]], v=p["_ouder"])
            items[p["id"]].pop("a", None)
            tel["sample via hoofdfles"] += 1

    bronnen = {}
    for (naam, soort), ids in per_bron.items():
        sp = steekproef(ids)
        for i in sp:
            items[i]["s"] = 1
        beoordeeld = [i for i in sp if i in ja or i in nee]
        vrij = len(beoordeeld) == len(sp) and sum(1 for i in sp if i in nee) <= 1
        bronnen[naam] = {"s": soort, "w": 0 if vrij else 1}
    for i in nee:
        if i in items:
            items[i]["n"] = 1

    if toets:
        print("Assentoets: catalogusassen tegen afgeleide assen (alleen flessen die beide hebben)")
        for i, naam in enumerate(["rook", "zoet", "fruit", "kruid"]):
            paren = [(t[i], a[i]) for t, a, _ in toetsrij if a and a[i] is not None and t[i] is not None]
            if not paren:
                print(f"  {naam:6s} geen paren")
                continue
            dicht = sum(1 for x, y in paren if abs(x - y) <= 1)
            print(f"  {naam:6s} {len(paren):4d} paren, binnen 1 punt: {dicht}/{len(paren)} ({dicht/len(paren):.0%})")
        return

    kop = ("/* Eigen Nederlandse productteksten op basis van informatie van distilleerderij, bottelaar,\n"
           "   importeur of leverancier. Alleen feiten en smaakwoorden uit de bron; de zinnen zijn eigen opbouw.\n"
           "   Gegenereerd door tools/producentteksten.py — niet met de hand bijwerken. */\n")
    Path(doel).write_text(kop + "var PRODUCENTTEKST=" +
                          json.dumps({"bronnen": bronnen, "p": items}, ensure_ascii=False, separators=(",", ":")) + ";\n",
                          encoding="utf-8", newline="\n")
    for k, n in sorted(tel.items()):
        print(f"  {k:28s} {n}")
    print(f"  {'bronnen':28s} {len(bronnen)} (vrijgegeven: {sum(1 for b in bronnen.values() if not b['w'])})")
    print(f"-> {doel}")


if __name__ == "__main__":
    main()
