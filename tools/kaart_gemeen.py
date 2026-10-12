"""Gedeelde hulpfuncties voor de kaartbouwers (kaart_bouwer.py, streekgrenzen_bouwer.py)."""
import json, os, re, unicodedata, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
DEMO = os.path.dirname(HIER)
CACHE = os.path.join(DEMO, "cache", "natural-earth")
NE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/"

# Catalogusland -> sleutel op de kaart (één sleutel per kaartland)
LANDSLEUTEL = {"England": "Engeland", "Ca": "Canada", "Fillipines": "Filipijnen"}
# Natural Earth GU_A3 -> kaartsleutel (alleen landen uit de catalogus)
NE_LAND = {"SCT": "Schotland", "ENG": "Engeland", "WLS": "Wales", "NIR": "Ierland", "IRL": "Ierland",
           "USA": "Amerika", "JPN": "Japan", "NLD": "Nederland", "IND": "India", "ISR": "Israël",
           "FRA": "Frankrijk", "TWN": "Taiwan", "CHE": "Zwitserland", "CAN": "Canada", "BEL": "België",
           "AUS": "Australië", "DNK": "Denemarken", "ITA": "Italië", "DEU": "Duitsland", "ESP": "Spanje",
           "NZL": "Nieuw-Zeeland", "SWE": "Zweden", "CHN": "China", "ISL": "IJsland", "MEX": "Mexico",
           "ZAF": "Zuid-Afrika", "PHL": "Filipijnen", "JAM": "Jamaica", "BLZ": "Belize", "BRB": "Barbados",
           "GUY": "Guyana", "GLP": "Guadeloupe"}

def kluis_export():
    for p in (os.environ.get("WS_KLUIS", ""), r"C:\Obsidian\Whiskysite",
              os.path.join(os.path.dirname(DEMO), "Whiskysite")):
        f = os.path.join(p, "_Export", "distilleerderij-locaties.json")
        if p and os.path.exists(f):
            return f
    raise SystemExit("distilleerderij-locaties.json niet gevonden; zet WS_KLUIS naar de kluismap")

def ne(naam):
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, naam + ".geojson")
    if not os.path.exists(f):
        urllib.request.urlretrieve(NE_URL + naam + ".geojson", f)
    return json.load(open(f, encoding="utf8"))

def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(distillery|distilleries|distillers?|the|whisky|whiskey)\b", " ", s)
    return re.sub(r"[^a-z0-9]", "", s)

def distilleerderijen():
    """Geplaatste records uit de kluisexport, gegroepeerd per Wikidata-item."""
    d = json.load(open(kluis_export(), encoding="utf8"))
    groep = {}
    for r in d["records"]:
        if r.get("status") != "geplaatst":
            continue
        g = groep.setdefault(r["qid"], {"id": r["qid"], "lon": r["lon"], "lat": r["lat"],
                                        "wd": r.get("wikidata_naam", ""), "namen": [], "_fl": {}})
        g["namen"].append(r["naam"]); g["_fl"][r["naam"]] = g["_fl"].get(r["naam"], 0) + r["flessen"]
    uit = []
    for g in groep.values():
        g["namen"].sort(key=lambda n: -g["_fl"][n])
        g["naam"] = g["namen"][0]
        if g["wd"] and all(norm(g["wd"]) != norm(n) for n in g["namen"]):
            g["bij"] = re.sub(r"\s*\(.*?\)\s*", "", g["wd"]).strip()   # 'gemaakt bij' (Wikidata-naam)
        del g["_fl"], g["wd"]
        uit.append(g)
    return uit, d["records"]
