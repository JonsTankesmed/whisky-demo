"""Bouwt streekgrenzen.js: de wettelijke whiskygebieden van Schotland als SVG-paden.

Grondslag: Scotch Whisky Regulations 2009 (SI 2009/2890), reg. 10(5)-(7).
  - Campbeltown = ward South Kintyre (Argyll and Bute, indeling 2006)
  - Islay        = het eiland Islay
  - Speyside     = acht Moray-wards + ward Badenoch and Strathspey (indeling 2006)
  - Highland / Lowland = noord / zuid van de lijn uit reg. 10(7)

Bronnen (alleen open data, niets overgetekend):
  - wards: ONS 'Wards (December 2016) GCB in Great Britain' (Open Government Licence;
    Contains OS data © Crown copyright and database right). December 2016 is de laatste
    stand voor de herindeling van 2017, dus de wards uit de orders van 2006.
  - ijkpunten van de lijn: Wikidata (CC0).
  - kustlijn: KAART.schotland uit index.html (Natural Earth, publiek domein).

Projectie gelijk aan KAART: x = 310 + (lon+5)*62*cos(57°), y = 380 - (lat-57)*62.

Gebruik:  python tools/streekgrenzen_bouwer.py      (vanuit de whisky-demo-map; vereist shapely)
"""
import json, math, os, re, sys, urllib.parse, urllib.request
from shapely.geometry import Polygon, MultiPolygon, LineString, Point, mapping
from shapely.ops import unary_union, split

HIER = os.path.dirname(os.path.abspath(__file__))
DEMO = os.path.dirname(HIER)
KX = 62 * math.cos(math.radians(57))

def proj(lon, lat):
    return (310 + (lon + 5) * KX, 380 - (lat - 57) * 62)

# ---- kustlijn uit KAART.schotland --------------------------------------------
def schotland():
    s = open(os.path.join(DEMO, "index.html"), encoding="utf8").read()
    i = s.index("var KAART="); j = s.index("\n", i)
    d = json.loads(s[i + 10:j].rstrip(";"))["schotland"]
    ringen = []
    for deel in re.findall(r"M[^MZ]+Z?", d):
        pts = [tuple(map(float, p)) for p in re.findall(r"(-?\d+\.?\d*),(-?\d+\.?\d*)", deel)]
        if len(pts) >= 3:
            ringen.append(Polygon(pts).buffer(0))
    return unary_union(ringen)

# ---- wards (ONS) --------------------------------------------------------------
ONS = ("https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
       "Wards_December_2016_GCB_in_Great_Britain_2022/FeatureServer/0/query")
SPEYSIDE = ["Buckie", "Elgin City North", "Elgin City South", "Fochabers Lhanbryde", "Forres",
            "Heldon and Laich", "Keith and Cullen", "Speyside Glenlivet", "Badenoch and Strathspey"]
CAMPBELTOWN = ["South Kintyre"]

def wards(namen):
    q = urllib.parse.urlencode({
        "where": "wd16nm IN (%s)" % ",".join("'%s'" % n for n in namen),
        "outFields": "wd16nm,lad16nm", "outSR": 4326, "f": "geojson"})
    gj = json.load(urllib.request.urlopen(ONS + "?" + q))
    gevonden = sorted(f["properties"]["wd16nm"] for f in gj["features"])
    if gevonden != sorted(namen):
        sys.exit("Wards ontbreken: %s" % (set(namen) - set(gevonden)))
    vlakken = []
    for f in gj["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for p in polys:
            vlakken.append(Polygon([proj(*c) for c in p[0]], [[proj(*c) for c in r] for r in p[1:]]).buffer(0))
    return unary_union(vlakken)

# ---- Highland-Lowland-lijn, reg. 10(7) ---------------------------------------
# (lat, lon). Ijkpunten uit Wikidata; tussenpunten langs de A91 en de Tay zijn
# plaatsen aan die weg / op die oever. Op deze schaal is 1 px ongeveer 1-2 km.
LIJN = [
    (54.95, -5.30),    # North Channel, vrij van de kust (begin lijn)
    (55.45, -4.75),    # Firth of Clyde, voor de Ayrshire-kust langs
    (55.80, -4.90),    #   (zuidelijke 'foreshore' = de kust zelf; we varen er net langs)
    (55.9500, -4.7667),  # Greenock (Q217831)
    (55.9604, -4.6531),  # Cardross Station (Q5038794)
    (56.0167, -4.3000),  # Earl's Seat, Campsie Fells (Q24648076)
    (56.1388, -3.9180),  # Wallace Monument (Q931796)
    (56.1333, -3.9167),  # Causewayhead — B998 (Q29166238)
    (56.1508, -3.8544),  # Menstrie — A91
    (56.1530, -3.7996),  # Alva
    (56.1533, -3.7419),  # Tillicoultry
    (56.1625, -3.6681),  # Dollar
    (56.1954, -3.6048),  # Yetts o' Muckhart
    (56.2277, -3.4145),  # Milnathort — A91 raakt M90 (Q1009891)
    (56.3509, -3.4013),  # Bridge of Earn — via M90 (Q1016971)
    (56.3651, -3.3550),  # Rhynd — rivier de Earn naar de Tay (Q68816425)
    (56.3517, -3.2383),  # Newburgh — zuidoever Tay
    (56.4142, -3.0361),  # Balmerino
    (56.4237, -2.9811),  # Wormit
    (56.4402, -2.9410),  # Newport-on-Tay
    (56.4467, -2.8796),  # Tayport
    (56.4424, -2.8326),  # Tentsmuir — Noordzee
    (56.44, -2.40),      # op zee
]

def lowland_vlak():
    lijn = [proj(lon, lat) for lat, lon in LIJN]
    (x0, y0), (x1, y1) = lijn[0], lijn[-1]
    # sluit naar het zuiden ruim buiten Schotland
    return Polygon(lijn + [(x1 + 60, y1), (x1 + 60, 640), (x0 - 80, 640), (x0 - 80, y0)]).buffer(0), lijn

def pad(g, nd=1):
    if g.is_empty:
        return ""
    polys = list(g.geoms) if isinstance(g, MultiPolygon) else [g] if isinstance(g, Polygon) else \
            [x for x in getattr(g, "geoms", []) if isinstance(x, Polygon)]
    uit = []
    for p in polys:
        p = p.simplify(0.25)
        if p.is_empty or p.area < 0.4:
            continue
        for r in [p.exterior] + list(p.interiors):
            c = list(r.coords)[:-1]
            uit.append("M" + " L".join("%.*f,%.*f" % (nd, x, nd, y) for x, y in c) + "Z")
    return "".join(uit)

def main():
    land = schotland()
    low, lijnpx = lowland_vlak()
    lowland = land.intersection(low)
    highland = land.difference(low)
    speyside = wards(SPEYSIDE).intersection(land)
    campbeltown = wards(CAMPBELTOWN).intersection(land)
    bowmore = Point(proj(-6.2898, 55.7571))
    islay = [p for p in getattr(land, "geoms", [land]) if p.distance(bowmore) < 1.5]
    islay = unary_union(islay) if islay else Polygon()
    if islay.is_empty:
        sys.exit("Islay niet gevonden in de kustlijn")
    # 'Islands' is geen wettelijke regio: eilanden in Highland, behalve Islay
    delen = sorted(land.geoms, key=lambda p: -p.area)   # [0] = vasteland
    eilanden = unary_union([p for p in delen[1:] if not p.intersects(islay)
                            and p.intersects(highland) and p.area > 2])
    # lijn alleen waar hij over land loopt (op zee volgt hij de kust)
    lijn_land = LineString(lijnpx).intersection(land.buffer(0.6))
    def lijnpad(g):
        ls = list(getattr(g, "geoms", [g]))
        return "".join("M" + " L".join("%.1f,%.1f" % c for c in l.coords) for l in ls if l.length > 0)
    data = {
        "bron": "Scotch Whisky Regulations 2009, reg. 10(5)-(7)",
        "highland": pad(highland), "lowland": pad(lowland), "speyside": pad(speyside),
        "campbeltown": pad(campbeltown), "islay": pad(islay), "islands": pad(eilanden),
        "lijn": lijnpad(lijn_land),
        # labelpunten (lat, lon), handmatig binnen elk gebied gekozen
        "labels": {r: [round(v, 1) for v in proj(lon, lat)] for r, (lat, lon) in {
            "Highland": (57.05, -4.75), "Speyside": (57.75, -3.35), "Lowland": (55.3, -3.2),
            "Islay": (56.0, -6.8), "Campbeltown": (55.02, -5.45), "Island": (58.45, -6.45)}.items()},
    }
    uit = os.path.join(DEMO, "streekgrenzen.js")
    with open(uit, "w", encoding="utf8") as f:
        f.write("/* Gegenereerd door tools/streekgrenzen_bouwer.py — niet met de hand bewerken.\n"
                "   Wettelijke gebieden uit de Scotch Whisky Regulations 2009, reg. 10.\n"
                "   Wards: ONS Wards (Dec 2016), OGL — Contains OS data © Crown copyright and database right.\n"
                "   Kust: Natural Earth (publiek domein). Ijkpunten lijn: Wikidata (CC0). */\n")
        f.write("var KGRENZEN=" + json.dumps(data, ensure_ascii=False) + ";\n")
    print("geschreven:", uit, {k: len(str(v)) for k, v in data.items()})

if __name__ == "__main__":
    main()
