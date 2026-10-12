"""Bouwt de kaartdata voor de wereldkaart en de landkaarten.

Schrijft:
  kaart-wereld.js              KWERELD: landen in Equal Earth-projectie + graticule
  kaart-distilleerderijen.js   KDIST (geplaatste distilleerderijen), KDIST_OPEN (nog zonder locatie),
                               KLANDSLEUTEL (catalogusland -> kaartsleutel)
  kaart-land/<land>.js         per land: kust, buren, deelstaatgrenzen en de distilleerderijen,
                               in een Lambert-projectie rond het land

Bronnen: Natural Earth 1:10m/1:50m (publiek domein); distilleerderijlocaties uit de kluis
(_Export/distilleerderij-locaties.json, Wikidata CC0). Schotland heeft zijn eigen kaart
(streekgrenzen_bouwer.py) met de wettelijke whiskygebieden.

Gebruik (vanuit de whisky-demo-map; vereist shapely en pyproj):
    python tools/kaart_bouwer.py
"""
import json, os, re, sys, unicodedata
from pyproj import Transformer
from shapely.geometry import shape, box, Point, LineString
from shapely.ops import unary_union, transform
from shapely.strtree import STRtree
from shapely import affinity

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaart_gemeen import DEMO, NE_LAND, LANDSLEUTEL, ne, distilleerderijen  # noqa: E402

# kader per land (lon0, lat0, lon1, lat1): verre gebiedsdelen vallen buiten de kaart
KADER = {"Amerika": (-125.5, 24, -66.5, 49.6), "Frankrijk": (-5.5, 41.2, 9.8, 51.3),
         "Nederland": (3.2, 50.7, 7.3, 53.6), "Spanje": (-9.6, 35.8, 4.5, 43.9),
         "Nieuw-Zeeland": (166, -47.5, 179, -34), "Australië": (112, -44, 154, -10),
         "Denemarken": (7.8, 54.5, 15.3, 57.8), "Canada": (-141, 41.6, -52, 70),
         "Japan": (122.8, 24, 146, 45.7), "China": (73, 18, 135.5, 53.6), "Noorwegen": (4, 57.8, 31.5, 71.3),
         "IJsland": (-24.6, 63.2, -13.4, 66.6), "Zuid-Afrika": (16, -35, 33, -22),
         "Engeland": (-6.5, 49.8, 1.8, 55.9), "Ierland": (-10.7, 51.3, -5.3, 55.5)}

def sleutel(props):
    """Kaartsleutel voor een Natural Earth-vorm. Eerst de kaarteenheid (GU_A3: Schotland, Engeland
    los), anders het land (ADM0_A3: de 10m-kaart deelt o.a. België en Frankrijk verder op)."""
    k = NE_LAND.get(props["GU_A3"])
    if k: return k
    return NE_LAND.get(props["ADM0_A3"]) if props["ADM0_A3"] != "GBR" else None

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def rel(coords):
    c = [(round(x), round(y)) for x, y in coords]
    uit = [c[0]]
    for (ax, ay), (bx, by) in zip(c, c[1:]):
        if (bx, by) != (ax, ay):
            uit.append((bx - ax, by - ay))
    return uit

def polys(g):
    if g.is_empty: return []
    if g.geom_type == "Polygon": return [g]
    return [p for x in getattr(g, "geoms", []) for p in polys(x)]

def lijnen(g):
    if g.is_empty: return []
    if g.geom_type == "LineString": return [g]
    if g.geom_type in ("Polygon",): return [g.exterior]
    return [l for x in getattr(g, "geoms", []) for l in lijnen(x)]

def pad(g, min_opp=0):
    uit = []
    for p in polys(g):
        if p.area < min_opp: continue
        for r in [p.exterior] + list(p.interiors):
            c = rel(list(r.coords)[:-1])
            if len(c) >= 3:
                uit.append("M%d,%d" % c[0] + "l" + " ".join("%d,%d" % d for d in c[1:]) + "z")
    return "".join(uit)

def lijnpad(g):
    uit = []
    for l in lijnen(g):
        c = rel(list(l.coords))
        if len(c) >= 2:
            uit.append("M%d,%d" % c[0] + "l" + " ".join("%d,%d" % d for d in c[1:]))
    return "".join(uit)

def schrijf(pad_, naam, data):
    os.makedirs(os.path.dirname(pad_), exist_ok=True)
    with open(pad_, "w", encoding="utf8") as f:
        f.write("/* Gegenereerd door tools/kaart_bouwer.py — niet met de hand bewerken.\n"
                "   Kaartdata: Natural Earth (publiek domein). Locaties: Wikidata (CC0), via de kluis. */\n")
        f.write(naam + "=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    return os.path.getsize(pad_) // 1024

def main():
    n10 = ne("ne_10m_admin_0_map_units")["features"]
    n50 = ne("ne_50m_admin_0_map_units")["features"]
    meren = [shape(f["geometry"]) for f in ne("ne_50m_lakes")["features"] if f["properties"].get("scalerank", 9) <= 2]
    deelstaat = ne("ne_50m_admin_1_states_provinces_lines")["features"]
    meer_boom = STRtree(meren)

    def zonder_meren(g):
        hits = [meren[i] for i in meer_boom.query(g)]
        return g.difference(unary_union(hits)) if hits else g

    # ---------------- distilleerderijen: land bepalen op de 10m-kaart ----------------
    dists, records = distilleerderijen()
    vormen = [(sleutel(f["properties"]), shape(f["geometry"])) for f in n10]
    boom = STRtree([v for _, v in vormen])
    for d in dists:
        p = Point(d["lon"], d["lat"])
        land = None
        for i in boom.query(p):
            if vormen[i][1].contains(p): land = vormen[i][0]; break
        if not land:   # net buiten de kust: dichtstbijzijnde vorm binnen ~5 km
            i = boom.nearest(p)
            if vormen[i][1].distance(p) < 0.06: land = vormen[i][0]
        d["land"] = land or ""
        if not d["land"]:
            print("buiten de kaartlanden:", d["naam"], land)
    open_ = {}
    for r in records:
        if r.get("status") == "geplaatst": continue
        k = LANDSLEUTEL.get(r["land_catalogus"], r["land_catalogus"])
        open_.setdefault(k, []).append([r["naam"], r["flessen"]])
    for k in open_: open_[k].sort(key=lambda x: -x[1])
    kb = schrijf(os.path.join(DEMO, "kaart-distilleerderijen.js"), "var KDIST",
                 [{k: v for k, v in d.items()} for d in dists if d["land"]])
    with open(os.path.join(DEMO, "kaart-distilleerderijen.js"), "a", encoding="utf8") as f:
        f.write("var KDIST_OPEN=" + json.dumps(open_, ensure_ascii=False, separators=(",", ":")) + ";\n")
        f.write("var KLANDSLEUTEL=" + json.dumps(LANDSLEUTEL, ensure_ascii=False) + ";\n")
    print("kaart-distilleerderijen.js", kb, "kB,", len(dists), "distilleerderijen")

    # ---------------- wereld (Equal Earth) ----------------
    ee = Transformer.from_crs(4326, "+proj=eqearth +lon_0=0 +datum=WGS84", always_xy=True)
    S = 4000 / 34000000.0     # ~4000 eenheden breed
    def wproj(g):
        g = transform(lambda x, y: ee.transform(x, y), g)
        return affinity.affine_transform(g, [S, 0, 0, -S, 0, 0])
    landen, alles = [], []
    for f in n50:
        q = f["properties"]
        if q["GU_A3"] in ("ATA",): continue
        g = zonder_meren(shape(f["geometry"]).buffer(0)) if q["GU_A3"] in ("USA", "CAN") else shape(f["geometry"])
        g = wproj(g).simplify(1.6, preserve_topology=True)
        alles.append(g)
        d = pad(g, 0.6)
        if not d: continue
        landen.append({"code": q["GU_A3"], "naam": q.get("NAME_NL") or q["NAME"], "land": sleutel(q) or "", "d": d})
    x0, y0, x1, y1 = unary_union(alles).bounds
    m = 40
    vak = [round(x0 - m), round(y0 - m), round(x1 - x0 + 2 * m), round(y1 - y0 + 2 * m)]
    grat = []
    for lat in range(-60, 90, 30):
        grat.append(wproj(LineString([(lon, lat) for lon in range(-180, 181, 5)])))
    for lon in range(-180, 181, 30):
        grat.append(wproj(LineString([(lon, lat) for lat in range(-60, 86, 2)])))
    rand = wproj(LineString([(-180, la) for la in range(-60, 86, 2)] + [(180, la) for la in range(85, -61, -2)]))
    kb = schrijf(os.path.join(DEMO, "kaart-wereld.js"), "var KWERELD",
                 {"vak": vak, "landen": landen, "grat": lijnpad(unary_union(grat)), "rand": lijnpad(rand)})
    print("kaart-wereld.js", kb, "kB")

    # ---------------- per land ----------------
    per_land = {}
    for f in n10:
        k = sleutel(f["properties"])
        if k and k != "Schotland":
            per_land.setdefault(k, []).append(shape(f["geometry"]).buffer(0))
    for k, gs in sorted(per_land.items()):
        geo = unary_union(gs)
        if k in KADER:
            geo = geo.intersection(box(*KADER[k]))
        geo = zonder_meren(geo)
        hoofd = max(polys(geo), key=lambda p: p.area)
        lon0, lat0 = hoofd.centroid.x, hoofd.centroid.y
        tr = Transformer.from_crs(4326, "+proj=laea +lat_0=%.4f +lon_0=%.4f +datum=WGS84" % (lat0, lon0), always_xy=True)
        pr = lambda g: transform(lambda x, y: tr.transform(x, y), g)
        lp = pr(geo)
        bx0, by0, bx1, by1 = lp.bounds
        s = 6000.0 / max(bx1 - bx0, by1 - by0)
        def eenh(g):
            return affinity.affine_transform(g, [s, 0, 0, -s, -bx0 * s, by1 * s])
        land = eenh(lp)
        X0, Y0, X1, Y1 = land.bounds
        mx = max(X1 - X0, Y1 - Y0) * 0.07
        vak = [round(X0 - mx), round(Y0 - mx), round(X1 - X0 + 2 * mx), round(Y1 - Y0 + 2 * mx)]
        kader = box(vak[0], vak[1], vak[0] + vak[2], vak[1] + vak[3])
        tol = max(vak[2], vak[3]) / 1800.0
        # buren: alles in een ruime lon/lat-rand rond het land
        lx0, ly0, lx1, ly1 = geo.bounds
        rx, ry = (lx1 - lx0) * .6 + 1, (ly1 - ly0) * .6 + 1
        zoekvak = box(lx0 - rx, max(-85, ly0 - ry), lx1 + rx, min(85, ly1 + ry))
        buren = []
        for f2 in n10:
            if sleutel(f2["properties"]) == k: continue
            g2 = shape(f2["geometry"])
            if not g2.intersects(zoekvak): continue
            buren.append(eenh(pr(g2.buffer(0).intersection(zoekvak))).buffer(0))
        buren = unary_union(buren).intersection(kader).simplify(tol * 1.5) if buren else None
        staat = [shape(f2["geometry"]) for f2 in deelstaat if NE_LAND.get(f2["properties"].get("ADM0_A3")) == k]
        staat = eenh(pr(unary_union(staat).intersection(geo.buffer(0.01)))).simplify(tol) if staat else None
        punten = {}
        for d in dists:
            if d["land"] != k: continue
            p = eenh(pr(Point(d["lon"], d["lat"])))
            punten[d["id"]] = [round(p.x), round(p.y)]
        data = {"naam": k, "vak": vak, "km": round(s * 1000, 4),
                "land": pad(land.simplify(tol, preserve_topology=True), tol * tol * 4),
                "buren": pad(buren, tol * tol * 4) if buren is not None else "",
                "lijnen": lijnpad(staat) if staat is not None else "", "punten": punten}
        kb = schrijf(os.path.join(DEMO, "kaart-land", slug(k) + ".js"),
                     "(window.KLANDKAART=window.KLANDKAART||{})[%s]" % json.dumps(k, ensure_ascii=False), data)
        print("kaart-land/%s.js" % slug(k), kb, "kB,", len(punten), "punten")

if __name__ == "__main__":
    main()
