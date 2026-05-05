# Analyse og Anbefalinger til Ædelstens-Systemet i GemSimulator

## Indledning

Dit spil startede som en ædelstens-simulator med procedural generation af et stort antal forskellige gems. Du er meget tilfreds med den konsistente 2D- og 3D-gengivelse samt ligheden mellem visningstyper og størrelser. Dog føles systemet nu lidt fastlåst med for få variationer i farver, effekter og mønstre. Dette dokument giver et totalt overblik over det nuværende system baseret på kodeanalysen i `src/gem/generate.ts` og data-filerne i `src/data/`, samt konkrete forslag til at udvide det til et system med en følelse af uendeligt flere spændende, eksotiske ædelsten – inklusive blandinger og spor af metaller.

**Tværgående krav:** Spillet har nu et bredere metal-økosystem (f.eks. minebare metaller vs. legeringer som bronze, rå malm, klumper, ingots, områder med `metalPool` osv.). Når du udvider ædelstens- eller metal-typer, skal ændringerne følges hele vejen rundt – ikke kun i `generate.ts`. Tænk inventory, mining/drops, værdi og salg, smykkeværksted, lokationskort, HUD/ikoner, **2D-pixelmodeller** (rå malm, nuggets, barer/ingots) og **3D-gengivelse** i minen og relaterede scener, så nye ores og barer matcher de etablerede visuelle regler og ikke kun findes som data uden assets.

## Nuværende System – Overblik

### Taxonomi: ædelstenens egenskaber (logisk model)

En ædelsten i `Gem`-typen kan beskrives som **lag**, der bygges oven på hinanden. Det gør det lettere at udvide spillet, holde 2D/3D konsistent og **generere navne** fra de samme lag (i stedet for ad hoc-strenge). Knytning til `src/types.ts` / `generate.ts`:

| Lag | Hvad det er | Typiske felter / data |
|-----|-------------|------------------------|
| **A – Persistens** | Unik reference og tidspunkt | `id`, `timestamp` |
| **B – Silhuet (snit)** | Grundform før/efter mutation | Valgt template → `shapeName`; basis for `data[]` (grid) |
| **C – Farvefamilie** | Materialets palet | Palette-navn + `colorMap` (`O`,`D`,`G`,`L`,`W`, …) |
| **D – Tekstur / micro** | Tilfældig overflade oven på silhuet | Sparkles, facets i `mutateGemData`; evt. horisontal spejling af `data` |
| **E – Kvalitet** | Renhed og særlig tier | `purity` (1–4), `isGodTier` |
| **F – Metalprofil** | Spor og klumper i stenen | `metalInclusions[]` (slots `1`–`3` + særskilt guld `X`), `karat` når guld |
| **G – Magisk signatur** | Overnaturlige egenskaber | `magicProperties[]` (0–3; hver med rarity) |
| **H – Økonomi (afledt)** | Salgs-/spilværdi | `goldValue` (beregnes fra dybde, charms m.m. + lag E–G) |
| **I – Vist navn (præsentation, afledt)** | Spillerens læsbare titel | `name` – i dag typisk `"{shapeName} {palette.name}"` fra `generate.ts` / `crafting.ts` |

**Navngivning som naturlig del af taxonomien:** Navnet bør være en **deterministisk eller styret sammensætning af lagene**, ikke et separat “polish”-spor. Konkret retning:

- **Kerne** (altid): kombination af **lag B + C** – det svarer til nutidens *snit + palet* (fx «Brilliant Rubin»).
- **Metaltilæg** (når lag F er ikke-tom): korte fraser baseret på faktiske inklusioner, fx *«med Guldåre»*, *«med Sølv- og Kobberspor»* – samme kildedata som `metalInclusions` (og `karat` for guld).
- **Magitilæg** (når lag G er relevant): enten præfiks/suffiks fra `magicProperties` (fx ild → *«Flammerubin»* / *«… af Ild»*) eller udeladelse ved 0 magi for at undgå støj.
- **Kvalitet** (lag E): diskrete tillægsord ved høj `purity` eller `isGodTier` (*«Uplettet»*, *«Guddommelig»* …) – kun hvis det ikke kolliderer med længde og UI.

Eksempel på målform: **«Flammerubin med Guldåre»** = magisk led (G) + palet/farvefamilie (C) + metalfrase (F). Rækkefølge kan låses i en lille navne-DSL eller skabelonliste, så nye paletter/metaller/magi automatisk får konsistente mønstre.

### Kernkomponenter og variationer (samme verden som tabellen)

- **Paletter (farver)**: 14 faste paletter (f.eks. Smaragd, Rubin, Safir, Ametyst, Diamant osv.). Hver palette definerer 5 farver via chars: `O` (outer), `D` (dark), `G` (gem base), `L` (light), `W` (white/sparkle).
- **Geometriske former / silhuetter (templates)**: 23 forskellige skabeloner (Rektangulær, Dråbeformet, Brilliant, Oval, Hjerte, Princess, Emerald osv.). Hver er en grid af chars, der danner silhuetten.
- **Metaller og inklusioner**: 8 metaller (Tin, Kobber, Jern, Bronze, Sølv, Guld, Mithril, Runestål), med skel mellem hvad der kan findes som rå malm/minedrift og hvad der kun findes som legering/inklusion – se `MetalName`, `MINEABLE_METALS` og `ALLOY_ONLY_METALS` i `src/types.ts`. Op til 3 inklusioner (chars `1`, `2`, `3`) + speciel Guld (`X`). Vægtede rolls baseret på area-rarity.
- **Magiske effekter**: 9 properties (Ild, Frost, Lyn, Natur, Giftig, Helbredende, Sjælebindende, Tidskontrollerende, Radioaktiv) med rarity (common/uncommon/rare/legendary). 0-3 per gem (61.5% 0, 30% 1, 7% 2, 1.5% 3).
- **Andre parametre**:
  - Purity: 1-4 (påvirker flawless-mutation og værdi).
  - GodTier: ~12% chance (ekstra mutation + højere gold-chance).
  - Karat: Kun ved guld-inklusioner (9-24).
  - Mirror: 48% chance horisontal spejling.

### Hvordan generationen virker (RNG-baseret):
1. Vælg palette + template.
2. Mutate grid: sparkles (`W`), facets (`L`/`D` swaps).
3. Tilføj metal/guld-inklusioner (clumps).
4. Ekstra mutate ved høj purity/GodTier.
5. Optional mirror.
6. Tilføj magic properties.

**Hvor mange forskellige ædelsten kan genereres?**
- Teoretisk: 23 former × 14 paletter × 4 purity × (kombinationer af 8 metaller op til 3) × (kombinationer af 9 magic op til 3) × procedural mutations (sparkle/facet counts, positions) × mirror = **tusinder til millioner unikke gems**.
- I praksis: Variationerne er begrænset visuelt, fordi mutationerne kun ændrer få chars på en foruddefineret måde. Mange gems ser ens ud trods forskellige parametre – her ligger problemet med "for få variationer".

## Styrker i Systemet
- Fantastisk konsistens mellem 2D (grid-baseret canvas) og 3D-gengivelse.
- God RNG-følelse med rarity, value-beregning og GodTier.
- Enkel og effektiv kode.

## Udviklingsforslag – Konkrete Idéer til Mere Variation
Målet: Skab en følelse af **uendeligt flere eksotiske ædelsten** uden at bryde 2D/3D-konsistens. Fokus på farver, effekter, mønstre, blandinger og metaller – og på at nye typer forbliver konsistente med resten af spillet (herunder metal-ores og -barer som beskrevet i indledningen). **Navngivning** følger den fælles taxonomi (se tabellen under *Nuværende system*), så punkt 4 nedenfor er et integreret produktkrav, ikke kosmetik.

### 1. Udvid Paletter og Farver (høj prioritet)
- Tilføj 20-30 nye paletter: neon, pastel, gradient (bi-color), iriserende (farveskift), metallic sheens.
- Understøt dynamiske colorMaps med flere chars (f.eks. `P` for pattern, `I` for inclusion).
- Eksempel: `BiColorGradient` palette med to farver der blander sig.

### 2. Flere Effekter og Mønstre (avancerede mutations)
- Udvid `mutateGemData` med nye typer:
  - **Bånd/mønstre**: Vandrette/vertikale striber, speckles, veining.
  - **Lys-effekter**: Asterism (stjerne), chatoyancy (katteøje), opalescens.
  - **Inklusioner**: Krystal-frakturer, bobler, feather-inclusions.
- Nye chars i grids: `S` (star), `V` (vein), `C` (crack).
- Procedural patterns baseret på noise (Perlin/Simplex) for organisk look.

### 3. Eksotiske Metal-Blandinger og Spor
- Udvid METALS til 15+ (Platin, Titanium, Orichalcum, Obsidian osv.) – og opdater **alle** steder typen bruges: `types.ts`, `src/data/metals.ts`, områder/drops, crafting, UI, samt **2D- og 3D-modeller** for ny malm, klump og ingot så de matcher eksisterende stil.
- Layered metals: Flere typer i samme gem (f.eks. guld + sølv-veins).
- Avancerede inklusioner: Metalliske årer der følger silhuetten, rust-spots, rune-etchings.
- Speciel `addExoticMetalInclusions` funktion der kombinerer flere slots.

### 4. Navngivning som afledt af taxonomien (kerne, ikke polish)
- Udvid dagens `name`-felt så det **bygges fra taxonomi-lagene** (se tabellen ovenfor), med samme kildedata som UI og værdi bruger – undgå parallelle “navne-RNG” der ikke matcher stenen.
- Indfør små **navne-skabeloner** per magitype / metal / kvalitet (data-drevet i `src/data/`, ikke hårdkodet spredt i komponenter).
- **Længde- og duplikatregler**: maks længde til lister/tooltips; sammenlæg synonymer hvis samme lag bidrager dobbelt (fx palet + magi begge siger “ild”).
- Når nye paletter, metaller eller magi tilføjes (punkt 1–3), skal **navne-tabeller eller -mønstre opdateres samtidig**, så taxonomi → navn forbliver ét spor.

### (Valgfrit / Polish) Andre forbedringer for følelse af mangfoldighed
*Denne blok er ikke en del af kerne-scope; tag den med kun hvis du vil polere efter de vigtigere punkter 1–4.*

- **Visual enhancements**: Flere chars i templates for dybde (f.eks. facet-refleksioner).
- **Balancering**: Rarity-system der gør eksotiske sjældne, men mulige.
- **Performance**: Cache ofte brugte grids eller brug WebGL for mere komplekse 3D.
- **Achievements**: Evt. badges for særligt sjældne kombinationer, hvis det passer med øvrige systems.

### Prioriteret Implementeringsplan (high-level, ingen kodeændringer her)
1. Udvid data-filer (palettes, metals, magic, templates) og hold `MetalName` / mine vs. alloy-regler synkroniseret.
2. Opdater mutate-funktioner med nye effekter (punkt 1–2).
3. For hver ny metal- eller ædelstenstype: gennemgå mining, inventory, shop/salg, smykker, **2D-pixel**-repræsentation og **3D**-scener (ores, barer, drops) så intet halvfærdigt efterlades.
4. Implementér **navngivning fra taxonomi** (punkt 4): én funktion/sti der tager `Gem` (eller lag B–G) og returnerer `name`; udvid med nye datafelter når lagene udvides.
5. Test 2D/3D-konsistens og at **navne matcher** inklusioner, magi og kvalitet i UI og lister (din styrke).
6. *Valgfrit:* Arbejd igennem polish-sektionen ovenfor efter behov.

Med disse ændringer vil spillet føles som en uendelig skattekiste af unikke, eksotiske ædelsten – præcis som du ønskede fra starten.

---

## Risikovurdering

Ingen af punkterne nedenfor bryder spillet i sin nuværende form, men de er potentielle flaskehalse, der bør holdes i tankerne under implementering.

| # | Risiko | Sandsynlighed | Konsekvens | Anbefalet handling |
|---|--------|:---:|:---:|---|
| R1 | **Visuel variation forbliver begrænset** – mutations baseres på få chars og tilfældige swaps; nye paletter/effekter risikerer stadig "same look" uden avancerede mønstre (Perlin noise, veining, cracks) | Middel | Middel | Prioritér noise-baserede patterns (§2) tidligt; lav spot-tests med 10+ gems af samme palette ved review |
| R2 | **Navngivning følger ikke taxonomien** – `createRandomGem` genererer stadig simple navne; tooltip/UI vil ikke matche det spilleren ser, når metal/magi tilføjes | Høj | Middel | Implementér navne-DSL (§4) *inden* nye paletter og metaller goes live |
| R3 | **Halvfærdige features ved ny content** – den største risiko: ny metal/palette opdateres i `generate.ts` men glemmes i mining-pools, 2D/3D-assets, crafting, shop | Høj | Høj | Brug **Implementerings-checklisten** nedenfor; bloker merge indtil alle felter er afkrydset |
| R4 | **Performance ved mange gems** – noise-patterns + flere chars i grids + 3D kan give tung rendering på low-end devices, især i inventory med mange gems synlige | Lav | Middel | Cache genererede grids; mål FPS med 50+ gems i inventory inden noise-pr. release |
| R5 | **Økonomibal­ance skævvrides** – `computeGoldValue` er fin nu, men eksotiske metaller/magi kan gøre GodTier/legendary for sjældne eller for stærke | Middel | Lav | Kør simuleret loot-session (f.eks. 1.000 gems) og log value-distribution ved hver ny type |
| R6 | **Save-inkompatibilitet** – `GameState.version` skal opdateres hvis `Gem`-typen eller inventory-struktur ændres; glemmes det, crasher eksisterende saves | Lav | Høj | Tilføj "bump `version`" som obligatorisk punkt i checklisten nedenfor |
| R7 | **Lyd og musik ikke planlagt** – kan være bevidst, men skaber et mærkbart "tomt" feel efterhånden som visuelle effekter vokser | Lav | Lav | Notér som separat backlog-item; berør ikke dette roadmap |
| R8 | **Mobil/touch ikke testet** – spillet er web-baseret; nye interaktionspunkter (crafting, 3D-scene) kan bryde touch-flow | Lav | Middel | Manuel smoke-test på mobilbrowser ved større UI-ændringer |

---

## Implementerings-checkliste pr. ny Palette / Metal

Brug denne liste som **gate** for hver PR/commit der introducerer en ny palette eller metaltype. Ingenting merges, før alle relevante felter er afkrydset.

### Ny Palette

- [ ] `src/data/palettes.ts` – tilføj palette-objekt med alle 5 chars (`O`, `D`, `G`, `L`, `W`)
- [ ] `src/types.ts` – tilføj palette-navn til `PaletteName`-union (hvis den eksisterer)
- [ ] `src/gem/generate.ts` – verificér at den nye palette indgår i udvælgelsespuljen
- [ ] **Navngivning** – tilføj evt. farve-fraser eller præfikser til navne-skabelonerne i `src/data/` (§4)
- [ ] **2D-visning** – spot-test at `GemCanvas`-komponenten gengiver alle 5 chars korrekt for nye farver
- [ ] **3D-visning** – spot-test at 3D-scenen mapper de nye chars til korrekte materialer/shaders
- [ ] **Inventory / lister** – verificér at gem-kortet i inventory viser den nye palette uden artefakter
- [ ] **Shop/salg** – verificér pris/rarity stadig er fornuftig (R5)
- [ ] `GameState.version` – bump version hvis `Gem`-typen er udvidet (R6)
- [ ] Kør 20+ genererede gems af den nye palette og inspicér visuelt (R1)

### Nyt Metal (minebar eller legering)

- [ ] `src/data/metals.ts` – tilføj metal-objekt (navn, char, rarity, baseValue, farve/look)
- [ ] `src/types.ts` – tilføj til `MetalName`-union; placer i `MINEABLE_METALS` eller `ALLOY_ONLY_METALS`
- [ ] **Mining-logik** – opdatér `metalPool` / drop-tabeller for relevante mine-dybder/lokationer
- [ ] **Mining-drops** – tilføj rå malm/klump-drop til relevante lokationer (`src/data/locations.ts` e.l.)
- [ ] **2D-pixel assets** – opret/opdatér sprite for: rå malm, klump, bar/ingot (match eksisterende stil)
- [ ] **3D-scene** – tilføj 3D-model eller material for malm i minevisning og evt. inventory
- [ ] `src/gem/generate.ts` – tilføj metallets char til inklusions-logikken (`addMetalInclusions`)
- [ ] **Crafting** (`src/crafting.ts` e.l.) – tilføj smeltning/legerings-opskrifter hvis relevant
- [ ] **Smykkeværksted** – verificér at metallet kan bruges i jewelry-flows hvis intentionen er det
- [ ] **Inventory-rendering** – verificér at metallets ikon/label vises korrekt i inventory-slots
- [ ] **Shop/salg** – tilføj pris og sæt rarity-vægt så økonomi ikke skævvrides (R5)
- [ ] **Navngivning** – opdatér metal-fraser i navne-skabelonerne (`src/data/`) (§4, R2)
- [ ] `GameState.version` – bump version (R6)
- [ ] Kør simulation med 1.000 gems og log value-distribution (R5)

---

**Fil oprettet: 05. maj 2026 · Opdateret: 05. maj 2026**

---

*Kun placeret som anmodet – ingen ændringer i spillet.*
