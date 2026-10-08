#!/usr/bin/env python3
"""Bepaalt per opgemaakt productbeeld (beelden/p/*.webp, 600x600, transparante achtergrond)
waar het Whiskysite-merk (WS) subtiel kan staan: op de flessenhals, of anders op de koker/doos.

Gebruik (vanuit whisky-demo):  python3 tools/ws_merk.py beelden/p merkposities.js   (na elke nieuwe ronde van 39_beelden_catalogus.py)

Uitvoer: var WSMERK={"<id>":[x,y,b,t]} met
  x, y = middelpunt van het merk in % van de beeldbreedte/-hoogte
  b    = breedte van het merk in % van de beeldbreedte
  t    = "l" (licht merk op donkere ondergrond) of "d" (donker merk op lichte ondergrond)
  plus soort: "h" (hals) of "k" (koker/doos)  -> [x,y,b,t,soort]
Het beeld zelf wordt niet aangepast; de site legt het merk erover. Zo kan het merk,
de transparantie of de plaats later veranderen zonder 4.600 beelden opnieuw te maken.
"""
import json, os, sys
import numpy as np
from PIL import Image

MERK_RATIO = 0.62  # hoogte/breedte van het merk (WS-monogram)


def runs(bool_arr):
    """(start, eind) van aaneengesloten True-reeksen"""
    r, s = [], None
    for i, v in enumerate(bool_arr):
        if v and s is None:
            s = i
        elif not v and s is not None:
            r.append((s, i - 1)); s = None
    if s is not None:
        r.append((s, len(bool_arr) - 1))
    return r


def rij_breedte(mask, y, xc):
    """breedte van de voorgrondreeks in rij y die xc bevat"""
    row = mask[y]
    if not row[xc]:
        # zoek dichtstbijzijnde voorgrond binnen 6 px
        for d in range(1, 7):
            for x in (xc - d, xc + d):
                if 0 <= x < row.size and row[x]:
                    xc = x; break
            else:
                continue
            break
        else:
            return 0, xc
    l = xc
    while l > 0 and row[l - 1]:
        l -= 1
    r = xc
    while r < row.size - 1 and row[r + 1]:
        r += 1
    return r - l + 1, (l + r) // 2


def helderheid(rgb, mask, x0, y0, x1, y1):
    sub = rgb[y0:y1, x0:x1].astype(float)
    m = mask[y0:y1, x0:x1]
    if m.sum() < 5:
        return 128
    lum = 0.299 * sub[..., 0] + 0.587 * sub[..., 1] + 0.114 * sub[..., 2]
    return float(lum[m].mean())


def analyseer(pad):
    im = Image.open(pad).convert("RGBA")
    a = np.asarray(im)
    H, W = a.shape[:2]
    mask = a[..., 3] > 60
    if mask.sum() < 500:
        return None
    rgb = a[..., :3]
    cols = mask.any(axis=0)
    top = np.where(cols, mask.argmax(axis=0), H)
    bot = np.where(cols, H - 1 - mask[::-1].argmax(axis=0), -1)
    kandidaten = []
    # objecten = kolomreeksen gescheiden door lege kolommen (of diepe insnoeringen)
    for (x0, x1) in runs(cols):
        if x1 - x0 < 12:
            continue
        t = top[x0:x1 + 1]
        ymin = int(t.min())
        hoogte = int(bot[x0:x1 + 1].max()) - ymin
        if hoogte < 0.25 * H:
            continue
        # pieken: kolommen die duidelijk boven hun omgeving uitsteken
        drempel = ymin + 0.06 * hoogte
        for (p0, p1) in runs(t <= drempel + 0):
            px0, px1 = x0 + p0, x0 + p1
            breed = px1 - px0 + 1
            kandidaten.append((ymin, px0, px1, breed, x0, x1, hoogte))
    if not kandidaten:
        return None
    best = None
    for (ymin, px0, px1, breed, x0, x1, hoogte) in sorted(kandidaten):
        objbreed = x1 - x0 + 1
        if breed < 0.45 * objbreed or objbreed < 0.2 * W:
            # smalle top in een breder object: kandidaat voor een flessenhals
            xc = (px0 + px1) // 2
            ws, prev = [], xc
            for y in range(ymin, min(H, ymin + int(0.6 * hoogte))):
                w, prev = rij_breedte(mask, y, prev)
                ws.append((y, w, prev))
            if not ws:
                continue
            wvals = np.array([w for _, w, _ in ws])
            boven = wvals[: max(3, int(0.45 * len(wvals)))]
            nmin = np.percentile(boven[boven > 0], 20) if (boven > 0).any() else 0
            if nmin < 14:
                continue
            hals = runs(wvals <= nmin * 1.35)
            # langste halsreeks die niet helemaal bovenaan (dop) begint te eindigen
            hals = [h for h in hals if h[1] - h[0] >= 10]
            if not hals:
                continue
            h0, h1 = max(hals, key=lambda h: h[1] - h[0])
            if wvals.max() < nmin * 1.8:
                continue  # geen schouder: geen fles maar een smalle koker
            y0, y1 = ws[h0][0], ws[h1][0]
            ym = int(y0 + 0.55 * (y1 - y0))
            xm = int(np.median([c for (_, _, c) in ws[h0:h1 + 1]]))
            bw = float(np.median(wvals[h0:h1 + 1])) * 0.72
            mh = bw * MERK_RATIO
            if mh > (y1 - y0) * 0.9:
                bw = (y1 - y0) * 0.9 / MERK_RATIO
            if bw < 10:
                continue
            best = ("h", xm, ym, bw)
            break
    if best is None:
        # koker/doos: breedste object, merk in het bovenste deel
        (x0, x1) = max(runs(cols), key=lambda r: r[1] - r[0])
        ymin = int(top[x0:x1 + 1].min()); ymax = int(bot[x0:x1 + 1].max())
        plateau = runs(top[x0:x1 + 1] <= ymin + 0.04 * (ymax - ymin))
        p0, p1 = max(plateau, key=lambda r: r[1] - r[0])
        bx0, bx1 = x0 + p0, x0 + p1
        breed = bx1 - bx0
        if breed < 40:
            return None
        if (x1 - x0) > 0.8 * W and (ymax - ymin) > 0.8 * H:
            return None  # beeldvullende afbeelding (bv. een sample-illustratie): geen merk
        xm = (bx0 + bx1) // 2
        ym = int(ymin + 0.13 * (ymax - ymin))
        bw = breed * 0.26
        best = ("k", xm, ym, bw)
    soort, xm, ym, bw = best
    mh = bw * MERK_RATIO
    lum = helderheid(rgb, mask, int(xm - bw / 2), int(ym - mh / 2), int(xm + bw / 2) + 1, int(ym + mh / 2) + 1)
    toon = "l" if lum < 115 else "d"
    return [round(100 * xm / W, 1), round(100 * ym / H, 1), round(100 * bw / W, 1), toon, soort]


def main():
    bron, uit = sys.argv[1], sys.argv[2]
    res, mis = {}, 0
    for f in sorted(os.listdir(bron)):
        if not f.endswith(".webp"):
            continue
        try:
            r = analyseer(os.path.join(bron, f))
        except Exception as e:  # een kapot beeld mag de rest niet tegenhouden
            r = None
        if r:
            res[f[:-5]] = r
        else:
            mis += 1
    with open(uit, "w", encoding="utf-8") as o:
        o.write("/* Plaats van het WS-merk per opgemaakt beeld. Gemaakt door tools/ws_merk.py. Niet met de hand bewerken. */\n")
        o.write("var WSMERK=" + json.dumps(res, separators=(",", ":")) + ";\n")
    h = sum(1 for v in res.values() if v[4] == "h")
    print(f"{len(res)} beelden met merkplaats ({h} hals, {len(res)-h} koker/doos); {mis} zonder plaats.")


if __name__ == "__main__":
    main()
