#!/usr/bin/env python3
"""Zet de eigen producttekst van Whiskysite (Kleur / Neus / Smaak / Afdronk) als
aparte laag naast de catalogus, zodat de productpagina meer toont dan een regel
die de specificatietabel herhaalt.

Bron: de catalogus die 63_catalogus_demo.py met test 65 maakte
(C:\\Obsidian\\_Bouw\\whisky-demo\\catalogus-lokaal.js). Daarin staat per fles
`txt` (blokken {k: kopje, t: tekst}) en `tbron`. Alleen tbron == "winkel" gaat mee:
dat is de tekst die nu al in de winkel staat, deels door de winkel overgenomen
van distilleerderij of bottelaar. Niets wordt herschreven of bijverzonnen.

De catalogus zelf blijft ongewijzigd; de site legt deze laag eroverheen.

Gebruik (vanuit whisky-demo):
    python tools/winkelteksten.py C:/Obsidian/_Bouw/whisky-demo/catalogus-lokaal.js winkelteksten.js
"""
import html
import json
import re
import sys
from pathlib import Path


def laad(pad):
    t = Path(pad).read_text(encoding="utf-8")
    t = t[t.index("=") + 1:].strip().rstrip(";")
    return json.loads(t)


def kopje(k):
    k = k.strip()
    return k[:1].upper() + k[1:].lower()


def blokken(txt):
    uit = []
    for b in txt:
        t = re.sub(r"\s{2,}", " ", html.unescape(b.get("t") or "")).strip()
        if not t:
            continue
        r = {"t": t}
        if b.get("k"):
            r["k"] = kopje(b["k"])
        # een los kopje 'Proefnotities' zonder inhoud is een tussenkop, geen tekst
        if not r.get("k") and t.lower() in ("proefnotities", "tasting notes"):
            r = {"h": t[:1].upper() + t[1:].lower()}
        uit.append(r)
    return uit


def main():
    bron, doel = sys.argv[1], sys.argv[2]
    huidige = {p["id"] for p in laad("catalogus-lokaal.js")}
    uit = {}
    for p in laad(bron):
        if p.get("tbron") != "winkel" or not p.get("txt") or p["id"] not in huidige:
            continue
        b = blokken(p["txt"])
        if sum(len(x.get("t", "")) for x in b) >= 60:
            uit[p["id"]] = b
    kop = ("/* Eigen productteksten van Whiskysite (Kleur/Neus/Smaak/Afdronk) per product-id.\n"
           "   Gegenereerd door tools/winkelteksten.py — niet met de hand bijwerken. */\n")
    Path(doel).write_text(kop + "var WINKELTEKST=" +
                          json.dumps(uit, ensure_ascii=False, separators=(",", ":")) + ";\n",
                          encoding="utf-8", newline="\n")
    print(f"{len(uit)} producten met eigen winkeltekst -> {doel}")


if __name__ == "__main__":
    main()
