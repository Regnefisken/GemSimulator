# Fremtidige overvejelser — inspiration

*Udkast til diskussion og prioritering efter den samlede implementeringsplan (Fase 1–5). Baseret på `implementation-plan.md` §9 og erfaringer fra faktisk kodeleverance (alkymi, brews, rustning, mine-run-livscyklus, save-migrationer).*

**Formål:** Samle de seks planlagte fremtids-punkter med konkret retning, pege på **risici** og **beslutninger** der bør tages tidligt, så næste iteration ikke starter fra nul.

---

## 1. Udgangspunkt: de seks punkter fra planen (§9)

Nedenfor er hvert punkt fra master-planen udbygget med inspiration til *hvad* det kan betyde i praksis — ikke endelig specifikation.

### 1) Armour-slot-udvidelse (hjelm / torso / støvler)

- **Planens løfte:** Nye slot-felter på `PlayerState` uden save-brud; kun additive felter.
- **Inspiration:** Genbrug mønsteret fra **én** `activeArmourId` → `equippedHelmetId | null`, `equippedChestId | null`, osv. Afklar om **bonuses stacker additivt** eller har **diminishing returns** for at undgå uendelig skalering.
- **Nær beslutning:** Skal hvert slot have **egen durability** (som i dag) eller fælles "rustningens helhed"? Påvirker smedje-UI og kul-økonomi.

### 2) Player level / XP-system

- **Planens løfte:** Hvis level introduceres, indgår det som **multiplikator** oven på `manaMax`-formlen; **D38** (brew bestemmer baseline) bevares i ånden.
- **Inspiration:** I dag findes allerede `level` / `xp` i `GameState` til butik — spørgsmlet er om **combat/mine-level** får egne stats eller deler det samme level.
- **Nær beslutning:** Må level **øge intrinsisk** `playerHpMax`, eller kun påvirke butik/achievements? Undgå dobbelt tælling sammen med rustning og brew.

### 3) In-game tid / dag–nat-cyklus

- **Planens løfte:** Restock (D39) kan skifte fra **pr. run** til **daglig** (eller hybrid).
- **Inspiration:** I dag: `MINE_RUN_EXIT` + død-scenarier triggere værksteds-restock. En tidsmodel kræver **én sandhed** for "hvad er en dag" (real-time, in-game tick, kun ved hub-sleep?).
- **Nær beslutning:** Bevar **run-baseret** restock som default indtil tidsystem findes; dokumentér så D39 ikke brydes stille i balance.

### 4) Soul-bound items

- **Planens løfte:** Nyt D-flag `soulBound: true` — **D37** (intet soul-bound i v1) er så overstyret for udvalgte items.
- **Inspiration:** Konflikt med **D7** (død = tab run-inventory) så længe run–hub ikke er adskilt i data (se nedenfor). Soul-bound giver kun mening hvis I ved præcis **hvad** der overlever død vs. hub.
- **Nær beslutning:** Hvilke kategorier? (fx "quest tool", "signeret våben") — og skal de tælle i **consumable-bag** eller **permanent equipment**?

### 5) Multi-target combat / AoE-evner (brew+)

- **Planens løfte:** Udvide brews med rækkevidde udover single-target.
- **Inspiration:** Mob-AI og slot-model er i dag felt-baseret; AoE skal **definere mål** (alle mobs på laget, kun adjacente slots, "fork fork"?).
- **Nær beslutning:** Evne-id på brew (`abilityId`) skal mappes til **konkret reducer-handling** — i dag er nogle evner primært narrative/tooltip uden gameplay-effekt; afklar minimum-viable **én numerisk effekt** pr. evne.

### 6) Achievement-udvidelser ("any mine", telemetri)

- **Planens løfte:** D11 "any mine" som senere lag oven på eksisterende mine-specific achievements.
- **Inspiration:** `unlockedDepths`, `mineId`, og legacy `depth` / `worldTier` skal forblive **konsistente** i migration og achievements — undgå dobbelt optælling.
- **Nær beslutning:** Privacy/offline-first — hvis "telemetri" kun betyder intern logging vs. virkelig upload, skriv det eksplicit i produktkrav.

---

## 2. Vigtige erfaringer fra implementeringsarbejdet

Disse observationer er ikke i §9, men har vist sig centrale i kodbasen.

### Navngivning og parallelle "unlock"-kataloger

- **`unlockedBlueprints`** (smykker + kiste-blueprints) må ikke omdøbes uden migration — planens `unlockedRecipes`-begreb er delvist dækket af **`unlockedAlchemyRecipes`** til alkymi. Fremtidige opskrifts-typer: **nyt felt eller dokumenteret alias**, ikke silent overload af samme array.

### `mineRun` og `MINE_RUN_EXIT`

- Bevidst **ikke** på `MineScreen` unmount — kun når bruger forlader til kort med aktiv run (`goToMapView`). Det gør **genbesøg af samme lokation** muligt uden at rive run ned.
- Konsekvens: Ethvert nyt "afslut run"-behov (fade, cutscene) skal **eksplicit** koble til samme exit-pipeline, ellers divergerer state og spillerforventning.

### Effektive loft (HP / mana)

- **Rustning** og **brew** lægges som bonus oven på intrinsisk/baseline-loft via **`effectiveTotalHpMax` / `effectiveTotalManaMax`** og `clampPlayerSurvival`. Nye systemer (level, buffs) bør **tilsluttes samme mønster** i stedet for at skrive `playerHpMax` om overalt.

### Smedje og repair

- Kul-formel er **delt** mellem våben og rustning; udvidelser (flere slots, item-kvalitet) bør **centralisere** cost-funktion ét sted for balance og tests.

### Migrationer og versionsfelt

- Hver betydelig tilstand har brug for **`CURRENT_STATE_VERSION` bump**, merge felter i `migrateGameState`, og **normalisering** (fx `activeArmourId` peger på ikke-eksisterende id → `null`). Fremtidig kompleksitet: overvej **feature flags** i save eller schema-version pr. subsystem hvis migration-blokke bliver uoverskuelige.

---

## 3. Kendt hul i forhold til planen (høj prioritet som design-emne)

### Run-inventory vs. hub-inventory (D7 / D8)

- Planen forudsætter at **død** taber run-inventory og at **safe ascend** bærer ting til hub; §8b noterer at dette **ikke** er fuldt implementeret — `consumables` lever som meta-state som i tidlig fase.
- **Risiko:** Soul-bound, økonomi-følelse og "roguelike tension" kan ikke afbalanceres før denne skelnen er på plads.
- **Beslutning der bør komme før store økonomi-features:** Enten **implementere D7/D8 ordentligt** eller **officielt udsætte** og opdatere beslutningslog med en midlertidig D-erstatning.

---

## 4. Potentielle risici

| Risiko | Hvorfor det matter | Mulig mitigering |
|--------|-------------------|------------------|
| **Scope creep i "v1.x"** | §9-punkter kan hver især blive et mini-spil (tid, soul-bound netcode). | Fasthold **inspiration vs. leverance**; skær ud MVP per punkt. |
| **Balance-kaskade** | XP × brew × rustning × depth × drops kan eksplodere numerisk. | Én **balance-pass** med caps; regressionstests på `effectiveTotal*`. |
| **Save-korruption / migration-stød** | Flere parallelle unlock-lister og version bumps. | Integrationstest på **gamle saves**; defensive defaults i `migrateGameState`. |
| **UX-forvirring** | Mange faner (butik, værksted, smedje) og forskellige "blueprint"-begreber. | Terminologi-gennemgang i UI (dansk labels + tooltips). |
| **Hot reload / crash** i mine | §8b: `mineRun` kan efterlades inkonsistent. | Evt. "genoptag run" dialog eller **best-effort reset** ved load. |

---

## 5. Design-beslutninger der bør træffes i den nærmeste fremtid

Prioriteret som "hvad der låser mest senere arbejde".

1. **Run vs. hub inventory (D7/D8)** — Go/no-go på reel implementering i næste milestone, eller eksplicit "postponed" i plan.
2. **Én sandhed for progression** — Om **worldTier** / `depth` / mine-specifik dybde fortsat er de eneste gates for crafting, drops og alkymi; eller om **player level** får egne gates (undgå dobbelt grind).
3. **Brew-evner vs. tooltip** — Kontrakt: hver `abilityId` har mindst **én målbar effekt** i mine (eller markeres som "kun fluff").
4. **Restock-filosofi (D39)** — Bevar run-baseret indtil in-game tid findes; dokumentér i én sætning i beslutningslog når tid-modellen ændres.
5. **Armour ved flere slots** — Stacking-regler og UI-kapacitet (`inventoryCapacity.tools` vs. separat rustningskapacitet).
6. **Achievements** — Om "any mine" er **samme save-stat** som per-mine eller separat tæller (påvirker save-format).

---

## 6. Sådan kan filen bruges

- **Produkt:** Prioriter §9-punkter og kryds af mod risiko/beslutninger.
- **Teknik:** Opret issues eller epics der refererer til beslutningerne i afsnit 5 og til run/hub-inventory hullet.
- **Plan:** Opdater `implementation-plan.md` changelog når en §9-linje bliver til rigtig D-række og scope.

---

*Denne fil er meningsmæssigt uafhængig af versionsnummer i spillet; opdater den når I lukker større beslutninger eller ændrer D7/D8-status.*
