# Alkymistværksted, lejr-regenerering og farvet mana — koncept

**Status:** Udvidelsesdesign (supplerer mine-lag-systemet)  
**Relation:** Læses sammen med [`mine-layers-depth-target-concept.md`](./mine-layers-depth-target-concept.md) og [`mine-layers-implementation-guide.md`](./mine-layers-implementation-guide.md). Denne fil introducerer **nye** systemer og **nye** beslutningspunkter; den ændrer ikke automatisk beslutningslog **D1–D14**, men beskriver hvor en fremtidig udvidelse af loggen (fx **D15+**) eller en separat “survival/alchemy”-log kan være nødvendig.

---

## 1. Overordnet vision

- **Nyt verdenskort-sted:** **Alkymistværksted** — hvor spilleren **blander ingredienser** til potions og kan **købe færdige** drikke/eliksirer.
- **I minen:** synlig **livbar (HP)** og **magibar (mana)**; spilleren kan **tage skade fra mobs** (når mobs findes, jf. implementeringsguiden **§3 / D14 Fase 2**).
- **På overfladen / i lejren:** HP og mana **fyldes automatisk op** (ingen ressource-jagt for basissurvival dér — fokus på forberedelse før dive).
- **I minen:** HP og mana kan **genopfyldes** ved at **drikke potions** og **spise mad** (forbrugsvarer i run-inventory).
- **Mana er utraditionelt:** hvad man har drukket bestemmer **hvilken evne** (eller evne-*pakke*) der er aktiv, og **mana-barens farve** afspejler den aktive brew (fx **gul styrke** → gul bar + én bunden evne; **blå** → anden evne + blå bar). Senere kan flere farver/loyer bygges ovenpå samme kerne.
- **MVP:** I starten rækker det med **liv + simpel mana** (én “neutral” mana-type eller én farve); resten af det farvede/ability-koblede setup **tilføjes lagvis** uden at rive MVP ned.

---

## 2. Placering på verdenskort og hub-loop

- Alkymistværkstedet er et **besøgsmål** på verdenskortet (side om side med by/hub, miner, evt. andre steder).
- Det understøtter det eksisterende **meta-loop**: forberedelse mellem runs (handel, upgrades) fra [`mine-layers-depth-target-concept.md`](./mine-layers-depth-target-concept.md) §6 — alkymi bliver et **dedikeret forberedelseslag**, ikke et minesporskifte.

**Konsekvens for [`mine-layers-implementation-guide.md`](./mine-layers-implementation-guide.md):** Verdenskort-, rejse- og `Area`-/`LocationId`-data skal udvides med workshoppen uden at bryde per-mine `RunState`. Tænk “hub facilities” som **permanent** progression/unlocks (potions opskrifter, hylder i butikken), på linje med `PermanentProgress`.

---

## 3. Lejr / overflade vs. mine (regenerering)

| Kontekst | HP | Mana | Note |
|----------|----|------|------|
| **Lejr / overflade** (definition nedenfor) | Auto til max | Auto til max | Ingen forbrug af potions; understøtter rolig forberedelse. |
| **I minen (aktiv run)** | Falder ved mob-skade; kan heales via mad/potions | Forbruges ved brug af evner; kan fyldes via potions | Matcher risiko i dybden. |

**“Lejr / overflade”** bør defineres teknisk entydigt, fx:

- `locationKind === 'surface' | 'camp' | 'town'` **eller**
- `!isInActiveMineRun` **eller**
- eksplicit flag `regenEnabled: boolean` afledt af scene.

**Konsekvens:** Combat/survival-logik skal kende **run-kontekst** (samme skeln som mellem `RunState` og hub). Auto-regen må **ikke** køre i minen, ellers undermineres spend af potions.

---

## 4. Potions, mad og økonomi ift. run-regler

- **Købte** og **selvblandede** potions/mad er **inventory-genstande** der kan medtages på dive (medmindre I bevidst låser visse ting til hub-only).
- **D7 / D8** ([`mine-layers-implementation-guide.md`](./mine-layers-implementation-guide.md) §1): Ved **død** tabes run-inventory inkl. potions/mad på personen *medmindre* I senere indfører undtagelser (fx “soul-bound” flasker — så kræver det **ny beslutning** og ny log-række). Ved **safe ascend** følger inventaret hub — konsistent med nuværende **D8**.
- **D4** (auto-saml ground loot ved lag-skifte): overvej om dropped **mad/potions** på jorden skal følge samme auto-pickup eller kræve manuel opsamling — **åbent produktvalg**; dokumentér når det låses.

---

## 5. Farvet mana og evner (“brew stance”)

### 5.1 Kerneidé

- Mana er ikke én statisk ressource med ét fast evnesæt; den er **koblet til den seneste aktive brew** (eller til en **aktiv buff-slot** der repræsenterer hvad man har drukket).
- **Barfarve** = spillerens **øjeblikkelige mana-“identitet”** (gul/blå/…).
- **Evner** der bruger mana er **bundet til den aktive identitet** — drikker man noget andet, **skifter** identitet (og typisk barfarve + tilgængelige evner).

### 5.2 MVP vs. senere lag

| Fase | Indhold |
|------|---------|
| **MVP** | Én global mana-pool + én heal/fokus-evne **eller** én “neutral” farve; stadig HP-bar + mana-bar i minen. |
| **Udvidelse** | Flere brew-typer → farver + unikt evnesæt pr. type; stacking/regler for at blande to buffs (eller forbud). |

### 5.3 Design- og implementeringsimplikationer

- **State:** Gem `activeBrewId`, `manaCurrent`, `manaMax`, evt. `duration` eller “indtil hvilet”.
- **UI:** Mana-bar er **themebar** (CSS/Three HUD) baseret på `activeBrewId`; tooltip forklarer aktiv evne.
- **Konflikt-risiko:** Hvis auto-regen på overfladen også fylder mana op “til max”, skal **max** og **farve** være veldefineret (fx max altid baseret på player level + brew, eller kun brew).

---

## 6. Alkymistværksted: blanding vs. køb

- **Blanding:** Mini-crafting UI med ingrediensliste, opskrifter (låst op over tid), og evt. `worldTier` ([**D10**](./mine-layers-implementation-guide.md)) som gate for sjældne ingredienser eller kvalitet — *uden* at blande det sammen med mine-dybde som direkte crafting-input i minen.
- **Køb:** Butik-inventar af færdige potions (pris, tier, restock mellem runs).

**Skeln fra smykker/gems:** Alkymi kan dele **økonomi-pipeline** (guld, drops) men bør have **egen data-domæne** (opskrifter, effekter, buff-definitions) så [`mine-layers-implementation-guide.md`](./mine-layers-implementation-guide.md) §4 forbliver retningsgivende for *jewelry*, mens potions får egne tabeller.

---

## 7. Kobling til mine-implementering (konkret)

| Guide-afsnit | Påvirkning |
|--------------|------------|
| **§2.1 Typer** | Udvid `RunState` eller parallel **player combat state**: `hp`, `mana`, `activeBrewId`, evt. buff-array; synk med save. |
| **§2.7 Run-afslutning** | Ved død: nulstil HP/mana eller kun ved nyt run — afstem med hub-regen; ved safe ascend: behold HP/mana som ved hub eller sæt til max (produktvalg). |
| **§3 Fase 2 (mobs)** | Mob-skade reducerer **player HP**, ikke klippe-`SlotState`; aggression/AI separat fra mining hits. |
| **§6 Tests** | Tilføj: ingen regen i mine; regen på overflade; potion restore; brew-skift skifter farve + evne-slot. |
| **§7 Persistens** | Save skal inkludere consumables + aktiv brew hvis den overlever save/load midt i run. |

---

## 8. Åbne produktbeslutninger (til senere låsning)

Disse bør enten flyttes til hovedkonceptets beslutningslog som **D15+** eller til en separat “survival”-log når I er klar:

1. Overfladeregen: **øjeblikkelig** fuld heal vs. **gradvis** tick i lejren.
2. Ved **brew-skift** midt i minen: overskriv tidligere buff helt, eller kort overlap?
3. **Mad** vs. **potions**: samme inventory-slot-type eller separat “proviant”?
4. Skal **mana** være delt på tværs af brews eller separat pool pr. farve efter skift?
5. Safe ascend: **fuld heal** ved hub-entry som convenience, eller bevare run-slitage for narrativ stramhed?

---

## 9. Opsummering

Alkymistværkstedet og survival-laget (HP/mana, lejr-regen, forbrug i minen) er **orthogonalt** til mine-lag og persistente klippe-slots, men **integreret** via **run-inventory**, **run-kontekst**, **Fase 2 combat**, og **save-format**. Det farvede mana-setup er en **egen subsystem-identitet** der bør prototyperes med **simpel MVP** før fuld farve-/evne-matrix.

Når I låser §8-punkterne, opdater [`mine-layers-implementation-guide.md`](./mine-layers-implementation-guide.md) med en kort **§9 eller bilag** (“Player survival & alchemy”) og evt. nye testcases — så mine-sporet og survival-sporet forbliver sporingsbare side om side.
