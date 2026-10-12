# whisky-demo — werkafspraken voor elke sessie

Demo van de ontdeksite voor Whiskysite.nl. Publieke repo, GitHub Pages. Opdrachtgever John (TankeSmed), klant Jack.

## Wijzigingslogboek — verplicht bij elke versie
- Elke commit die iets zichtbaars verandert (site of beheer) krijgt één regel onderaan `WIJZIGINGEN` in `wijzigingen.js`. Dit is het archief dat Jack in het beheer ziet.
- Formaat: `{d:"JJJJ-MM-DD",o:"wat, kort",x:"toelichting voor Jack in gewone taal",v:"deze versie"}`.
- De versiecode is pas na de commit bekend: zet `v:"deze versie"` en vul bij de volgende commit de echte code(s) in.
- Meerdere commits over één onderwerp mogen in één regel (`v:"abc1234, def5678"`).
- Controleer na het bewerken: `node -e "eval(require('fs').readFileSync('wijzigingen.js','utf8'))"`.

## Commit en push
- Pushen alleen als John letterlijk "push" zegt; een eerdere toestemming geldt niet voor een volgende commit.
- Vóór elke push: `git fetch` en rebase op `origin/main`; de diff controleren op handelscijfers (omzet, marge, inkoop, voorraadwaarde) en geheimen. Er staan nooit sleutels in deze repo; alleen de publieke Supabase-sleutel mag in de frontend.
- Commits op naam van TankeSmed. Regeleinden in de repo: LF.

## Gegenereerde bestanden — niet met de hand bewerken
`gidsen.js`, `hiaten.js`, `oordelen-jack.js`, `beoordeling.js`, `merkposities.js`, `kaart-*.js`, `streekgrenzen.js`. Ze komen uit de kennisbank (Obsidian-kluis Whiskysite, `.scripts/`) of uit `tools/`. Pas de bron aan en draai het script opnieuw.

## Grenzen
- Niets schrijven naar Lightspeed zonder Jacks akkoord per regel. De sync (`ws-ls-sync`) leest alleen.
- Vragen aan Jack alleen via de demo (Vragen voor Jack, Beoordelen, Gidsen beoordelen), niet via Excel of bijlagen.
- Beeld alleen met een licentie die commercieel gebruik toestaat, met maker en bron erbij; logo's alleen van de merkeigenaar met toestemming.
- De pilot wordt niet geïndexeerd (`robots.txt`).
