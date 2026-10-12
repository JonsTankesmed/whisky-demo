"""Bouwt streekgrenzen.js: de kaart van Schotland met de wettelijke whiskygebieden.

Grondslag: Scotch Whisky Regulations 2009 (SI 2009/2890), reg. 10(5)-(7).
  - Campbeltown = ward South Kintyre (Argyll and Bute, indeling 2006)
  - Islay        = het eiland Islay
  - Speyside     = acht Moray-wards + ward Badenoch and Strathspey (indeling 2006)
  - Highland / Lowland = noord / zuid van de lijn uit reg. 10(7)
'Islands' is geen wettelijk gebied; de eilanden (behalve Islay) staan er als aparte,
gearceerde laag op.

Bronnen (alleen open data, niets overgetekend):
  - kust en landen: ONS 'Countries (December 2024) Boundaries UK' BGC/BUC
  - wards: ONS 'Wards (December 2016) GCB in Great Britain' — de laatste stand voor de
    herindeling van 2017, dus de wards uit de orders van 2006
    (beide Open Government Licence; Contains OS data © Crown copyright and database right)
  - ijkpunten van de lijn: Wikidata (CC0)
  - distilleerderijen: lon/lat uit KAART.distilleerderijen in index.html (Wikidata)

Coördinaten: British National Grid (EPSG:27700) in eenheden van 100 m,
x = oost/100, y = (1 220 000 - noord)/100. Shetland staat als inzet rechtsboven.

Gebruik (vanuit de whisky-demo-map; vereist shapely en pyproj):
    python tools/streekgrenzen_bouwer.py
"""
import json, os, sys, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pyproj import Transformer
from shapely.geometry import Polygon, LineString, Point, box, shape
from shapely.ops import unary_union, split
from shapely import affinity

HIER = os.path.dirname(os.path.abspath(__file__))
DEMO = os.path.dirname(HIER)
ONS = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
NAAR_BNG = Transformer.from_crs(4326, 27700, always_xy=True)
TOL = 1.5              # vereenvoudiging in eenheden (150 m)
NOORD0 = 1220000

def eenh(g):           # BNG-meters -> kaarteenheden (100 m, y naar beneden)
    return affinity.affine_transform(g, [0.01, 0, 0, -0.01, 0, NOORD0 / 100])

def pt(lat, lon):
    e, n = NAAR_BNG.transform(lon, lat)
    return (e / 100, (NOORD0 - n) / 100)

def haal(dienst, where, velden):
    q = urllib.parse.urlencode({"where": where, "outFields": velden, "outSR": 27700, "f": "geojson"})
    return json.load(urllib.request.urlopen(ONS + dienst + "/FeatureServer/0/query?" + q))["features"]

def delen(g):
    return [p for p in getattr(g, "geoms", [g]) if isinstance(p, Polygon) and not p.is_empty]

# ---- Highland-Lowland-lijn, reg. 10(7) ---------------------------------------
# (lat, lon). Begint en eindigt op het water, zodat hij het vasteland in tweeën knipt.
LIJN = [
    (55.9560, -4.7100),  # in de Clyde tussen Greenock en Cardross
    (55.9604, -4.6531),  # Cardross Station (Wikidata Q5038794)
    (56.0167, -4.3000),  # Earl's Seat, Campsie Fells (Q24648076)
    (56.1388, -3.9180),  # Wallace Monument (Q931796)
    (56.1333, -3.9167),  # Causewayhead — B998 (Q29166238)
    (56.1508, -3.8544),  # Menstrie — A91 (Q1010052)
    (56.1530, -3.7996),  # Alva (Q448127)
    (56.1533, -3.7419),  # Tillicoultry (Q1021170)
    (56.1625, -3.6681),  # Dollar (Q1235672)
    (56.1954, -3.6048),  # Yetts o' Muckhart (Q20827054)
    (56.2277, -3.4145),  # Milnathort — A91 raakt M90 (Q1009891)
    (56.3509, -3.4013),  # Bridge of Earn — via M90 (Q1016971)
    (56.3651, -3.3550),  # Rhynd — rivier de Earn tot de Tay (Q68816425)
    (56.3640, -3.2700),  # midden in de Tay
    (56.3900, -3.1200),  #   (zuidoever = de kust zelf; het water hoort
    (56.4250, -3.0000),  #    bij geen van beide gebieden)
    (56.4500, -2.9000),
    (56.4600, -2.7500),  # Noordzee
]

def rel(coords):
    """Eerste punt absoluut, daarna verschillen (kortere SVG-paden)."""
    c = [(round(x), round(y)) for x, y in coords]
    uit = [c[0]]
    for (ax, ay), (bx, by) in zip(c, c[1:]):
        if (bx, by) != (ax, ay):
            uit.append((bx - ax, by - ay))
    return uit

def pad(g):
    uit = []
    for p in delen(g):
        for r in [p.exterior] + list(p.interiors):
            c = rel(list(r.coords)[:-1])
            if len(c) >= 3:
                uit.append("M%d,%d" % c[0] + "l" + " ".join("%d,%d" % d for d in c[1:]) + "z")
    return "".join(uit)

def main():
    # --- land -----------------------------------------------------------------
    schot = eenh(shape(haal("Countries_December_2024_Boundaries_UK_BGC",
                            "CTRY24NM='Scotland'", "CTRY24NM")[0]["geometry"]))
    context = [shape(f["geometry"]) for f in haal("Countries_December_2024_Boundaries_UK_BUC",
               "CTRY24NM IN ('England','Northern Ireland')", "CTRY24NM")]
    # kleine eilandjes weg (< 0,08 km²), dan vereenvoudigen; alle gebieden komen uit deze vorm
    schot = unary_union([p for p in delen(schot) if p.area > 8]).simplify(TOL, preserve_topology=True)

    shet_y = (NOORD0 - 1060000) / 100     # noordelijker dan 1060 km = Shetland (+ Fair Isle)
    shet = unary_union([p for p in delen(schot) if p.bounds[3] < shet_y])
    land = unary_union([p for p in delen(schot) if p.bounds[3] >= shet_y])
    land = land.intersection(box(560, 0, 6000, 7400))   # St Kilda valt buiten het kader

    x0, y0, x1, y1 = land.bounds
    m = 60
    # Shetland als inzet rechtsboven, oostelijk van Orkney; het kader wordt daarvoor breder
    sx0, sy0, sx1, sy1 = shet.bounds
    sch = 0.7
    ins_w, ins_h = (sx1 - sx0) * sch + 60, (sy1 - sy0) * sch + 60
    orkney_oost = max(p.bounds[2] for p in delen(land) if p.bounds[1] < y0 + 600)
    ix, iy = orkney_oost + 90, y0 - m + 70
    rechts = max(x1 + m, ix + ins_w + 30)
    vak = [round(x0 - m), round(y0 - m), round(rechts - (x0 - m)), round(y1 - y0 + 2 * m)]
    kader = box(vak[0], vak[1], vak[0] + vak[2], vak[1] + vak[3])
    shet_in = affinity.translate(affinity.scale(shet, sch, sch, origin=(sx0, sy0)),
                                 ix + 30 - sx0, iy + 30 - sy0)

    # --- Highland / Lowland -----------------------------------------------------
    lijn = LineString([pt(*p) for p in LIJN])
    vasteland = max(delen(land), key=lambda p: p.area)
    stukken = delen(split(vasteland, lijn))
    edinburgh = Point(pt(55.953, -3.189))
    low = [p for p in stukken if p.distance(edinburgh) < 1]
    if not low:
        sys.exit("Lowland-stuk niet gevonden; klopt de lijn?")
    low_vast = low[0]
    hoog_vast = unary_union([p for p in stukken if not p.equals(low_vast)])
    # Eilanden in de Firth of Forth (oostelijk, zuid van de Tay) = Lowland. De Clyde-eilanden
    # liggen voorbij de zuidelijke oever van de Firth of Clyde, dus ten noorden van de lijn.
    eilanden = [p for p in delen(land) if not p.equals(vasteland)]
    tay = pt(56.45, -2.9)[1]
    forth = [p for p in eilanden if p.centroid.x > 2800 and p.centroid.y > tay]
    overig = [p for p in eilanden if not any(p.equals(f) for f in forth)]
    lowland = unary_union([low_vast] + forth)
    highland = hoog_vast      # Highland-vasteland; de eilanden en Islay horen er wettelijk ook bij,
                              # maar staan als eigen vlak in het bestand (geen dubbele data)

    # --- wards ------------------------------------------------------------------
    def wards(namen):
        fs = haal("Wards_December_2016_GCB_in_Great_Britain_2022",
                  "wd16nm IN (%s)" % ",".join("'%s'" % n for n in namen), "wd16nm")
        if sorted(f["properties"]["wd16nm"] for f in fs) != sorted(namen):
            sys.exit("Wards ontbreken")
        return eenh(unary_union([shape(f["geometry"]) for f in fs])).buffer(0)
    speyside = wards(["Buckie", "Elgin City North", "Elgin City South", "Fochabers Lhanbryde",
                      "Forres", "Heldon and Laich", "Keith and Cullen", "Speyside Glenlivet",
                      "Badenoch and Strathspey"]).simplify(TOL).intersection(land)
    campbeltown = wards(["South Kintyre"]).simplify(TOL).intersection(land)
    bowmore = Point(pt(55.7571, -6.2898))
    islay = unary_union([p for p in overig if p.distance(bowmore) < 20])
    islands = unary_union([p for p in overig if p.distance(bowmore) >= 20] + [shet_in])

    lijn_land = lijn.intersection(vasteland.buffer(4))
    ctx = unary_union([eenh(g) for g in context]).simplify(TOL * 2).intersection(kader)

    # --- distilleerderijen ------------------------------------------------------
    # Uit de kluisexport (Wikidata via _Export/distilleerderij-locaties.json). Het gebied volgt
    # uit de ligging op deze kaart (wettelijk), niet uit het regioveld van de catalogus.
    from kaart_gemeen import distilleerderijen
    gebieden = [("Islay", islay), ("Campbeltown", campbeltown), ("Speyside", speyside),
                ("Lowland", lowland), ("Island", islands), ("Highland", highland)]
    punten = {}
    for d in distilleerderijen()[0]:
        p = Point(pt(d["lat"], d["lon"]))
        if land.distance(p) > 30:          # buiten Schotland (of verder dan 3 km uit de kust)
            continue
        gb = next((r for r, g in gebieden if g.contains(p)), None)
        if not gb:
            gb = min(gebieden, key=lambda rg: rg[1].distance(p))[0]
        punten[d["id"]] = [round(p.x), round(p.y), gb]

    labels = {r: [round(v) for v in pt(lat, lon)] for r, (lat, lon) in {
        "Highland": (56.78, -4.7), "Speyside": (57.12, -3.3), "Lowland": (55.55, -3.35),
        "Islay": (55.5, -6.85), "Campbeltown": (55.27, -6.15), "Island": (58.42, -5.95)}.items()}

    lijnen = [list(l.coords) for l in getattr(lijn_land, "geoms", [lijn_land]) if l.length > 0]
    data = {
        "vak": vak,
        "inzet": [round(ix), round(iy), round(ins_w), round(ins_h)],
        "context": pad(ctx),
        "highland": pad(highland), "lowland": pad(lowland), "speyside": pad(speyside),
        "campbeltown": pad(campbeltown), "islay": pad(islay), "islands": pad(islands),
        "lijn": "".join("M%d,%d" % rel(l)[0] + "l" + " ".join("%d,%d" % d for d in rel(l)[1:]) for l in lijnen),
        "labels": labels, "punten": punten,
    }
    uit = os.path.join(DEMO, "streekgrenzen.js")
    with open(uit, "w", encoding="utf8") as f:
        f.write("/* Gegenereerd door tools/streekgrenzen_bouwer.py — niet met de hand bewerken.\n"
                "   Wettelijke whiskygebieden uit de Scotch Whisky Regulations 2009, reg. 10.\n"
                "   Kust en wards: ONS (Open Government Licence) — Contains OS data © Crown copyright and\n"
                "   database right. Ijkpunten lijn en distilleerderijen: Wikidata (CC0).\n"
                "   Coördinaten: British National Grid in eenheden van 100 m. */\n")
        f.write("var KGRENZEN=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("geschreven:", os.path.getsize(uit) // 1024, "kB", vak,
          {k: len(v) for k, v in data.items() if isinstance(v, str)}, len(punten), "punten")

if __name__ == "__main__":
    main()
