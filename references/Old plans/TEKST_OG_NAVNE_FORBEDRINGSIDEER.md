# Tekst- og navneforbedringer (opdateret til nuvaerende spil)

Denne liste er opdateret til den aktuelle struktur med `Kort`, `Lager`, `Butik`, `Smedjen` og `Smykkevaerkstedet`.
Maalet er mere konsekvent dansk game-terminologi og tydeligere brugerfeedback.

## 10 konkrete forbedringer

1. **Fastlaeg ordliste for kernebegreber**
   - Brug konsekvent: `Lager`, `Ravare`, `Essens`, `Omdoemme`, `Lokation`, `Salgspris`.
   - Undgaa blanding af dansk/engelsk i samme UI-flow.

2. **Ensret tone i knaptekster**
   - Hold verber i bydeform: `Kob`, `Saelg`, `Opgrader`, `Lav smykke`, `Tilbage til kortet`.
   - Undgaa skift mellem handlings- og navneknapper med samme funktion.

3. **Gor fejlgrunde mere handlingsrettede**
   - I stedet for kun "Mangler barer." brug "Mangler 2x Guld-bar i Lager > Ravarer".
   - Angiv altid *hvad* der mangler og *hvor* spilleren kan loese det.

4. **Niveau- og unlock-tekster med kontekst**
   - Vis unlock-beskeder som: "Soevlhulen laast op (krav opfyldt)".
   - Tilfoej kort forklaring ved laaste lokationer: level/omdoemme/guld i samme linje.

5. **Kapacitets-feedback i samme stil**
   - Standardformat: "Lager fuldt: Ravarer (34/34)".
   - Suppler med hurtig anbefaling: "Saelg i Butik > Saelg-fanen eller brug Smedjen."

6. **Smykkevaerksted: tydeligere opskriftssprog**
   - Skeln klart mellem `Krav`, `Forbrug` og `Beloenning`.
   - Undgaa tvetydige ord som "for lav" uden tal; vis altid konkret krav.

7. **Achievement-tekster med konsekvent format**
   - Titel: kort og punchy.
   - Undertekst: "Fremskridt X/Y" + en saetning om hvad spilleren boer goere naeste gang.

8. **Settings-tekster i spiller-sprog**
   - Behold tekniske termer i parentes: "Kvalitet: Hoej (MSAA + hoej pixelratio)".
   - Hold "Nulstil fremskridt"-flow tydeligt og roligt i tonen.

9. **Butikstekster med bedre sammenlignelighed**
   - Vis priser, krav og effekt i fast raekkefolge pa alle kort.
   - Brug samme enhedsformat overalt: `g`, `lvl`, `+XP`, `+omdoemme`.

10. **Kort lore-linje uden at overfylde UI**
    - Tilfoej 1-2 linjer flavor-tekst pr. omraade i kortvisning, sa verdenen foeles mere levende.
    - Hold det letlaeseligt og uden at skjule vigtig gameplay-data.

## Hurtig arbejdsregel til fremtidige tekst-aendringer
For hver ny tekststreng: kontroller **(1) terminologi**, **(2) handling**, **(3) konkret info (tal/krav)**, **(4) konsekvent tone**.