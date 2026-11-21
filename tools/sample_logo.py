#!/usr/bin/env python3
"""Maakt van Jacks eigen sample-logo (de winkelfoto '6-cl.jpg' bij Lightspeed) een
transparant watermerk dat de site over de geleende foto van de hoofdfles legt.

Gebruik (vanuit whisky-demo):  python3 tools/sample_logo.py

Uitvoer in beelden/merk/:
  sample-6cl.png  het logo zoals Jack het heeft: "6 cl / sample / 6 cl"
  sample-3cl.png  Jacks 3 cl-versie van hetzelfde logo
  sample.png      het logo zonder maat, voor samples van een andere maat
                  (5, 10, 15, 20 cl); de site zet de echte maat er dan als pil bij.

Werkwijze: elke pixel wordt ontmengd tegen wit voor de twee inktkleuren van het logo
(antraciet en bordeaux). Wat niet op een van beide inkten lijkt (de vervaagde graanfoto
in twee kwarten) wordt doorzichtig. Binnen de cirkel komt een halfdoorzichtige witte
schijf, zodat het logo ook op een donkere fles leesbaar blijft. Vierkant, zodat de
verhouding overal gelijk is.
"""
import io, os, sys, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BRON = "https://cdn.webshopapp.com/shops/39103/files/500428095/6-cl.jpg"
BRON_3CL = "https://cdn.webshopapp.com/shops/39103/files/458900699/3-cl.jpg"  # zelfde ontwerp, "3 cl"
UIT = os.path.join("beelden", "merk")
INKT = [np.array([62, 62, 64.]), np.array([132, 12, 54.])]  # antraciet, bordeaux
CX, CY, R = 227, 237, 184           # cirkel in de bron (450x472)
UITSNEDE = (33, 44, 421, 432)       # vierkant om de hele tekening
SCHIJF = .62                        # dekking van de witte schijf
MAAT_VAKKEN = [(100, 232, 145, 210), (218, 346, 270, 335)]  # de twee keer "6 cl"


def inkt_laag(im):
    d = 255 - im
    H, W, _ = im.shape
    a_best = np.zeros((H, W)); res_best = np.full((H, W), 1e9); i_best = np.zeros((H, W), int)
    for i, c in enumerate(INKT):
        dc = 255 - c
        a = np.clip((d * dc).sum(2) / (dc * dc).sum(), 0, 1)
        res = np.sqrt(((d - a[..., None] * dc) ** 2).sum(2))
        m = res < res_best
        a_best[m], res_best[m], i_best[m] = a[m], res[m], i
    alpha = np.where(res_best < 28, a_best, 0)
    kern = Image.fromarray(((alpha > .55) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    alpha = np.where(np.asarray(kern) > 0, alpha, 0)  # alleen rand rond echte inkt: geen fotoschim
    rgb = np.zeros((H, W, 3))
    for i, c in enumerate(INKT):
        rgb[i_best == i] = c
    return np.dstack([rgb, alpha * 255]).astype(np.uint8), i_best


def maak(laag, soort, zonder_maat, pad):
    L = laag.copy()
    if zonder_maat:
        for x0, x1, y0, y1 in MAAT_VAKKEN:
            v = L[y0:y1, x0:x1]; s = soort[y0:y1, x0:x1]
            v[..., 3] = np.where((s == 1) | (v[..., 3] < 90), 0, v[..., 3])
    H, W = L.shape[:2]; k = 4
    schijf = Image.new("L", (W * k, H * k), 0)
    ImageDraw.Draw(schijf).ellipse([(CX - R) * k, (CY - R) * k, (CX + R) * k, (CY + R) * k], fill=int(255 * SCHIJF))
    beeld = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    beeld.putalpha(schijf.resize((W, H), Image.LANCZOS))
    beeld.alpha_composite(Image.fromarray(L, "RGBA"))
    beeld.crop(UITSNEDE).save(pad, optimize=True)
    print("geschreven:", pad)


def lees(bron):
    data = open(bron, "rb").read() if os.path.exists(bron) else urllib.request.urlopen(bron).read()
    return inkt_laag(np.asarray(Image.open(io.BytesIO(data)).convert("RGB")).astype(float))


def main():
    os.makedirs(UIT, exist_ok=True)
    laag, soort = lees(sys.argv[1] if len(sys.argv) > 1 else BRON)
    maak(laag, soort, False, os.path.join(UIT, "sample-6cl.png"))
    maak(laag, soort, True, os.path.join(UIT, "sample.png"))
    laag, soort = lees(sys.argv[2] if len(sys.argv) > 2 else BRON_3CL)
    maak(laag, soort, False, os.path.join(UIT, "sample-3cl.png"))


if __name__ == "__main__":
    main()
