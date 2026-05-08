# Implementeringsguide

*Producerende kontrakt for Composer-leveret kode. Bygger på `fremtidige-overvejelser-inspiration.md`, `fremtidige-overvejelser-planlaegning.md` og `implementation-plan.md`. Alle beslutninger fra planlægningens §6-checkliste låses i denne fil efterhånden som de tages.*

**Status:** Komplet draft (v1.6-revideret). Alle seks faser fuldt specificeret med D-rækker D40–D70. D64+D65 revideret efter review-feedback (run-exit-tidsmodel + valid-run-gate). D70 tilføjet som deferred. Klar til review og kodning.

---

## 0. Læseanvisning

Dette er en **leverance-kontrakt**, ikke en designdiskussion. For hvert element gælder:

- **Mål** — hvad skal være sandt når fasen er færdig.
- **D-rækker** — hvilke beslutnings-D-rækker fasen tilføjer eller ændrer i `implementation-plan.md`.
- **Kode-targets** — hvilke filer/moduler/funktioner berøres.
- **Migration** — eksplicit `CURRENT_STATE_VERSION`-bump og felt-deltaer.
- **Test-kontrakter** — hvad der skal være dækket før fasen lukkes.
- **Acceptkriterier** — verificerbare check-points.

> **Vigtigt for Composer:** Læs §1 (konventioner) før du rører kode. Brydes en konvention skal det dokumenteres som en bevidst undtagelse i en kommentar med begrundelse, og rejses som review-emne.

---

## 1. Konventioner og kontrakter

### 1.1 D-række-format

Alle nye beslutninger der introduceres af denne guide tilføjes til `implementation-plan.md`'s beslutningslog som `Dxx`-rækker. Format:

```
D<NN>. <kort titel> — <beslutning i én sætning>.
       Kontekst: <hvorfor>. Bevis: <test/kode-reference>.
```

Hvis en beslutning **overstyrer** en tidligere D-række, skal den nye række eksplicit referere den gamle (`overstyrer D37`), og den gamle markeres som `[supersedet af DNN]` i loggen — den slettes ikke.

### 1.2 Loft-arkitektur (A3-håndhævelse)

> **D-række (ny): D40. A3 — Håndhævet effectiveTotal-pipeline.** Alle nye bonus-kilder for `playerHpMax`, `playerManaMax` og fremtidige clamp-stats *skal* gå gennem `effectiveTotalHpMax` / `effectiveTotalManaMax` / tilsvarende. Direkte mutation af `playerHpMax` etc. uden for `clampPlayerSurvival` er forbudt og skal afvises i review.

**Kontrakt:**

- Alle læse-sites bruger `effectiveTotal*`-getterne — aldrig den rå `playerHpMax`.
- Alle skrive-sites går gennem `clampPlayerSurvival` (eller det tilsvarende mana-clamp).
- Nye bonus-kilder registreres som named contributors (se §3.x når Fase 3 skrives) — ikke ved at mutere baseline.

### 1.3 Migrations-strategi

`CURRENT_STATE_VERSION` bumpes **én gang pr. fase der ændrer save-format**. Hver bump skal:

1. Tilføje en migrationsfunktion `migrate_v<N>_to_v<N+1>(state)` i `migrateGameState`.
2. Sætte defensive defaults for nye felter.
3. Normalisere referencer (fx `activeArmourId` der peger på ikke-eksisterende id → `null`).
4. Have en integrationstest der loader en gemt v1-baseline og verificerer post-migration shape.

> **D-række (ny): D41. Schema-version pr. subsystem (valgfri).** Hvis migration-blokke i `migrateGameState` overstiger ~150 linjer eller bliver svære at læse, må subsystemer få egen `subsystemVersion` (fx `armourSchemaVersion`). Beslutningen tages ad hoc pr. fase og dokumenteres her.

### 1.4 Test-kontrakter

Hver fase kræver minimum:

- **Migrationstest** på reelle gamle saves (brug seed-saves checked ind i `__fixtures__/saves/`).
- **Reducer-test** for nye actions, både happy path og defensiv default.
- **Effektivitets-test** for hver ny bonus-kilde gennem `effectiveTotal*`.
- **Regressionstest** af eksisterende balance-tests — ingen tal må ændre sig utilsigtet.

### 1.5 Terminologi

For at undgå "blueprint"-forvirring (jf. inspiration §2):

- `unlockedBlueprints` — smykker + kister, **uændret navn**, må ikke omdøbes uden migration.
- `unlockedAlchemyRecipes` — alkymi-opskrifter.
- Nye opskrifts-typer **får nyt felt** (fx `unlockedSmithingPlans`) — ingen silent overload.

---

## 2. Faseoversigt

| Fase | Titel | Forudsætninger | Status |
|---|---|---|---|
| 0 | Beslutninger og scaffolding | — | **Aktiv** |
| 1 | Foundation: A3-cleanup + "any mine" achievements + lokal telemetri-baseline | Fase 0 | Klar til kodning |
| 2 | Run/hub-inventory split — Sikret Loadout + Redningstaske (A1) | Fase 0 | Mekanik låst, detaljer åbne |
| 3 | Armour-slots + soul-bound | Fase 2 | Fuldt låst (D53–D60) |
| 4 | Player level (butik-eksklusiv per A2) | Fase 1 | Fuldt låst (D61–D63) |
| 5 | Tidsmodel + brew+ AoE (Fork) | Fase 2 | Fuldt låst (D64–D68) |
| 6 | Polering, balance-pass, crash recovery | Alle | Fuldt låst (D69) |

---

## Fase 0 — Beslutninger og scaffolding

**Mål:** Lås foundational-beslutninger i kode og dokumentation. Etablér migrations- og test-baseline, så efterfølgende faser kan ændre save-format trygt.

### 0.1 Lås foundational-beslutninger i `implementation-plan.md`

Tilføj følgende D-rækker (eksakt ordlyd):

```
D40. A3 — Håndhævet effectiveTotal-pipeline.
     Beslutning: Alle nye bonus-kilder for player-stats skal gå gennem
     effectiveTotalHpMax / effectiveTotalManaMax / clampPlayerSurvival.
     Direkte mutation af playerHpMax etc. er anti-mønster.
     Kontekst: Forhindrer balance-eksplosion ved level/armour/brew-stacking.
     Bevis: Tests i __tests__/effectiveTotal.test.ts (Fase 1).

D42. A2 — Progression-autoritet: worldTier/depth alene.
     Beslutning: worldTier og depth (incl. mine-specifik dybde) er eneste
     gates for crafting, drops og alkymi. Player-level (Fase 4) påvirker
     udelukkende butik, achievements og cosmetics.
     Kontekst: Undgår dobbelt-grind og parallel progression-track.
     Bevis: Ingen `requiredLevel` i recipe/drop-tabeller (assertion-test).

D43. A1 — Run/hub-inventory implementeres reelt.
     Beslutning: Fase 2 separerer runInventory og hubInventory.
     D7 (død = tab af run-inventory) og D8 (safe-ascend bærer til hub)
     går fra "delvist" til "implementeret".
     Kontekst: Låser soul-bound, tidsmodel og brew+ op for design.
     Bevis: Migration v<N>→v<N+1> + tests (Fase 2).
```

**Acceptkriterium:** D40, D42, D43 findes i `implementation-plan.md` med korrekte cross-referencer. D7 og D8 opdateret med `[se D43]`.

### 0.2 Migrations-scaffolding

Inden Fase 1 begynder skal følgende være på plads:

- En `__fixtures__/saves/` mappe med mindst tre seed-saves: `early-game.json`, `mid-game.json`, `late-game.json` — alle på nuværende `CURRENT_STATE_VERSION`.
- En test `migrateGameState.fixtures.test.ts` der loader hver fixture, kører fuld migration, og asserter at post-migration shape matcher en frisk `defaultGameState()`-merge.
- En CI-step (eller pre-commit hook hvis ingen CI) der kører ovenstående test.

> **Composer-note:** Hvis fixture-saves ikke findes, generér dem fra et clean spil-load på nuværende version før Fase 1 begyndes. Commit dem som data-only.

**Acceptkriterium:** `npm test -- migrateGameState.fixtures` (eller projektets ækvivalent) er grøn.

### 0.3 A3-baseline-audit (forberedelse til Fase 1.1)

Lav en static-audit-test der scanner kodebasen for direkte mutation af clampede stats:

```
__tests__/architecture/no-direct-stat-mutation.test.ts
- Forbyder skrivninger til state.player.playerHpMax / playerManaMax
  uden for clampPlayerSurvival og defaultGameState/migration.
- Implementeres som regex-scan over reducer-filer ELLER AST-baseret hvis
  ts-morph allerede er i toolchain.
```

Fasen er "rød" forventet — den gøres grøn i Fase 1.1.

**Acceptkriterium:** Testen findes og kører; rapporterer eksisterende overtrædelser som en liste.

### 0.4 Beslutningslog: hvad denne fase ikke gør

Fase 0 ændrer **ikke** save-format. Alt arbejde i denne fase er additivt: nye D-rækker, nye tests, nye fixtures. Ingen `CURRENT_STATE_VERSION`-bump.

---

## Fase 1 — Foundation

**Mål:** Ryd op i A3-overtrædelser fra audit, og lever "any mine"-achievement-laget — den ene §9-leverance uden afhængigheder.

**Forudsætninger:** Fase 0 lukket.

### 1.1 A3-cleanup

For hver overtrædelse rapporteret af `no-direct-stat-mutation.test.ts`:

- Erstat direkte mutation med named contributor + recompute via `effectiveTotal*`.
- Tilføj reducer-test der verificerer at den oprindelige effekt stadig opnås.

Når audit-testen er grøn, lukkes 1.1.

### 1.2 Achievements: "any mine"-lag

> **D-række (ny): D44. G1 — "Any mine"-aggregering ved query.** Achievement-statistikker for "any mine"-laget beregnes ved read-tid fra eksisterende `unlockedDepths`, `mineId` og legacy `depth` / `worldTier`. Ingen nye persisterede tællere; ingen risiko for divergens eller dobbelt-optælling.
> **Konsekvens for save-format:** ingen ændring → ingen migration i denne fase.

**Kode-targets:**

- `achievements/anyMineAggregator.ts` (ny) — ren funktion `computeAnyMineStats(state): AnyMineStats`. Læser `unlockedDepths`, `mineRunHistory` (hvis det findes), og afleverer aggregat i tabel-form (`{ totalRunsCompleted, deepestAcrossMines, totalGemsByType, ... }`).
- `achievements/catalog.ts` (eksisterende) — udvid med "any mine"-achievements der bruger aggregator-output via en lazy/memoized getter for at undgå at recomputere ved hver render.
- `selectors/achievements.ts` — eksponér `selectAnyMineStats(state)`-selector med memoization (reselect eller manuel cache med `state`-reference-equality).

**Test-kontrakter:**

- `anyMineAggregator.test.ts` — fixtures der dækker (a) tom historik, (b) én mine med dybde, (c) flere miner med forskellig dybde, (d) legacy save uden `mineId`-felt på gamle entries.
- Achievement-unlock-tests — verificér at "any mine"-achievements unlocker på korrekt threshold uden at påvirke eksisterende mine-specifikke achievements.

**Acceptkriterium:** Aggregator-funktion er ren (ingen state-mutation), memoiseres, og dækker mindst tre nye "any mine"-achievements i kataloget.

### 1.3 Lokal telemetri-baseline (G2)

> **D-række (ny): D45. G2 — Kun lokal telemetri.** Telemetri består udelukkende af lokal logging og offline-statistik. Ingen netværks-upload. Ingen opt-in UI i v1.x. Hvis dette ændres senere kræves separat D-række + privacy-policy + opt-in flow.

**Kode-targets:**

- `telemetry/localLogger.ts` (ny) — append-only ring buffer i memory + valgfri persist til localStorage / file (afhænger af platform). Felter: `event`, `timestamp`, `payload` (lille JSON-objekt).
- Tilføj logging-call-sites for: mine-run-start, mine-run-end (succes/død), achievement-unlock, alkymi-craft, save-migration-run.
- `telemetry/__tests__/localLogger.test.ts` — verificér ring-buffer-cap, ingen netværks-call, JSON-shape.

**Acceptkriterium:** Logger kan tilgås fra dev-konsol (`window.__telemetry` eller tilsvarende) med seneste N events. Ingen `fetch`/`XMLHttpRequest`-kald i telemetri-stien (assertion-test).

---

## Fase 2 — Run/hub-inventory split: Sikret Loadout + Redningstaske

**Mål:** Implementér "Sikret Loadout + Redningstaske"-modellen reelt i state, reducers, persistens og UI. D7 og D8 går fra "delvist" til "implementeret".

**Forudsætninger:** Fase 0 lukket. Fase 1 må gerne køre parallelt.

### 2.1 Mekanik-kontrakt (låst)

> **D-række (ny): D46. Sikret Loadout + Redningstaske.** Run/hub-split følger denne model:
>
> 1. **Hub-medbragt** (equipment + udgangs-gold + udgangs-consumables) er *altid fredet*. Død i mine kan ikke reducere disse beholdninger.
> 2. **Fundet guld og fundne consumables** auto-fredes ved pickup ved at puljes direkte med spillerens hub-beholdning. Der findes ingen separat "run-gold" eller "run-consumables"-pulje.
> 3. **Fundet loot der ikke er guld eller consumables** (materialer, gear, gemmer, blueprints i drop-form, etc.) lever i `runInventory.foundLoot` og **tabes ved død**.
> 4. **Redningstasken** (`runInventory.rescueBag`) er en separat container med begrænset kapacitet inde i mine. Items flyttet hertil **overlever død** og tilføjes til hub ved død eller safe-ascend.

> **D7 (opdateret, supersederer tidligere ordlyd):** Død i mine taber `runInventory.foundLoot`. `runInventory.rescueBag` overlever død. Hub-medbragt er fredet.
>
> **D8 (opdateret):** Safe-ascend overfører hele `runInventory` (både `foundLoot` og `rescueBag`) til hub-beholdninger.

### 2.2 Yderligere låste regler

> **D-række (ny): D47. Origin-tag på items.** Hver `EquipmentInstance` og hver `FoundLootEntry` har et `origin: 'hub' | 'mine'`-felt. Origin sættes ved acquisition (hub-equip eller mine-pickup) og **ændres aldrig** i løbet af en items levetid. Origin-feltet er den eneste autoritative kilde for "fredning"-spørgsmålet ved død.

> **D-række (ny): D48. Redningstaske er opgraderbar.** Initial kapacitet 3 slots. Opgraderes via smithing eller butik — eksakte costs og max-tier fastlægges i Fase 6 balance-pass; i Fase 2 implementeres opgrade-action med konfigurerbar tier-tabel som data-fil (`data/rescueBagUpgrades.json`).

> **D-række (ny): D49. Auto-equip-policy: altid manuel.** Fundet gear går altid i `runInventory.foundLoot` ved pickup. Spilleren skal eksplicit equip eller flytte til rescueBag. Ingen auto-swap, ingen "spørg ved pickup"-modal.

> **D-række (ny): D50. Quest-items i særskilt slot.** Quest- og unique-items (markeret med `isQuestItem: true` i item-data) auto-placeres i `runInventory.questItems` ved pickup. Denne pulje **tæller ikke mod `rescueBagCapacity`** og overlever altid død (samme regel som rescueBag).

> **D-række (ny): D51. Equipped-protection-rule.** Items i `player.equipped*`-slots overlever død uanset origin. Konsekvens: equipping et fundet item er en *eksplicit safeguard-handling* — dette er bevidst tactical design (spilleren trader brug af "godt" hub-gear for at beskytte fundet gear).

> **D-række (ny): D52. Stowed hub-gear forbliver fredet.** Når spilleren af-equipper et hub-origin item under et run, lever det i `runInventory.stowedHubGear` for resten af runnet og er fredet (origin='hub' fastholder fredning). Det går tilbage i `hubInventory.equipment` ved run-exit.

### 2.3 State-shape

```ts
// PlayerState — Fase 2 tilføjer:
interface PlayerState {
  // ... eksisterende felter (uændret)
  hubInventory: HubInventory;          // erstatter eksisterende consumables/gold/etc.
  runInventory: RunInventory | null;   // null når ikke aktivt run
  equipped: EquippedSlots;             // beholdes som i dag, men hver instance har nu `origin`
}

interface EquipmentInstance {
  itemId: EquipmentId;
  origin: 'hub' | 'mine';
  durability?: number;
  // ... øvrige instans-felter
}

interface HubInventory {
  gold: number;
  consumables: Record<ConsumableId, number>;     // pulje for både medbragt og fundet
  equipment: EquipmentInstance[];                // alle med origin='hub' (fundne items får origin='hub' efter de når hub via safe-ascend eller rescueBag)
  materials: Record<MaterialId, number>;         // smithing-materialer
  // unlocks lever stadig i GameState, ikke her
}

interface RunInventory {
  foundLoot: FoundLootEntry[];          // origin='mine'; tabes ved død
  rescueBag: FoundLootEntry[];          // origin='mine' eller 'hub'; overlever død; max kapacitet
  rescueBagCapacity: number;            // 3 ved start, kan opgrades; D48
  questItems: QuestItemEntry[];         // origin='mine', isQuestItem=true; ingen kapacitets-cost; D50
  stowedHubGear: EquipmentInstance[];   // origin='hub'; af-equipped under run; altid fredet; D52
}

type FoundLootEntry =
  | { kind: 'material'; id: MaterialId; quantity: number; origin: 'hub' | 'mine' }
  | { kind: 'equipment'; instance: EquipmentInstance }
  | { kind: 'gem'; id: GemId; quantity: number; origin: 'hub' | 'mine' };
// Bemærk: gold og consumables findes IKKE i FoundLootEntry — de auto-puljes ved pickup.

interface QuestItemEntry {
  questItemId: QuestItemId;
  origin: 'mine';   // quest-items findes altid i mine i v1.x
}
```

### 2.4 Hub-origin-items der "ankommer" via safe-ascend

Når mine-origin items når hub (via safe-ascend eller rescueBag-overlevelse efter død), **ændres deres origin ikke** retroaktivt i samme run. Men ved næste run-start, når player vælger loadout fra `hubInventory`, regnes de som hub-medbragt på lige fod med alt andet i hub. I praksis betyder det: `origin`-feltet er kun relevant *under* et aktivt run; ved hub-ophold er alt i hub-inventory implicit hub-origin for næste run.

**Implementations-detalje:** Origin kan enten (a) sættes til `'hub'` ved den `MINE_RUN_EXIT`-merge-handling der flytter ting til hub, eller (b) bevares som er, og fortolkes via "i hub-inventory ⇒ hub-origin"-regel. Vælg (a) for klarhed i debugging.

### 2.5 Reducer-actions

| Action | Effekt |
|---|---|
| `MINE_PICKUP_GOLD` | `hubInventory.gold += amount`. Ingen run-state ændring. |
| `MINE_PICKUP_CONSUMABLE` | `hubInventory.consumables[id] += qty`. Ingen run-state ændring. |
| `MINE_PICKUP_QUEST_ITEM` | Append til `runInventory.questItems`. Ingen kapacitets-check. |
| `MINE_PICKUP_LOOT` | Append til `runInventory.foundLoot` med `origin='mine'`. |
| `MINE_MOVE_TO_RESCUE_BAG` | Flyt entry fra `foundLoot` til `rescueBag`. Reject hvis `rescueBag.length >= rescueBagCapacity`. |
| `MINE_MOVE_FROM_RESCUE_BAG` | Modsat operation. Origin bevares. |
| `MINE_EQUIP_FOUND` | Flyt entry fra `foundLoot` (eller `rescueBag`) til relevant `equipped`-slot. Hvis slottet allerede er optaget af et hub-origin item: flyt det til `stowedHubGear`. Hvis optaget af et mine-origin item: flyt det til `foundLoot` (taber beskyttelse). |
| `MINE_UNEQUIP` | Hvis `origin='hub'`: flyt til `stowedHubGear`. Hvis `origin='mine'`: flyt til `foundLoot` (mister equipped-protection). |
| `RESCUE_BAG_UPGRADE` | Øg `rescueBagCapacity` baseret på tier-tabel; debit smithing-materialer eller gold. |
| `MINE_PLAYER_DEATH` | Survivors = equipped + `rescueBag` + `questItems` + `stowedHubGear`. Discard `foundLoot`. Merge survivors → `hubInventory` (sæt `origin='hub'` på merged items). Sæt `runInventory = null`. Trigger eksisterende død-flow. |
| `MINE_RUN_EXIT` (safe ascend) | Survivors = equipped + `foundLoot` + `rescueBag` + `questItems` + `stowedHubGear`. Merge alt → `hubInventory` (sæt `origin='hub'`). Sæt `runInventory = null`. |

> **Composer-note:** `MINE_RUN_EXIT` skal forblive den samme single-pipeline som inspirationen §2 påpeger — ny behavior tilføjes som effekt af den eksisterende exit, ikke som nyt eksitsted.

### 2.6 Migration

- `CURRENT_STATE_VERSION` bumpes (Fase 2's første save-format-ændring).
- `migrate_v<N>_to_v<N+1>(state)`:
  - Eksisterende `state.player.consumables` (meta) → `state.player.hubInventory.consumables`.
  - Eksisterende `state.player.gold` → `state.player.hubInventory.gold`.
  - Eksisterende equipment-felter → `state.player.hubInventory.equipment` (alle med `origin='hub'`).
  - Eksisterende equipped-instances får `origin: 'hub'` injiceret.
  - Hvis save har en aktiv `mineRun` med items i et legacy felt: **discard** med advarsel-log (vi har ikke en pålidelig måde at afgøre `foundLoot` vs `rescueBag` retroaktivt; spillere mister højst ét igangværende run).
  - `runInventory` initialiseres som `null`.
  - `materials` initialiseres som `{}` hvis ikke findes.
  - `rescueBagCapacity` initialiseres til 3 (D48-default).

### 2.7 UI-targets

- Mine-HUD: redningstaske-ikon med `current/max`-badge. Klik åbner taske-panel.
- Quest-slot vises separat (mindre badge ved siden af eller integreret i HUD), så spilleren kan se quest-items er sikret.
- Pickup-feedback: tydelig visuel/lydlig forskel mellem auto-fredet (gold/consumable; "→ hub", grønt) og fundet loot ("→ run", neutralt).
- `foundLoot` ↔ `rescueBag` interaktion: drag-and-drop på desktop; long-press-flow på touch (følger eksisterende inventory-mønster).
- Equip-knap fra `foundLoot` direkte (D49 + D51): tydelig label "Equip (sikrer dette item ved død)".
- Død-skærm: liste over (a) hvad der gik tabt (`foundLoot`-indhold), (b) hvad der blev reddet (`rescueBag` + `questItems` + equipped + stowedHubGear).
- Smithing/butik: ny "Opgrader redningstaske"-handling med tier-tabel-UI.

### 2.8 Test-kontrakter

- Reducer-tests for hver action i §2.5 med både gyldig og defensiv default.
- Migrationstest fra alle tre fixture-saves (Fase 0).
- Integrationstest: simulér run → pickup gold + loot → flyt til rescueBag → død → assertér hub-beholdninger inkluderer rescueBag og excluderer foundLoot.
- Integrationstest: samme run med safe-ascend i stedet — assertér alt ankommer i hub.
- Integrationstest: equip et fundet sværd → død → assertér sværdet er i hubInventory med origin='hub' efter merge.
- Integrationstest: af-equip et hub-sværd midt i run → død → assertér sværdet er i hub (via stowedHubGear).
- Integrationstest: pickup quest-item → død → assertér quest-item i hubInventory uanset rescueBag-fyldningsgrad.
- Edge-test: rescueBag fuld → forsøg at flytte item → action rejected, ingen state-mutation.
- Assertion-test: ingen reducer udenfor §2.5 må mutere `hubInventory.gold` eller `hubInventory.consumables` på basis af `MINE_*`-actions (forhindrer dobbelt-optælling).
- Assertion-test: intet kode-sted sætter `origin`-felt udenfor pickup-reducers og `MINE_RUN_EXIT`/`MINE_PLAYER_DEATH`-merge.

### 2.9 Acceptkriterier for fasen

1. Alle reducer-actions fra §2.5 implementeret og dækket af unit-tests.
2. Alle integrationstests fra §2.8 grønne.
3. Migration grøn på alle tre fixture-saves.
4. UI-flow gennemspillet manuelt: hub → loadout → run → pickups → equip-found → død → verificér survivors i hub.
5. UI-flow gennemspillet manuelt: samme men med safe-ascend.
6. D7, D8, D43, D46–D52 alle dokumenteret i `implementation-plan.md`.
7. Audit fra Fase 0.3 (no-direct-stat-mutation) stadig grøn.

---

## Fase 3 — Armour-slots + soul-bound

**Mål:** Udvid fra én aktiv rustning til tre slots med per-slot durability, centraliseret cost-funktion, og soul-bound som ekstra beskyttelses-lag oven på Fase 2's mekanik.

**Forudsætninger:** Fase 2 lukket.

### 3.1 Mekanik-kontrakter

> **D-række (ny): D53. B1 — Tre armour-slots.** Equipment-slots udvides fra `activeArmourId` til:
> - `equippedHelmetId: EquipmentId | null`
> - `equippedChestId: EquipmentId | null`
> - `equippedBootsId: EquipmentId | null`
>
> Det gamle `activeArmourId` udfases (migration sender det til `equippedChestId` som default-mapping). Yderligere slots (handsker, amulet) udskydes eksplicit til v1.x+ — ny D-række kræves for at åbne dem.

> **D-række (ny): D54. B2 — Per-slot durability.** Hver `EquipmentInstance` har egen `durability: number` og `maxDurability: number`. Nedslidning sker pr. slot ved relevante events (mob-hit, mining, etc.).

> **D-række (ny): D55. B2-konsekvens — Brudt armour.** Når en slots `durability` rammer 0, forbliver item visuelt i slottet, men dets stat-bonus regnes som **0** indtil repareret. Item kan stadig holde slottet besat (ingen auto-unequip). UI markerer slot som "brudt" med tydelig advarsel.

> **D-række (ny): D56. B3 — Additivt stacking + stat-budget-disciplin.** Armour-bonusser summeres direkte uden cap eller diminishing returns på tværs af slots i `effectiveTotal*`-pipelinen. **Balance kontrolleres via data-budgetter, ikke matematik:** eksplicit stat-budget pr. (slot, tier) i `data/armourTiers.json` — fx tier-1 bryst max +15 HP, tier-1 støvler max +5 HP, etc. Maksimum-stacking pr. worldTier kendes på forhånd og bruges som baseline for fjende-skade-tabel. Hvis balance-pass i Fase 6 alligevel viser eksplosion, må overstyring til soft cap rejses som ny D-række.

> **D-række (ny): D57. B4 — Centraliseret smithing-cost.** Én shared cost-funktion `computeSmithingCost(item, operation, params): CoalCost` dækker både våben og alle armour-slots, både reparation og opgrade. Per-slot eller per-item-type-formler er forbudt; tier-tabeller leveres som data, ikke kode.

> **D-række (ny): D58. E2 — Soul-bound bypasser rescueBag-cap.** `EquipmentInstance.soulBound: boolean` (default false). Soul-bound items overlever altid død uanset placering — også hvis i `foundLoot`. Dette er beskyttelses-niveauet *over* equipped/rescueBag/quest.

> **D-række (ny): D59. E1 — Soul-bound-kategorier.** Følgende item-typer kan markeres soul-bound:
> - **Quest tools / nøgle-items** (defensivt redundant lag oven på `questItems`-puljen — sikrer mod edge-cases hvor quest-tool ender udenfor puljen).
> - **Hub-craftet equipment over tier-N** (auto-flag ved smithing når output-tier ≥ N; N defineres i data-tabel).
>
> Signaturvåben og cosmetics udskydes som soul-bound-kategorier til senere milestone.

> **D-række (ny): D60. E3 — Ingen tals-cap på soul-bound.** Begrænsningen ligger i E1's typer alene; spilleren kan ikke selv markere items som soul-bound (flaget sættes af systemet ved item-creation eller via specifik smithing-action).

### 3.2 State-shape (delta fra Fase 2)

```ts
interface PlayerState {
  // ... eksisterende felter
  equippedHelmetId: EquipmentId | null;
  equippedChestId: EquipmentId | null;
  equippedBootsId: EquipmentId | null;
  // activeArmourId fjernes efter migration
}

interface EquipmentInstance {
  itemId: EquipmentId;
  origin: 'hub' | 'mine';            // fra D47
  durability: number;                 // ny — D54
  maxDurability: number;              // ny — D54
  tier: number;                       // antaget eksisterende; bekræft i kodebase
  soulBound: boolean;                 // ny — D58, default false
  // ... øvrige instans-felter
}

interface EquipmentDefinition {
  id: EquipmentId;
  slot: 'weapon' | 'helmet' | 'chest' | 'boots';   // ny — udvidet fra 'armour'
  // ... øvrige definitions-felter
  isQuestItem?: boolean;
  // soulBound på definition: hvis true, alle instances spawnes med soulBound=true
  soulBoundByDefinition?: boolean;
}
```

### 3.3 Effective-stat-pipeline (A3-håndhæve)

Ny named contributor `armourSlotsContribution(state) → { hp: number; mana: number; ... }` der:

1. Henter equipped helmet/chest/boots instances.
2. For hver: hvis `durability > 0`, bidrager item-tier-baseret stat. Hvis `durability === 0`, bidrager 0 (D55).
3. Sum'er additivt (D56).
4. Returnerer som contributor-record der konsumeres af `effectiveTotalHpMax` etc.

`computeEffectiveTotalHpMax(state)` får `armourSlotsContribution` tilføjet som named source. **Ingen direkte mutation** af `playerHpMax` (D40 håndhæves).

```ts
// Skitse
function computeEffectiveTotalHpMax(state: GameState): number {
  return clampMax([
    baselineFromBrew(state),
    armourSlotsContribution(state).hp,
    // (level-bidrag tilføjes i Fase 4)
    // (buff-bidrag tilføjes senere)
  ].reduce((a, b) => a + b, 0));
}
```

### 3.4 Reducer-actions

| Action | Effekt |
|---|---|
| `EQUIP_ARMOUR` | Lægger item i korrekt slot baseret på `EquipmentDefinition.slot`. Eksisterende item i slot håndteres per D52 (stowedHubGear hvis hub-origin) eller D49-regel. |
| `UNEQUIP_ARMOUR_SLOT` | Som `MINE_UNEQUIP` men slot-specifik. |
| `ARMOUR_TAKE_DAMAGE` | Reducerer `durability` på et eller flere slots baseret på damage-event. Når 0 nås, ingen auto-unequip (D55). |
| `SMITH_REPAIR_ITEM` | Bruger `computeSmithingCost(item, 'repair', { from: durability, to: maxDurability })` til at bestemme kul-cost; hvis player har materialer, restaurer durability til max. |
| `SMITH_UPGRADE_ITEM` | Bruger samme funktion med `operation: 'upgrade'`; hæver tier; auto-flag soul-bound hvis ny tier ≥ N (D59). |
| `MINE_RESCUE_BAG_OVERFLOW_FROM_SOULBOUND` | Soul-bound items håndteres ikke via rescueBag — denne action eksisterer ikke; flaget tjekkes direkte i death-merge (D58). |

`MINE_PLAYER_DEATH` opdateres: survivors = equipped + rescueBag + questItems + stowedHubGear + **alle items i foundLoot med `soulBound === true`**. Resten af foundLoot discardes.

### 3.5 Centraliseret smithing-cost-funktion (D57)

```ts
type SmithingOperation = 'repair' | 'upgrade';

interface SmithingCostParams {
  item: EquipmentInstance;
  operation: SmithingOperation;
  fromTier?: number;     // upgrade
  toTier?: number;       // upgrade
  fromDurability?: number;  // repair
  toDurability?: number;    // repair
}

interface CoalCost {
  coal: number;
  materials?: Record<MaterialId, number>;
}

function computeSmithingCost(params: SmithingCostParams): CoalCost {
  // Læser fra data/smithingTiers.json — ingen hardkodede tal i funktionen.
  // Samme entry point for både weapon og armour-slots.
}
```

**Krav:**
- Cost-tabeller i `data/smithingTiers.json`, struktureret som `{ slotType: { tier: { repairBase, upgradeFromTier } } }`.
- Test-fixtur'er for hver kombination af (slot, operation, tier).
- Regression-test der verificerer eksisterende våben-repair-cost ikke ændrer sig efter centralisering.

### 3.6 Soul-bound implementation

**Ved item-creation:**
- Items hvor `EquipmentDefinition.soulBoundByDefinition === true` får automatisk `instance.soulBound = true`.
- `SMITH_UPGRADE_ITEM` action sætter `soulBound = true` hvis output-tier ≥ tærskel-tier-N (defineres i `data/smithingTiers.json` per slotType).
- Ingen player-handling kan sætte/fjerne flaget direkte.

**Ved death-merge:**
```ts
function deathMergeSurvivors(state: GameState): EquipmentInstance[] {
  const run = state.player.runInventory!;
  return [
    ...allEquipped(state),
    ...run.rescueBag,
    ...run.questItems,
    ...run.stowedHubGear,
    ...run.foundLoot.filter(entry => 
      entry.kind === 'equipment' && entry.instance.soulBound
    ),
  ];
}
```

**Visning:** Soul-bound items har et permanent visuelt mærke (ikon eller ramme) i alle inventory-views så spilleren forstår status.

### 3.7 Migration

- `CURRENT_STATE_VERSION` bumpes igen.
- `migrate_v<N>_to_v<N+1>(state)`:
  - `state.player.activeArmourId` → `state.player.equippedChestId` (default mapping). `state.player.equippedHelmetId` og `equippedBootsId` initialiseres til `null`.
  - For hver `EquipmentInstance`: hvis `durability` mangler, sættes til `maxDurability`. Hvis `maxDurability` mangler, beregnes default fra tier-tabel.
  - For hver `EquipmentInstance`: hvis `soulBound` mangler, sættes til `false`. Hvis item's definition har `soulBoundByDefinition === true`, sæt `soulBound = true` retroaktivt.
  - Slet legacy `activeArmourId`.

### 3.8 UI-targets

- Smedje-UI: tre armour-slots side om side med per-slot durability-bar; brudt slot vises med rød-grå tone og "BRUDT"-overlay.
- Equipment-screen: tre tydelige armour-slots; soul-bound-mærke synligt på alle relevante items.
- Cost-preview i smedje: viser `computeSmithingCost`-output før spilleren bekræfter.
- "Brudt"-tooltip: forklarer at item stadig optager slot men giver 0 bonus.

### 3.9 Test-kontrakter

- Reducer-tests for hver action i §3.4.
- `armourSlotsContribution`-tests: 0/1/2/3 slots equipped; brudte slots; mix af tiers.
- `effectiveTotalHpMax`-regressionstests: bekræft at spillere uden equipped armour får samme tal som før Fase 3 (baseline ikke ændret).
- `computeSmithingCost`-tests pr. (slot, operation, tier)-kombination; regression-test for våben-cost.
- Death-merge-test: foundLoot indeholder soul-bound item → assertér det er i hub efter død.
- Death-merge-test: foundLoot indeholder almindeligt item → assertér det er IKKE i hub.
- Migration-test: legacy save med `activeArmourId` → assertér mapped til `equippedChestId`, øvrige slots null.
- Migration-test: legacy save med items uden `durability` → assertér default-init korrekt.
- Audit-test: ingen kode-sted muterer `EquipmentInstance.soulBound` udenfor item-creation og `SMITH_UPGRADE_ITEM`.

### 3.10 Acceptkriterier

1. Tre armour-slots fungerer i UI; equip/unequip-flow gennemspillet manuelt.
2. Per-slot durability slides korrekt under combat.
3. Brudt slot giver 0 bonus, verificeret via `effectiveTotalHpMax`-test.
4. Smithing-cost beregnes via `computeSmithingCost` for både våben og alle armour-slots.
5. Hub-craftet item over tier-N spawnes med `soulBound=true` automatisk.
6. Quest tool i `foundLoot` (edge-case) overlever død (defensiv redundans-test).
7. Migration grøn på alle fixtures inklusive ny v<N>-fixture med legacy `activeArmourId`.
8. D53–D60 dokumenteret i `implementation-plan.md`.

---

## Fase 4 — Player level: butik-eksklusiv

**Mål:** Aktivér det eksisterende `level`/`xp`-felt i `GameState` som synlig progression der udelukkende påvirker butikken. Ingen stat-multiplikatorer, ingen cosmetics, ingen gates (per A2/D42). Holder design-overfladen så lille som mulig.

**Forudsætninger:** Fase 1 lukket (effectiveTotal-pipeline ren, så vi ikke utilsigtet lukker level ind ad bagdøren).

### 4.1 Mekanik-kontrakter

> **D-række (ny): D61. C2 — Level påvirker udelukkende butik.** Player-level giver ingen `manaMax`/`playerHpMax`-multiplikator, ingen achievements, ingen cosmetics-unlocks i v1.x. Eneste effekt er på butik (rabat-kurve og level-låste varer). Hvis level senere skal påvirke andre systemer, kræves ny D-række der eksplicit overstyrer denne.

> **D-række (ny): D62. C1 — XP-kilder.** XP optjenes fra:
> 1. Mine-kills (combat).
> 2. Dybde-milestones (første-gang nået dybde X i en mine).
> 3. Hakkede klipper/malm (mining-handlinger; XP per mining-event eller per ressource-enhed).
> 4. Crafting-handlinger (smithing-craft-success).
> 5. Alkymi-brews (brew-craft-success).
> 6. Quest-completions (kun aktivt når quest-system findes; hook reserveres).
>
> Butik-transaktioner giver **ikke** XP (forhindrer farm-loop).

> **D-række (ny): D63. C3 — Plateau-XP-kurve.** XP-kravet til næste level følger en plateau-kurve bundet til worldTier: 10 levels per worldTier. Konkret tabel leveres som data (`data/xpCurve.json`) for at muliggøre balance-pass uden kode-ændring. Level-cap = `worldTierMax × 10`.

### 4.2 State-shape (delta)

```ts
interface GameState {
  // ... eksisterende felter
  level: number;       // bekræftet eksisterende (jf. inspiration §1.2)
  xp: number;          // bekræftet eksisterende
  // ingen nye felter — Fase 4 aktiverer eksisterende felter
}
```

Da level/xp allerede findes i state, kræver Fase 4 **ikke** en `CURRENT_STATE_VERSION`-bump. Dog skal migration sikre at saves uden disse felter får defaults (`level: 1, xp: 0`) — det er sandsynligvis allerede dækket men skal verificeres.

### 4.3 XP-kilde-mapping

For hver kilde implementeres en udled-funktion:

```ts
// xp/sources.ts
function xpFromMineKill(mob: Mob, depth: number): number;
function xpFromDepthMilestone(mineId: MineId, depth: number): number;
function xpFromMining(material: MaterialId, quantity: number): number;
function xpFromCraft(item: EquipmentInstance): number;
function xpFromBrew(brew: BrewInstance): number;
function xpFromQuest(quest: QuestId): number;
```

**Datadrevne tal:** Hver funktion læser sin formel fra `data/xpSources.json`. Ingen hardkodede tal i `xp/sources.ts`.

### 4.4 Level-up-effekter (kun butik)

Ved level-up emit `LEVEL_UP`-action der:

1. Inkrementerer `level`.
2. Trigger `recomputeShopState(state)` der:
   - Anvender level-baseret rabat-kurve fra `data/shopDiscounts.json`.
   - Tilføjer level-låste varer til shop-inventory hvis level krydser threshold.
3. Sender notification til UI ("Level Up — nye varer i butikken!"-toast).

**Kontrakt:** `LEVEL_UP`-reducer må **kun** mutere `state.level`, `state.xp` og `state.shopState`. Audit-test forhindrer mutation af `playerHpMax`/`playerManaMax`/`equipment`/etc. fra denne reducer.

### 4.5 Reducer-actions

| Action | Effekt |
|---|---|
| `XP_GAIN` | `state.xp += amount`. Tjek for level-up: hvis `xp >= xpRequiredForNextLevel(state.level)`, dispatch `LEVEL_UP` (kan loope hvis flere levels overskrides på én gang). |
| `LEVEL_UP` | Inkrementér `level`; træk threshold-XP fra; recompute shop-state. |
| `XP_RECOMPUTE_CURVE` | Dev/QA-tool: re-evaluerer level fra total XP mod ny kurve-tabel. Bruges hvis balance-pass ændrer `xpCurve.json`. |

### 4.6 Migration

- Ingen `CURRENT_STATE_VERSION`-bump.
- Defensive defaults verificeres: hvis save mangler `level`/`xp`, sættes til `1`/`0`.
- Ingen retroaktiv XP-tildeling for tidligere handlinger (fair start fra fasens release).

### 4.7 UI-targets

- HUD eller hub: synlig level-indikator + XP-bar mod næste level.
- Butiks-UI: rabat-procent vises tydeligt; level-låste varer markeret med "Låses op ved Level X".
- Level-up-toast: kort animation + "Tjek butikken"-knap.
- Ingen level-effekter vises i smedje, mine-HUD eller equipment-screen (per D61).

### 4.8 Test-kontrakter

- Reducer-test: `XP_GAIN` der overskrider level-threshold → `LEVEL_UP` dispatched. Inkluderer multi-level-overskridning.
- Audit-test: `LEVEL_UP`-reducer muterer kun whitelist'ede felter (level/xp/shopState).
- Audit-test: ingen kode-sted læser `state.level` i `effectiveTotal*`-pipelinen (forhindrer A2-overtrædelse).
- Selector-test: `xpRequiredForNextLevel(level)` returnerer korrekt værdi pr. plateau-tabel.
- Integrationstest: simulér mine-kill → XP_GAIN; verificér level-bar opdateres i UI-state.
- Integrationstest: køb i butik efter level-up → assertér rabat anvendt på pris.

### 4.9 Acceptkriterier

1. XP optjenes fra alle seks kilder fra D62 (quest-hook tilstede selvom quest-system ikke er live).
2. Level-up trigger butik-recompute, og kun det.
3. Audit-tests grønne: level påvirker hverken `effectiveTotal*` eller equipment-stats.
4. UI viser level og XP-bar; butik-UI viser level-rabat.
5. D61, D62, D63 dokumenteret i `implementation-plan.md`.

---

## Fase 5 — Tidsmodel + brew+ AoE

**Mål:** Indfør run-exit-baseret dag-system med valid-run-gate, knyt restock til valid-run-exit, håndhæv numerisk effekt-kontrakt på alle brew-`abilityId`'er, og implementér Fork-AoE oven på eksisterende felt-baseret slot-model.

**Forudsætninger:** Fase 2 lukket (run/hub-split nødvendig for at "dag" giver mening).

### 5.1 Mekanik-kontrakter

> **D-række (revideret v1.6): D64. Run-exit tidsmodel.** En "dag" avancerer ved exit fra mine (safe-ascend eller død) hvis runnet er **valid**: `slotsClearedThisRun > 0` ELLER `currentDepth > 1`. Invalid runs (instant-exit uden aktivitet) tæller ikke; intet døgn-skift, ingen restock. Ingen separat `HUB_SLEEP`-action; ingen real-time-kobling, ingen tick-handler, ingen ambient time-passage.

> **D-række (revideret v1.6): D65. Restock ved valid run-exit.** Restock af butik og værksted trigges af valid-run-exit (jf. D64). Raffinerer D39 med valid-run-gate (i stedet for at supersede). Konsekvens: alle valide runs ender med restock; instant-exit-spam giver hverken døgn-skift eller restock.

> **D-række (ny): D66. F1 — Håndhævet brew-abilityId-kontrakt.** Hver `abilityId` registreret i brew-kataloget *skal* mappe til mindst én numerisk effekt der konsumeres af mine-reducer. "Fluff"-effekter er forbudt; narrativ tekst flyttes til item-tooltip. Test-kontrakt verificerer at intet `abilityId` har `effect: null`.

> **D-række (ny): D67. F2 — Fork AoE-mål-model.** Brew-evner med AoE-natur rammer primært mål + N tilfældigt valgte sekundære mål blandt aktive mobs på laget. N er parametriseret per `abilityId` i brew-data. Sekundære hits kan have reduceret effekt-multiplier (fx 0.5×). Ingen position-grid kræves.

> **D-række (ny): D68. F3 — Felt-baseret slot-model bevares.** Den eksisterende slot-model (felt-baseret, ikke position-grid) bevares i v1.x. Hvis senere AoE-pattern (fx "kun forreste 2") kræver position, rejses ny D-række.

### 5.2 Tidsmodel state-shape

```ts
interface GameState {
  // ... eksisterende felter
  day: number;              // ny — D64; initialiseres til 1 i fresh saves og migration
  lastRestockDay: number;   // ny — D65; sporer hvornår butik/værksted sidst restocked
}

interface RunInventory {
  // ... øvrige felter (jf. Fase 2)
  slotsClearedThisRun: number;   // ny — D64 valid-run-gate
}
```

`slotsClearedThisRun` inkrementeres ved hver `SLOT_CLEARED`-event (eksisterende eller ny event afhængig af kodebase). Bruges i valid-run-check ved exit.

### 5.3 Run-exit-day-tick-flow

Tidsavancen sker som en check inde i de eksisterende exit-pipelines (`MINE_RUN_EXIT` og `MINE_PLAYER_DEATH`) — ikke som separat action.

```ts
// shared/runExitDayTick.ts
function isRunValid(run: RunInventory, mineRun: MineRunState): boolean {
  return run.slotsClearedThisRun > 0 || mineRun.currentDepth > 1;
}

function applyDayTickIfValid(state: GameState, exitKind: 'safe' | 'death'): GameState {
  if (!state.player.runInventory || !state.mineRun) return state;
  
  if (!isRunValid(state.player.runInventory, state.mineRun)) {
    // Invalid run: ingen tid, ingen restock, kun normal exit-cleanup
    return state;
  }

  const nextDay = state.day + 1;
  const restocked = recomputeShopAndWorkshopRestock(state, nextDay);

  return {
    ...state,
    day: nextDay,
    lastRestockDay: nextDay,
    shopState: restocked.shop,
    workshopState: restocked.workshop,
  };
}
```

`MINE_RUN_EXIT` og `MINE_PLAYER_DEATH` kalder `applyDayTickIfValid` **før** de nulstiller `runInventory`/`mineRun` — ellers er valid-check'et tabt.

**UX-notat:** Spilleren ser ingen separat sleep-knap. Day-counter opdateres "stille" ved valid run-exit. Ingen ekstra HUD-element kræves utover `state.day`-visning.

### 5.4 Restock ved valid run-exit

`recomputeShopAndWorkshopRestock(state, day)`:

- Læser restock-tabeller fra `data/shopRestock.json` og `data/workshopRestock.json`.
- Genererer nyt udvalg baseret på `worldTier` (per A2/D42), `level` (per D61's butik-effekt), og `day` (for daglig variation).
- Erstatter `state.shopState.inventory` og `state.workshopState.inventory` fuldt — gamle items i butikken forsvinder hvis ikke købt.

**Eksisterende run-exit-restock i kode:** find nuværende call-sites og wrap dem i `applyDayTickIfValid`-tjekket. Hovedpointe: restock-funktionalitet flyttes ikke; den får bare et validity-gate.

**Migration:** ved første load efter Fase 5 sikres at `state.day` og `state.lastRestockDay` er sat (default `1`); `runInventory.slotsClearedThisRun` defaulter til `0` ved init.

### 5.5 Brew-abilityId-kontrakt (D66)

**Implementation:**

```ts
// brews/abilityRegistry.ts
type AbilityEffectKind = 
  | { kind: 'damage'; baseAmount: number; aoe?: AoEParams }
  | { kind: 'heal'; baseAmount: number }
  | { kind: 'mana_restore'; baseAmount: number }
  | { kind: 'buff'; statId: StatId; magnitude: number; durationTurns: number }
  | { kind: 'debuff'; statId: StatId; magnitude: number; durationTurns: number };

interface AbilityDefinition {
  id: AbilityId;
  effect: AbilityEffectKind;   // OBLIGATORISK; ingen null tilladt
  aoe?: AoEParams;             // hvis sat, anvendes ved damage/debuff (D67)
}

interface AoEParams {
  forkCount: number;             // N sekundære mål (D67)
  secondaryMultiplier: number;   // fx 0.5 for halv effekt på sekundære
}
```

**Audit-test:**

```ts
test('every abilityId has a non-null effect', () => {
  for (const ability of abilityRegistry) {
    expect(ability.effect).toBeDefined();
    expect(ability.effect.kind).toBeTruthy();
  }
});
```

**Eksisterende brews:** Audit alle `abilityId`'er i nuværende brew-katalog. For hver evne der i dag er rent narrativ, vælg én af:
1. Tilføj en numerisk effekt (selv hvis lille).
2. Fjern `abilityId` og flyt teksten til item-tooltip.

Resultatet dokumenteres i en migration-rapport (markdown-fil i repo, ikke save-migration).

### 5.6 Fork AoE-implementering (D67)

```ts
function resolveAbility(state, source, primaryTarget, ability): EffectResolution[] {
  const resolutions = [applyEffect(ability.effect, source, primaryTarget, 1.0)];
  
  if (ability.aoe && isAoEKind(ability.effect)) {
    const otherTargets = activeMobsOnLayer(state)
      .filter(m => m.id !== primaryTarget.id);
    const secondaryTargets = pickRandom(otherTargets, ability.aoe.forkCount);
    
    for (const t of secondaryTargets) {
      resolutions.push(
        applyEffect(ability.effect, source, t, ability.aoe.secondaryMultiplier)
      );
    }
  }
  
  return resolutions;
}
```

**Determinisme:** `pickRandom` skal bruge spillets eksisterende seedede RNG, så replays og tests er reproducerbare.

**Visuel feedback:** Fork-hits vises som visuelle "chains" eller forskudte hit-effects, så spilleren kan se hvor evnen sprang hen.

### 5.7 Migration

- `CURRENT_STATE_VERSION` bumpes (Fase 5's første save-format-ændring).
- `migrate_v<N>_to_v<N+1>(state)`:
  - Initialisér `day: 1`, `lastRestockDay: 1` hvis fraværende.
  - Sikr at eksisterende brew-katalog passerer D66-audit. Hvis ikke, migration **fejler** (test-blokerende) — det er et udvikler-problem, ikke save-problem.

### 5.8 UI-targets

- Day-counter synligt et sted (HUD eller hub) — opdateres "stille" ved valid run-exit.
- Ingen sleep-knap i hub (per v1.6-revision af D64).
- Brew-tooltip: vis effekt numerisk + AoE-info ("Fork: rammer +N mål").
- Mine-feedback: chain-visualisering ved Fork-hits.
- (Optional) Run-summary-toast ved exit der nævner "Dag X → Dag X+1, butik fornyet" når valid; "Run afbrudt — ingen tidsdrejning" når invalid. Hjælper spilleren forstå mekanikken.

### 5.9 Test-kontrakter

- Reducer-test: `MINE_RUN_EXIT` med valid run → `state.day` inkrementeret + restock kørt.
- Reducer-test: `MINE_RUN_EXIT` med invalid run (slotsCleared=0, depth=1) → ingen day-tick, ingen restock.
- Reducer-test: `MINE_PLAYER_DEATH` med valid run → day inkrementeret + restock + run-cleanup.
- Reducer-test: `MINE_PLAYER_DEATH` med invalid run (døde uden at clear noget) → ingen day-tick, ingen restock, run-cleanup kører normalt.
- Reducer-test: `slotsClearedThisRun` inkrementeres ved hver clear-event.
- Audit-test: D66 — hver `abilityId` har non-null `effect`.
- Reducer-test: Fork AoE rammer N sekundære mål; sekundær multiplier anvendes; deterministisk under seedet RNG.
- Migration-test: gammel save uden `day`-felt → init til 1, `slotsClearedThisRun` til 0.

### 5.10 Acceptkriterier

1. Valid run-exit (safe-ascend eller død) inkrementerer day og udløser restock.
2. Invalid run-exit (instant exit eller hurtig død uden aktivitet) tæller ikke; intet restock.
3. Day-counter synligt; spilleren forstår valid/invalid-skellet via UI-feedback.
4. Alle brews har numeriske effekter; D66-audit grøn.
5. Fork-AoE virker for relevante brews; visuel feedback synlig.
6. Migration grøn på fixtures.
7. D64–D68 dokumenteret i `implementation-plan.md` (v1.6-revisioner af D64+D65). D39 markeret som "raffineret af D65".

---

## Fase 6 — Polering

**Mål:** Stabilitet, balance og rest-arbejder. Ingen nye spil-systemer; kun raffinering af det allerede leverede.

**Forudsætninger:** Fase 5 lukket.

### 6.1 H1 — Crash recovery i mine

> **D-række (ny): D69. H1 — Mine-state recovery: dialog med fallback.** Ved load af save:
> 1. Validér `runInventory` shape (typer, referentielle integriteter).
> 2. Hvis state passerer validation OG der er aktiv run-data: vis "Genoptag run?"-dialog (Yes → load mine; No → kør best-effort reset).
> 3. Hvis state fejler validation: kør best-effort reset uden dialog, med advarsel-toast.
>
> **Best-effort reset** = `runInventory = null`, `location = 'hub'`, `mineRun = null`. Hub-state berøres ikke.

**Implementation:**

```ts
// loadFlow.ts
function postLoadRecovery(state: GameState): { state: GameState; action: 'normal' | 'dialog' | 'reset' } {
  const validation = validateRunState(state);
  
  if (validation === 'valid' && state.player.runInventory !== null) {
    return { state, action: 'dialog' };
  }
  if (validation === 'valid') {
    return { state, action: 'normal' };
  }
  // invalid
  const reset = { ...state, player: { ...state.player, runInventory: null }, location: 'hub' };
  logTelemetry({ event: 'mine_state_recovery_reset', reason: validation });
  return { state: reset, action: 'reset' };
}
```

**Test-kontrakter:**
- Valid run-state: dialog vises.
- Invalid `foundLoot`-array (fx ikke-array): reset.
- Invalid `rescueBag`-overflow (>= capacity): reset eller normaliser? **Beslutning:** normaliser ved at trimme overflow til foundLoot, log advarsel. Tilføjes til D69 hvis brugen viser det er nødvendigt.
- Save fra Fase 4 (uden runInventory-felt): migration sætter null, recovery kører normal-flow.

### 6.2 Balance-pass

**Scope:**
1. Verificér `effectiveTotalHpMax`/`effectiveTotalManaMax` ved alle plausible kombinationer:
   - Alle 3 armour-slots equipped, max tier, max durability.
   - Stabilt med D56 (additivt) — confirm ingen runaway.
2. Brew-effekter mod mob-HP-targets per worldTier.
3. Smithing-cost mod player-gold-tilgang per worldTier.
4. Level-rabat × butik-pris-tabel.

**Output:** En markdown-rapport `balance-pass-v1.x.md` med tabeller og eventuelle anbefalede tweaks. Tweaks går ind i data-filer (ikke kode).

**Hvis additivt stacking (D56) viser eksplosion:** rejs ny D-række der overgår til soft cap; opdater `armourSlotsContribution` med cap-logik.

### 6.3 Audit-pass

Final-pass på alle audit-tests etableret i tidligere faser:

- D40 — ingen direkte mutation af `playerHpMax`/`playerManaMax`.
- D44 — `selectAnyMineStats` memoiseret korrekt, ingen recompute storm.
- D49 — ingen auto-equip-paths.
- D58 — `EquipmentInstance.soulBound` kun muteret i whitelisted reducers.
- D61 — level påvirker ikke `effectiveTotal*` eller equipment.
- D66 — alle abilityId har non-null effect.
- Centraliseret smithing-cost (D57) bruges af alle smithing-call-sites.

Test-rapport genereres som del af release-pakken.

### 6.4 Achievement-udvidelser til nye systemer

Tilføj achievements der dækker nye Fase 2–5-systemer:

- "Survived 5 deaths with full rescueBag."
- "Equipped a soul-bound item in mine."
- "Restocked shop X days in a row."
- "Triggered Fork AoE hitting 5+ targets."
- (Andre du udvælger.)

Bruger `selectAnyMineStats`-aggregator (D44) hvor relevant.

### 6.5 Eventuel telemetri-upload

> **Status:** Per D45 er v1.x kun lokal logging. Hvis du beslutter at åbne for opt-in upload, kræves ny D-række + privacy-policy + endpoint + opt-in UI. Ikke i scope for Fase 6 medmindre eksplicit besluttet.

### 6.6 Deferred: `isInsideMine`-flag mod force-close-save-scumming (D70)

> **Status:** Per D70 er dette eksplicit deferred til v1.1+. Ikke i scope for Fase 6.

Når/hvis behovet opstår, er implementationen lille:

```ts
// PlayerState
interface PlayerState {
  // ... eksisterende felter
  isInsideMine: boolean;   // ny — D70
}

// Reducer
function reduceMineEntry(state) {
  return { ...state, player: { ...state.player, isInsideMine: true } };
}

function reduceMineExit(state) {
  // Kaldt af både MINE_RUN_EXIT og MINE_PLAYER_DEATH efter exit-pipeline er færdig
  return { ...state, player: { ...state.player, isInsideMine: false } };
}

// Load-time recovery
function postLoadCheckIsInsideMine(state) {
  if (!state.player.isInsideMine) return state;
  
  // Force-close detected — behandl som død
  const survivors = deathMergeSurvivors(state);
  return mergeSurvivorsToHub({
    ...state,
    player: { ...state.player, runInventory: null, isInsideMine: false },
    location: 'hub',
    mineRun: null,
  }, survivors);
}
```

Bumper `CURRENT_STATE_VERSION` for det ene felt når aktiveret.

### 6.6 Acceptkriterier

1. H1-recovery testet med synthetic corrupt saves.
2. Balance-pass-rapport produceret og review'et.
3. Alle audit-tests grønne.
4. Nye Fase 2–5-achievements live.
5. D69 dokumenteret i `implementation-plan.md`. D39 og D37 efter-tjekkes for korrekt superseded-markering.

---

## Fase 6 — Polering

*Detaljer skrives sidst. Inkluderer balance-pass, achievement-udvidelser til nye systemer, og eventuel telemetri (G2).*

---

## Bilag A — Beslutningsoversigt

Alle design-beslutninger er taget. Tabellen viser hvor hver decision er låst i guiden.

| Kode | Emne | Beslutning | D-række(r) |
|---|---|---|---|
| A1 | Run/hub-inventory | Implementér nu (Fase 2) | D43 |
| A2 | Progression-autoritet | worldTier/depth alene | D42 |
| A3 | Loft-arkitektur | Håndhævet pipeline | D40 |
| G1 | "Any mine" data | Aggregér ved query | D44 |
| G2 | Telemetri | Kun lokal | D45 |
| Fase 2 mekanik | Run/hub-split | Sikret Loadout + Redningstaske | D46–D52, D7, D8 |
| B1 | Armour-slots | 3 slots | D53 |
| B2 | Durability | Per-slot; brudt = 0 bonus | D54, D55 |
| B3 | Stacking | Additivt | D56 |
| B4 | Smithing-cost | Centraliseret | D57 |
| E1 | Soul-bound type | Quest tools + tier-N hub-craft | D59 |
| E2 | Soul-bound effekt | Bypasser rescueBag-cap | D58 |
| E3 | Soul-bound cap | Ingen tals-cap, kun typer | D60 |
| C1 | XP-kilder | Mine-kills, mining, dybde, crafting, alkymi, quests | D62 |
| C2 | Level-effekt | Kun butik | D61 |
| C3 | XP-kurve | Plateau (10/worldTier) | D63 |
| D1 | Tidsmodel | Hub-sleep | D64 |
| D2 | Restock | Daglig | D65 |
| F1 | Brew-kontrakt | Håndhævet effekt | D66 |
| F2 | AoE-model | Fork (primær + N) | D67 |
| F3 | Slot-refaktor | Behold | D68 |
| H1 | Crash recovery | Dialog med fallback | D69 |
| (Force-close) | Save-scumming via app-kill | `isInsideMine`-flag, deferred til v1.1+ | D70 |

---

## Bilag B — Næste skridt

1. **Du:** Læs guiden igennem og flag uoverensstemmelser eller misforståelser. Særligt opmærksomheds-punkter: B3 (additivt stacking) er en balance-watch, og C2 (kun butik) er meget minimalistisk — overvej om level skal have *nogen* synlig effekt udover butik (toast/badge ved level-up er ikke i scope p.t.).
2. **Mig (på din anmodning):** Producer en `implementation-plan.md`-patch med de nye D-rækker (D40–D69) i korrekt format.
3. **Composer:** Tag Fase 0 først; lever scaffolding og fixtures. Derefter Fase 1 og 2 (kan parallelt). Fase 3 efter Fase 2. Fase 4 efter Fase 1. Fase 5 efter Fase 2. Fase 6 sidst.
4. **Løbende:** Opdatér denne guide hvis en beslutning ændres — ingen silent overstyring af D-rækker. Brug `[supersedet af DNN]`-mønsteret fra §1.1.

---

*Guide-status: komplet draft. Faserne låses individuelt når deres acceptkriterier er grønne og deres D-rækker er tilføjet til `implementation-plan.md`.*
