# Fremtidige overvejelser — planlægning

*Status: Udkast til design-beslutning. Bygger på `fremtidige-overvejelser-inspiration.md` og `implementation-plan.md` §9. Formålet er at låse beslutninger og rækkefølge **før** der skrives en regulær implementations-guide.*

---

## Hvordan filen bruges

1. Læs §1 (forudsætninger) — disse beslutninger låser meget af det øvrige arbejde og skal afgøres først.
2. Gå igennem §2 (de seks områder). Hvert område har **🔵-beslutninger** der skal tages, med foreslåede valg og anbefalinger.
3. Brug §3 (afhængighedskort) og §4 (faseplan) til at vælge rækkefølge.
4. Udfyld §6 (beslutnings-checkliste) — den fungerer som direkte input til den regulære implementations-guide.

> **Notation**
> - 🔵 = Beslutning kræves fra dig (Anders) før kodning kan begynde
> - 🟢 = Anbefaling — skriv "OK" eller foreslå alternativ
> - 🟡 = Risiko-flag eller åben afklaring
> - ⚓ = Forudsætning — blokerer andet arbejde

---

## 1. Forudsætninger der låser alt det øvrige

Disse tre beslutninger ligger opstrøms for næsten alt andet og bør være de første du tager stilling til.

### ⚓ 1A. Run-inventory vs. hub-inventory (D7/D8)

**Problem:** Planen lover at død → tab af run-inventory, og safe-ascend → bærer ting til hub. Implementeringen er ikke færdig (jf. inspiration §3 og plan-§8b). Indtil dette er på plads kan **soul-bound, økonomi-balance og roguelike-tension ikke designes meningsfuldt**, og flere §9-punkter er reelt blokerede.

**🔵 Beslutning A1 — Strategi:**

- **(a) Implementér nu.** Næste milestone separerer `runInventory` og `hubInventory` reelt; D7/D8 opdateres til "implementeret". Mest arbejde, men oprydning der lukker mange døre.
- **(b) Officielt udsæt.** Tilføj midlertidig D-række (fx D7.5: "consumables er meta indtil videre"); soul-bound og brew+ får "venter på inventory-split" som blokerings-status.
- **(c) Hybrid.** Implementér kun for *kritiske* kategorier (fx våben + rustning); consumables forbliver meta.

**🟡 Bemærk:** (a) er det rene valg, men koster tid før synlige features. (b) accepterer at flere §9-punkter forsinkes. (c) introducerer kompleksitet der måske aldrig oprydes.

---

### ⚓ 1B. Progression-autoritet

**Problem:** I dag styrer `worldTier` / `depth` / mine-specifik dybde alle gates (crafting, drops, alkymi). Planens punkt 2 (player level) kan duplikere denne rolle og skabe dobbelt-grind.

**🔵 Beslutning A2 — Hvem ejer progression?**

- **(a) `worldTier`/`depth` forbliver eneste gate.** Player-level er kun butik/achievements/cosmetic-skala.
- **(b) Player-level får *egne* gates** parallelt (fx "kræver level 12 for at brygge X"). To uafhængige tracks.
- **(c) Player-level er afledt** af worldTier/depth (fx `level = floor(worldTier × N + bonus)`). Én sandhed, men afledt.

**🟢 Anbefaling:** (a) eller (c). (b) risikerer dobbelt-grind og balance-kaskade.

---

### ⚓ 1C. Loft-arkitektur for stats

**Problem:** Effektive lofter (`effectiveTotalHpMax`, `effectiveTotalManaMax`, `clampPlayerSurvival`) er det eneste rette sted at samle nye bonus-kilder. Hvis nye systemer skriver direkte til `playerHpMax` eksploderer balance-test og rettelser senere.

**🔵 Beslutning A3 — Standardiser kontrakt:**

- **(a)** Alle nye bonus-kilder *skal* gå gennem `effectiveTotal*`-pipelinen. Direkte mutation af `playerHpMax` etc. forbydes som anti-mønster — håndhæves i code review.
- **(b)** Tillad undtagelser, men dokumentér i kodekommentar.

**🟢 Anbefaling:** (a) — uden dette eksploderer balance-tests senere.

---

## 2. De seks §9-områder — design-pakker

For hvert område: kort hvad det er, åbne spørgsmål, forslag, og afhængigheder.

### 2.1 Armour-slot-udvidelse (hjelm / torso / støvler)

**Mål:** Fra én aktiv rustning til 2–4 slots, med nye `equipped*Id`-felter på `PlayerState`.

**Afhængigheder:** A3 (loft-arkitektur).

**🔵 Beslutning B1 — Antal slots:**

- (a) 3 slots: hjelm, torso, støvler.
- (b) 4 slots: + handsker.
- (c) 5 slots: + amulet/cape.

**🟢 Anbefaling:** (a) til v1.x — undgå inventory-overflow før kapacitet er afklaret.

**🔵 Beslutning B2 — Durability-model:**

- (a) **Per-slot durability** (uafhængigt slid). Flere reparations-events; taktisk dybde i hvad der prioriteres.
- (b) **Fælles "rustnings-helhed"** — én bar; simplere UI; mister taktisk valg.

**🔵 Beslutning B3 — Stacking-regler:**

- (a) **Additivt** — bonusser lægges sammen direkte.
- (b) **Diminishing returns** — fx `total = sum × (1 - decay × n)`.
- (c) **Soft cap** — additivt indtil cap, derefter 50 % effekt af det der ligger over.

**🟢 Anbefaling:** (c) — bevarer "sæt-bonus"-følelsen uden eksploderende skalering.

**🔵 Beslutning B4 — Smedje-økonomi:**

- (a) **Centraliseret cost-funktion** ét sted (gælder også våben).
- (b) Per-slot kul-formel.

**🟢 Anbefaling:** (a) — påkrævet for testbar balance og forenklet vedligehold.

**🟡 Risiko:** `inventoryCapacity.tools` rummer i dag rustning. Med 3+ slots ejet samtidigt i hub-inventory kræves enten separat `armourCapacity` eller udvidelse af `tools`.

---

### 2.2 Player level / XP-system

**Mål:** Tilføje et level-spor som multiplikator-lag oven på baseline (D38: brew bestemmer baseline mana, bevares i ånden).

**Afhængigheder:** A2 (progression-autoritet), A3 (loft-arkitektur).

**🔵 Beslutning C1 — Source af XP:**

- (a) Kun mine-kills og dybde-milestones.
- (b) Også crafting/alkymi.
- (c) Også butik/quests (hvis quests kommer).

**🔵 Beslutning C2 — Hvad level påvirker:**

- (a) **Kun butik/achievements/cosmetics** (jf. A2-a).
- (b) Multiplikator på `manaMax` (planens forslag — bevarer D38).
- (c) Multiplikator på både HP og mana.
- (d) Lås nye opskrifter/zoner.

**🟡 D38-overholdelse:** Brew skal stadig bestemme baseline. Level kan kun ganges *udenpå*, ikke erstatte.

**🔵 Beslutning C3 — XP-kurve:**

- (a) Lineær — forudsigelig.
- (b) Eksponentiel — klassisk RPG-følelse, men kræver nøje balance.
- (c) Plateau-baseret (fx 10 levels per worldTier).

**🟢 Anbefaling:** (c) — knytter level til eksisterende worldTier-struktur og forhindrer divergens fra A2.

---

### 2.3 In-game tid / dag–nat-cyklus

**Mål:** Skifte fra run-baseret til daglig (eller hybrid) restock plus eventuelle flavor-effekter (mob-spawns, butiks-rotation).

**Afhængigheder:** A1 (run/hub-split — uden den mister "dag" sin betydning).

**🔵 Beslutning D1 — Hvad *er* en dag?**

- (a) **Real-time** (24 t IRL) — knytter spillet til kalendertid; rart for "log ind dagligt"-vaner men kan friste til at "vente på reset".
- (b) **In-game tick** (fx 1 dag = 30 min spil-tid) — mere tilgængeligt, sværere at forklare for spilleren.
- (c) **Kun ved hub-sleep** — "tag et hvil" mellem runs trigger næste dag. Roguelike-natural.
- (d) **Hybrid** — handlinger forbruger tid, hvile springer til næste dag.

**🟢 Anbefaling:** (c) til MVP — nemmest at fortælle, påvirker færrest systemer, kan udvides til (d) senere.

**🔵 Beslutning D2 — Restock-filosofi:**

- (a) Behold run-baseret restock (D39) indtil tidsystem er live.
- (b) Skift restock til daglig samtidig med tidsystem.
- (c) Hybrid — kritiske items pr. run, sjældne items pr. dag.

**🟡 Bemærk:** (b) skal følges af eksplicit D-række-opdatering, ellers brydes D39 stille.

---

### 2.4 Soul-bound items

**Mål:** Markere udvalgte items som "overlever død" via nyt D-flag `soulBound: true`. Overstyrer D37.

**Afhængigheder:** ⚓ A1 (run/hub-split). Uden dette er soul-bound meningsløs.

**🔵 Beslutning E1 — Hvilke kategorier får soul-bound?**

- (a) Quest tools / nøgle-items.
- (b) Signaturvåben (én pr. spiller).
- (c) Cosmetics (intet gameplay-impact).
- (d) Alle tre.

**🔵 Beslutning E2 — Hvor lever de?**

- (a) Som flag på items i **hub-inventory** (overlever altid, kan ikke mistes).
- (b) Som flag der overlever **run-inventory wipe** men kan **mistes ved særlige scenarier** (fx PvP, hvis det nogensinde kommer).
- (c) Separat `soulBoundContainer` der eksisterer uafhængigt af både run og hub.

**🟢 Anbefaling:** (a) — simplest, holder D7/D8 rene, ingen ny container-type.

**🔵 Beslutning E3 — Begrænsning:**

- (a) Maks N soul-bound items totalt (slot-økonomi).
- (b) Ubegrænset, men kun udvalgte item-typer kan være soul-bound.

---

### 2.5 Multi-target combat / AoE-evner (brew+)

**Mål:** Flere brew-`abilityId`'er får numerisk/mekanisk effekt udover narrativt tooltip.

**Afhængigheder:** Ingen *blokerende*, men A1 påvirker hvordan brews opbevares mellem runs.

**🔵 Beslutning F1 — `abilityId`-kontrakt:**

- (a) Hver `abilityId` *skal* have **mindst én numerisk effekt** i mine-reducer (kontrakt håndhæves).
- (b) Tillad rene "fluff"-evner, men markér eksplicit i data (fx `effect: null, fluffOnly: true`).

**🟢 Anbefaling:** (a) — kontrakten gør test og balance mulig; "fluff"-evner kan i stedet være item-tooltip.

**🔵 Beslutning F2 — AoE-mål-model:**

- (a) **Alle mobs på laget** — simpel, men hurtigt overpowered.
- (b) **Adjacente slots** — taktisk; kræver position-model.
- (c) **Frontlinje + bagved** (2 lag) — mellemvej.
- (d) **"Fork"** — primær mål + N tilfældige sekundære.

**🟢 Anbefaling:** (b) eller (d). (a) bliver hurtigt overpowered og dræber mob-design.

**🔵 Beslutning F3 — Slot-model:**

- (a) Behold nuværende felt-baseret slot-model; AoE arbejder oven på.
- (b) Refaktor til position-grid (forberedelse til mere kompleks mob-AI).

**🟡 Risiko:** (b) er en større refaktor — kan undervurderes og bør sandsynligvis udskydes til efter brew+ MVP.

---

### 2.6 Achievement-udvidelser ("any mine" + telemetri)

**Mål:** Et lag oven på mine-specifikke achievements + eventuel telemetri.

**Afhængigheder:** Ingen blokerende — kan startes tidligt.

**🔵 Beslutning G1 — "Any mine"-data-model:**

- (a) **Aggregér ved query** — gå igennem `unlockedDepths` på read-tid.
- (b) **Separat tæller** opdateret on-event.
- (c) Hybrid — separat tæller for hot path, aggregér for nye achievements.

**🟢 Anbefaling:** (a) til MVP — undgår dobbelt save-felt og dobbelt-optælling, jf. inspirationens advarsel. (b) kun hvis perf bliver et reelt problem.

**🔵 Beslutning G2 — Telemetri-niveau:**

- (a) **Kun lokal logging** (debug + offline statistik). Ingen netværk.
- (b) **Opt-in upload** til en backend (kræver privacy-policy + endpoint).
- (c) Ingen telemetri overhovedet.

**🟢 Anbefaling:** (a) — ren, offline-first, forenelig med spillets karakter.

**🟡 Hvis (b) vælges:** kræves separat plan for backend, GDPR/datapolitik og opt-in UI.

---

## 3. Afhængighedskort

```
A1 (run/hub-split) ──┬──> 2.4 Soul-bound        (BLOKERER)
                     ├──> 2.3 Tidsmodel          (afhænger)
                     └──> 2.5 Brew+              (påvirker opbevaring)

A2 (progression-autoritet) ──> 2.2 Player level   (BLOKERER)

A3 (loft-arkitektur) ──┬──> 2.1 Armour-slots
                       └──> 2.2 Player level

2.1 Armour ──> 2.6 Achievements (rustnings-relaterede milepæle)
2.5 Brew+  ──> 2.6 Achievements (kombo-relaterede)

2.6 Achievements ("any mine"): ingen blokerende afhængigheder — kan starte tidligt
```

---

## 4. Foreslået faseplan

**Fase 0 — Beslutninger og forudsætninger** *(uge 0)*
Afgør alle ⚓ A1, A2, A3. Opdatér `implementation-plan.md`'s D-rækker med valg. Skitsér migration-strategi (`CURRENT_STATE_VERSION` bump pr. fase eller pr. subsystem).

**Fase 1 — Foundation** *(lav risiko, høj værdi)*
- §2.6 Achievements "any mine" (ingen afhængigheder).
- A3-overholdelse: refaktor af eventuelle direkte `playerHpMax`-mutationer (oprydning).

**Fase 2 — Inventory-split** *(kun hvis A1 = "implementér nu")*
- Run/hub-inventory split — den store kode-leverance.
- Migration + integrationstest på gamle saves.

**Fase 3 — Additive systemer** *(efter A1)*
- §2.1 Armour-slots (3 slots, soft cap stacking, central cost-funktion).
- §2.4 Soul-bound (hub-flag-model).

**Fase 4 — Progression**
- §2.2 Player level (multiplikator-lag, overhold D38).

**Fase 5 — Tid og indhold**
- §2.3 Tidsmodel (hub-sleep MVP).
- §2.5 Brew+ (numerisk kontrakt + AoE-mål-model).

**Fase 6 — Polering**
- Balance-pass på `effectiveTotal*`.
- Achievement-udvidelse til nye systemer.
- Eventuel telemetri (hvis G2 = b).

---

## 5. Risici og mitigering

| Risiko | Mitigering | Hvem ejer |
|---|---|---|
| Scope creep i hver §9-pakke | Tving MVP-tærskel pr. fase; udskyd "nice-to-have" | Du |
| Balance-kaskade (level × armour × brew × depth) | Soft caps + automatiseret regressionstest på `effectiveTotal*` | Implementering |
| Save-korruption ved mange parallelle systemer | Per-subsystem schema-version; defensive defaults; integrationstest på gamle saves | Implementering |
| UX-forvirring ved flere "blueprint"-typer | Én terminologi-pass før Fase 3; aliases hvor nødvendigt | Du + UI-pas |
| Mine-run-inkonsistens ved crash | "Genoptag run"-dialog ELLER best-effort reset ved load (vælg én før Fase 2) | 🔵 Beslutning H1 |
| Brew `abilityId` uden effekt-kontrakt | F1 = (a) gør dette eksplicit testbart | Implementering |

**🔵 Beslutning H1 — Crash recovery i mine:**

- (a) "Genoptag run"-dialog ved load.
- (b) Best-effort reset (mister run, men bevarer hub).
- (c) Begge — dialog hvis muligt, fallback til reset.

**🟢 Anbefaling:** (c).

---

## 6. Beslutnings-checkliste

Når alle felter er udfyldt, kan vi producere den regulære implementations-guide.

| Kode | Beslutning | Dit valg | Note |
|---|---|---|---|
| A1 | Run vs. hub inventory-strategi |  |  |
| A2 | Progression-autoritet |  |  |
| A3 | Loft-arkitektur kontrakt |  |  |
| B1 | Antal armour-slots |  |  |
| B2 | Durability-model |  |  |
| B3 | Stacking-regler |  |  |
| B4 | Smedje-økonomi |  |  |
| C1 | XP-source |  |  |
| C2 | Hvad level påvirker |  |  |
| C3 | XP-kurve |  |  |
| D1 | Hvad er en "dag" |  |  |
| D2 | Restock-filosofi |  |  |
| E1 | Soul-bound kategorier |  |  |
| E2 | Soul-bound opbevaring |  |  |
| E3 | Soul-bound begrænsning |  |  |
| F1 | `abilityId`-kontrakt |  |  |
| F2 | AoE-mål-model |  |  |
| F3 | Slot-model refaktor? |  |  |
| G1 | "Any mine" data-model |  |  |
| G2 | Telemetri-niveau |  |  |
| H1 | Crash recovery i mine |  |  |

---

## 7. Næste skridt

1. **Du:** Udfyld §6-checklisten (også med fritekst hvor der er nuancer).
2. **Sammen:** Vurder afhængigheder igen efter dine valg — A1's resultat kan rykke faseplanen markant.
3. **Mig:** Producer regulær implementations-guide (`implementation-guide.md`) opdelt pr. fase, med konkrete D-rækker, kode-targets, migrations-skemaer og test-kontrakter.
4. **Senere:** Opdater `implementation-plan.md` §9 til at pege på de færdige fase-leverancer.

---

*Filen er levende — opdater når en beslutning bliver låst, eller en risiko realiseres.*
