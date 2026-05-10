# GemSimulator — Mine-system: implementeringsguide

**Version:** 1.1 (10. maj 2026)  
**Formål:** Trinvis, kode-nær guide til at implementere spec i `mine-implementation-plan.md` (v2.1+). Brug dette dokument som **primær kontekst** i en ny chat sammen med evt. `docs/mine-implementation-plan.md`.

**Ny i v1.1:** §18 — konkret implementeringsplan for **fladt underlag + vilkårlig felt­placering** (fortrækker denne frem for §16 punkt 6 når I migrerer layout).

**Forudsætning:** Læs først **«Vedtagne designvalg»** i plan-filen (1A–7). Denne guide operationaliserer dem.

---

## 1. Nøgleord og mål

| Begreb | Betydning |
|--------|-----------|
| **Kerne-lag** | `MineRunSlotState[]` + antal felter (5–10) + slot-typer (sten/kiste/mob). **Ikke** påvirket af grafik-preset. |
| **Layout** | `CaveConfig` for det aktuelle lag: `oreSlots`, `bounds`, fog/lys farver, stalaktit-intervaller, osv. |
| **Kosmetik** | Ekstra geometri (fx instanced «klipper») uden gameplay; **skal** følge preset i seed (2A). |
| **Bonusetage (4a)** | Lag hvor alle felter er kister → ingen mandatory slots → `canDescendFromLayer` er sand med det samme. |

**Mål:** Variation i rum og størrelse, flere slots, kosmetik + presets, `MobType` (kosmetik nu), uændret balance-princip for mandatory clear (3A), fuld determinisme for kerne-lag (1A).

---

## 2. Kort kort over eksisterende kode (før ændring)

| Område | Fil(er) |
|--------|---------|
| Lag-generering | `src/gem/mineLayer.ts` — `generateLayerState`, `hashStringToSeed`, lokal `mulberry32`, bruger `getCaveConfig(area)` og løber `cfg.oreSlots.length`. |
| Slot-typer / save | `src/lib/mineTypes.ts` — `MineRunSlotState`, `MineRunState`. |
| Statisk grotte pr. område | `src/types.ts` — `CaveConfig`, `DEFAULT_CAVE_CONFIG`, `getCaveConfig(area)`. |
| Per-område overrides | `src/data/areas.ts` — `caveConfig` på enkelte `Area`. |
| Sten/kiste-udtræk | `src/gem/mining.ts` — `rollRockEvent`, `rollChestLoot`, `mobSlotChanceForDepth`, `mobHpForDepth`, `rollMobMineDrop`, … |
| Nedstigning / run | `src/lib/gameState.ts` — `MINE_DESCEND_LAYER` kalder `generateLayerState` med `nextDepth`. |
| 3D-mine | `src/components/mine/3d/MiningCave3D.tsx` — `getCaveConfig(area)`, `ProceduralCave`, `PlayerControls bounds={cfg.bounds}`, `oreSlots.map` → `OreNode` / kister. |
| 2D/UI omkring slots | `src/components/mine/MineScreen.tsx` — `getCaveConfig(area).oreSlots` til kister, skade, `cfgSlots`. |
| Procedurale visuelle klipper | `src/gem/procedural/rockLayout.ts`, `mineRockSeed.ts`, `buildProceduralMineRock.ts` (våben-overlay bruger `weaponCaveCfg`). |
| Tests | `src/gem/mineLayer.test.ts`, `src/data/areas.caveConfig.test.ts`. |

**Vigtigt:** Planen nævnte `VoxelScene.tsx` — i repo hedder hovedkomponenten **`MiningCave3D.tsx`**. Opdater interne referencer i docs efter behov.

**Obs. (eksisterende):** `MiningCave3D` bruger i dag `useState(() => Math.floor(Math.random() * 1e9))` som `caveSeed` til `ProceduralCave`. Det gør **grottens procedurale mesh** ikke reproducerbart på tværs af sessions. Kerne-mine (slots) er deterministisk. Overvej i implementering at binde `caveSeed` til `hash(runId, depth)` (valgfri forbedring, ikke i original plan).

---

## 3. Arkitektur efter implementering (målbillede)

```
resolveMineLayerContext(area, runId, mineId, depth)
  → template, size, effectiveCaveConfig (merged: palette fra area + layout fra generator)

generateLayerState({ …, effectiveCaveConfig, slotCount, rng })
  → MineRunSlotState[]  // 5–10, preset-uafhængig

generateCosmeticRocks({ runId, mineId, depth, presetId, effectiveCaveConfig, interactivePositions })
  → CosmeticRock[]      // kun visuelt; seed inkl. preset (2A)
```

- **`getCaveConfig(area)`** bør på sigt **ikke** være den eneste indgang til layout under run: UI og 3D skal bruge **samme** `effectiveCaveConfig` som `generateLayerState` for det aktuelle `currentDepth`.

---

## 4. Designvalg (kort reference — fuld tabel i plan-filen)

- **1A:** Layout afledes af seed; gem ikke separat rum-metadata i save.
- **2A:** Kosmetik-seed inkluderer grafik-preset.
- **3A:** Alle `rock` + `mob` skal ryddes før ned; kister valgfrie.
- **4 + 4a:** Fuld RNG med vægte (færre kister/mob end sten; færre «gode» sten end normal); kun-kister-lag tilladt som ultra-sjælden bonusetage.
- **5A:** `MobType` kun visning nu; forbered signatur til senere loot-split.
- **6A:** Corridor = geometri/bounds kun.
- **7A:** Én global generator; undgå at låse døren for senere «story vs rogue» (7C).

---

## 5. Fase 0 — Forberedelse i repo (før feature-gren)

1. Opret feature-branch.
2. Gennemgå alle call sites af `getCaveConfig(area)` (grep) og klassificér:
   - **Run-kritisk** (skal have `runId` + `depth`): `MineScreen`, `MiningCave3D`, `gameState` ved descend, evt. telemetri.
   - **Statisk preview** (hub/kort): må beholde `getCaveConfig(area)` hvis det kun er marketing.
3. Beslut **én** eksportfunktion, fx:

   `resolveEffectiveCaveConfig(args: { area: Area; runId: string; mineId: string; currentDepth: number }): CaveConfig`

   Implementér den i fx `src/gem/mineCaveContext.ts` (ny fil) så `mineLayer.ts` og UI importerer samme logik.

---

## 6. Fase 1A — Typer og konstanter

### 6.1 `src/types.ts`

- Tilføj `RoomTemplate`, `RoomSize` (kan være tomme aliases indtil Fase 2 hvis I vil minimere diff — foretræk at definere dem nu og bruge `'classic' | …` i `CaveConfig`).
- Udvid `CaveConfig` med **valgfrie** felter `template?`, `size?` (eller sæt altid når resolver kører).
- Tilføj `CosmeticRock` (overvej `modelId: string` frem for `1|2|3` for asset-keys).
- Tilføj `MobType` union (start med 2–4 navne; udvid senere).

### 6.2 `src/lib/mineTypes.ts`

- På `MineRunSlotState`: `mobType?: MobType`, evt. `mobVisualTint?: string` (hex eller palet-id) til placeholder-farve.
- **Ikke** gem kosmetiske klipper i `MineRunState` hvis de fuldt kan regenereres fra `(runId, mineId, depth, preset)` — mindre save og matcher 1A/2A.

---

## 7. Fase 1B — Grafik-presets

### 7.1 Ny fil: `src/gem/graphicsPresets.ts`

Definér fx:

```ts
export type GraphicsPresetId = 'performance' | 'balanced' | 'rich'

export type GraphicsPreset = {
  id: GraphicsPresetId
  label: string
  cosmeticRockCount: { min: number; max: number }  // før room-size bonus
  dpr: [number, number]       // til <Canvas dpr={…}>
  shadowMapSize?: number      // hvis I eksponerer det
  particleCap: number
  fogMultiplier?: number      // skaler near/far hvis ønsket
  cosmeticLodBias?: number    // konkretér: fx max distance eller simpel «skip hver n-te instans»
}
```

- Eksporter `GRAPHICS_PRESETS: Record<GraphicsPresetId, GraphicsPreset>` og `DEFAULT_GRAPHICS_PRESET_ID`.
- Tilføj konstant **`GRAPHICS_SCHEMA_VERSION = 1`** — hash den ind i kosmetik-seed så I kan invalider gamle placeringer ved algoritme-skift uden at ændre spil-balance.

### 7.2 Persistens

- `localStorage` key fx `gemSimulator.graphicsPreset`.
- Hook eller lille context: `useGraphicsPreset()` der returnerer `[presetId, setPresetId]`.

### 7.3 UI: `src/components/settings/GraphicsSettings.tsx` (eller under `mine/`)

- Tre knapper / radio: Performance / Balanced / Rich.
- Placer et logisk sted (mine-skærm header, eller global settings — produktvalg).

### 7.4 Wiring til Canvas

- `MiningCave3D`: læs preset; send `dpr` ned til `<Canvas>`.
- Pass `presetId` (eller afledt `cosmeticRockCount`) til en ny child der renderer kosmetiske instanser **eller** til `generateCosmeticRocks` kaldt i parent med `useMemo` keyed på `runId`, `depth`, `presetId`, `effectiveCaveConfig`.

---

## 8. Fase 1C — Slot-antal og slot-type-RNG (designvalg 3A + 4 + 4a)

### 8.1 Slot-antal

- Konstanter: `MIN_INTERACTIVE_SLOTS = 5`, `MAX_INTERACTIVE_SLOTS = 10`.
- `slotCount = MIN + floor(rng() * (MAX - MIN + 1))` (eller fordeling med bias mod 6–8 — dokumentér valgt fordeling).

### 8.2 Forenelig `oreSlots` og `slots.length`

I dag er `slots.length === cfg.oreSlots.length` invariant. **Bevar det:**

1. `resolveEffectiveCaveConfig` returnerer `oreSlots` med **præcis `slotCount`** punkter (efter Fase 2: fra template; inden da: kan være udvidet/kontrakteret udgave af classic-layout).
2. `generateLayerState` itererer `i in 0..slotCount-1` og skriver `slotIndex: i`.

### 8.3 Ny fordelingsmodel (erstat ikke `rollRockEvent` blindt)

**Nuværende model:** `rollRockEvent` trækker blandt `RockType` inkl. `chest` i vægtet tabel; derefter **separat** `mobSlotChanceForDepth` for mob vs klippe i `mineLayer.ts`.

**Målmodel (guide):**

1. **Trin A — felt-type:** For hvert slot `i`, træk `fieldKind`: `'chest' | 'mob' | 'rock'` med vægte så **chest** og **mob** er sjældnere end **rock** (konkrete tal i kode som navngivne konstanter, fx `W_CHEST`, `W_MOB`, `W_ROCK_BASE`).
2. **Trin B — hvis rock:** Brug en **skaleret** udgave af jeres vægtede sten-typer så **normal** dominerer og **rich/crystal/hard** er underrepræsenteret ift. i dag (justér `ROCK_EVENT_WEIGHTS` eller ny `rollRockSubtypeForSlot` uden `chest`/`mob` keys).
3. **Trin C — hvis mob:** Sæt `kind: 'mob'`, kald `rollMobType(depth, rng)` (kosmetik), `mobHpForDepth` uændret (5A).
4. **Trin D — hvis chest:** `rollChestTier`, `rollChestLoot` som i dag.
5. **4a:** Ingen særlig guard — et lag kan blive 100 % kister. Verificér at `canDescendFromLayer` allerede returnerer `true` (se `mineLayer.test.ts`). Tilføj test: «alle kister, ingen rock/mob → descend tilladt».

**RNG-rækkefølge (fastlås i kode-kommentar):**

1. Hash hoved-seed: `h0 = hashStringToSeed(\`${runId}|${mineId}|${depth}\`)` (bevar kompatibilitet med eksisterende `generateLayerState` så længe muligt).
2. Opret `rng = mulberry32(h0)`.
3. Forbrug i rækkefølge: `slotCount` → for hver slot: `fieldKind` → (gren) subtype / mob / chest data.

Hvis I **ændrer** forbrugsrækkefølge i en senere patch, accepter at eksisterende runs ikke reproduceres — eller bump en `LAYER_GEN_VERSION` i hash.

### 8.4 Mob-chance vs ny fieldKind-model

Når felt-type allerede kan være `mob`, skal `mobSlotChanceForDepth` enten:

- **Fjernes** som separat check, **eller**
- Bruges som **ekstra** «tvungen mob»-regel (anbefales **ikke** — dobbeltlogik).

Anbefaling: **én kilde** — `fieldKind` fra vægte; justér vægte med dybde (`W_MOB` stiger langsomt med depth).

---

## 9. Fase 1D — `MobType` (kosmetik)

### 9.1 `rollMobType(depth, rng)` i `src/gem/mining.ts`

- Returnér `MobType` med simpel vægtet tabel afhængig af `depth`.
- Ingen ændring af `mobHpForDepth` / `mobDamagePerTick` i v1.

### 9.2 Rendering

- `OreNode` / `SeamSkulkerMob.tsx`: læs `slot.mobType` og anvend **farvevariation** (material `color`, `emissive`, eller palet fra `PALETTES`) som placeholder.
- Forbered `rollMobMineDrop(area, depth, activeCharms, rng, mobType?)` — i v1 ignorer `mobType` (optional param med default).

---

## 10. Fase 1E — Kosmetiske klipper

### 10.1 Generering

Ny funktion (fx i `src/gem/mineCosmetics.ts`):

Input: `runId`, `mineId`, `depth`, `presetId`, `GRAPHICS_SCHEMA_VERSION`, `oreSlots` (til non-blocking afstand), `bounds`.

- `hCos = hashStringToSeed(\`${runId}|${mineId}|${depth}|cosmetic|${presetId}|v${GRAPHICS_SCHEMA_VERSION}\`)`
- `rngC = mulberry32(hCos)`
- `count` fra preset-interval + bonus for `RoomSize` når Fase 2 findes (indtil da: bonus 0 eller fra `bounds`).

**Non-blocking:** Afstand fra hver kandidat-position til **hver** `oreSlots[i]` > 2.5 (Euklidisk i XZ; Y inden for gulv/væg-regel). Maks forsøg pr. instans (fx 40) før discard.

**Gulv vs væg:** 65 % / 35 % — væg: projicer punkt på «væg-ring» defineret af `bounds` (simpel matematik: vælg vægplan tilfældigt, sæt Y i interval).

### 10.2 Rendering

- Ny komponent under `src/components/mine/3d/` fx `CosmeticRocksInstanced.tsx`:
  - Én `InstancedMesh` pr. `modelId` (eller én mesh med farve-attribut hvis samme geometri).
  - Ingen raycast, ingen `onClick`, `layers` eller `raycast` disabled hvis nødvendigt.
- Mount i `CaveContent` **efter** `ProceduralCave` eller som søsken — må ikke skygge for hit targets.

### 10.3 Assets

- Start med **simple** `BoxGeometry` / delt low-poly indtil GLB findes; behold `CosmeticRock.modelId` som string-key til senere swap.

---

## 11. Fase 2 — Rum-templates og størrelse

### 11.1 Generator-funktioner (i `mineCaveContext.ts` eller `mineLayer.ts`)

- `getRoomTemplate(depth, runId, mineId): RoomTemplate` — deterministisk fra `hash(...)`.
- `getRoomSize(depth, runId, mineId): RoomSize` — tilsvarende.
- `generateCaveConfig(template, size, areaStyle: Partial<CaveConfig>): CaveConfig`:
  - Returnér fuld `CaveConfig`: `oreSlots` (5–10 koordinater), `bounds` skaleret, justér evt. `fogNear`/`fogFar` proportionalt.
  - Merge **visuelle** defaults fra `area.caveConfig ?? DEFAULT_CAVE_CONFIG` (farver, crystalMetal, stalaktit-range) så hver mine beholder identitet.

### 11.2 Templates (v1 geometri)

| Template | Kort beskrivelse |
|----------|------------------|
| `classic` | Nuværende relative fordeling (baseline), skaleret til `slotCount`. |
| `corridor` | Lang smal boks: øg `bounds` langs Z, skær X; placer slots langs linje / to rækker. |
| `island` | Cirkel/ellipse af slots omkring center; større `bounds`. |
| `dogleg` | To segmenter (L): del `oreSlots` i to grupper med offset. |

**6A:** Ingen ændring af `PlayerControls` logik ud over ny `bounds`-værdi.

### 11.3 Integration i `resolveEffectiveCaveConfig`

1. Læs `area`.
2. `template` + `size` fra RNG.
3. `generateCaveConfig(...)`.
4. Returnér merged `CaveConfig`.

### 11.4 UI / 3D

- `MiningCave3D`: `useMemo(() => resolveEffectiveCaveConfig({ area, runId: mineRunId, mineId, currentDepth: runDepth }), [area, mineRunId, mineId, runDepth])`.
- `MineScreen`: brug samme resolver til kiste-positioner og `cfgSlots = effective.oreSlots.length`.
- `gameState.ts` `MINE_DESCEND_LAYER`: når I refaktorerer, skal `generateLayerState` modtage **samme** `effectiveCaveConfig` som UI vil vise for `nextDepth` — overvej at lade `generateLayerState` selv kalde resolver internt med de args den allerede har (`area`, `runId`, `mineId`, `currentDepth`).

---

## 12. `generateLayerState` — ny signatur (forslag)

```ts
export function generateLayerState(args: {
  area: Area
  mineId: string
  runId: string
  currentDepth: number
  activeCharms: string[]
  /** Hvis udeladt: beregn via resolveEffectiveCaveConfig(args) */
  caveConfig?: CaveConfig
}): MineRunSlotState[]
```

Internt: `const cfg = args.caveConfig ?? resolveEffectiveCaveConfig(args)` — undgå dobbelt kald ved at `MINE_DESCEND_LAYER` ikke sender `caveConfig` med mindre I allerede har beregnet den for UI.

---

## 13. Tests (minimum)

| Test | Fil | Beskrivelse |
|------|-----|-------------|
| Bonusetage | `mineLayer.test.ts` | Alle slots `kind === 'chest'` → `canDescendFromLayer` === true. |
| Determinisme kerne | `mineLayer.test.ts` | To kald `generateLayerState` med samme args → identisk `slots` (inkl. `chestLoot` struktur). |
| Slot-antal | `mineLayer.test.ts` | `slots.length` i [5, 10] og matcher `caveConfig.oreSlots.length`. |
| Kosmetik preset | Ny `mineCosmetics.test.ts` | Samme args men forskellig `presetId` → forskellig `CosmeticRock[]` (eller forskellig count); samme `presetId` → identisk. |
| Resolver | Ny `mineCaveContext.test.ts` | Samme `runId`+`depth` → samme `bounds` + slotCount for template/size. |
| Opdater | `areas.caveConfig.test.ts` | Hvis `getCaveConfig` ændrer semantik, tilpas eller test kun `resolveEffective` for dynamiske miner. |

---

## 14. Manuel QA-checkliste

- [ ] Nedstigning med blandet lag (sten + mob + kiste) kræver stadig alle sten+mobs ryddet.
- [ ] Bonusetage (kun kister): descend-knap aktiv uden hug.
- [ ] Kun mobs: descend først når alle mobs døde.
- [ ] Skift grafik-preset: kerne-slots uændret; kosmetik ændrer sig (2A).
- [ ] Save/load midt i run: slots og dybde konsistente; layout matcher seed (1A).
- [ ] Ingen kosmetik blokerer for raycast mod aktiv klippe/mob (spot-check).
- [ ] Performance: Rich med max kosmetik — stabil FPS på mål-hardware.

---

## 15. Kendte risici og mitigering

| Risiko | Mitigering |
|--------|------------|
| Glemt call site til `getCaveConfig` | Én gang grep + erstat med resolver i mine-kontekst. |
| Dobbel RNG (gammel mob-chance + ny fieldKind) | Fjern gammel gren; én model. |
| For svær «kun mob»-etage | Tune `W_MOB` og `mobHpForDepth` senere; ikke blokér implementation. |
| Corridor føles klaustrofobisk | Kun data-tuning af `bounds` og slot-placering (6A). |
| Save-størrelse | Gem ikke kosmetik-array i `MineRunState`. |

---

## 16. Rækkefølge anbefalet til implementering

1. `resolveEffectiveCaveConfig` + wire til `generateLayerState` (uden templates: stadig «classic» + variabel `slotCount` hvis I vil splitte PR).
2. Slot-type-RNG + tests (4 + 4a + 3A).
3. `MobType` + tint i `SeamSkulkerMob`.
4. `graphicsPresets.ts` + UI + kosmetik-seed.
5. `CosmeticRocksInstanced` + non-blocking placement.
6. Fase 2: `getRoomTemplate` / `getRoomSize` / `generateCaveConfig` templates.
7. Valgfrit: deterministisk `caveSeed` fra `runId`+`depth`.

---

## 17. Leverancer til «ny chat»

Når du starter ny chat, vedhæft:

1. `docs/mine-implementation-plan.md` (v2.1+)
2. **Denne fil:** `docs/mine-system-implementation-guide.md`

Skriv kort: «Implementér ifølge guide, start med trin 1 i §16» eller angiv PR-afsnit. Ved layout-/gulv-reset: **start med §18 Fase 1**.

---

## 18. Implementeringsplan: fladt underlag + vilkårlig felt­placering

**Mål:** Reducere lodret hack-stak (ujævnt gulv vs pivot vs mesh-fod), fjerne synlige geometriske malm­mønstre (ring, L, perler på snor), og bevare **fuld determinisme** samt invarianten `slots.length === oreSlots.length`.

**Ikke-mål i første omgang:** Nye rum­skabeloner som gameplay-feature; grafisk «kuperet» gulv kan genindføres senere som ren **visuel** displacement shader/mesh uden gameplay-sampling.

---

### 18.1 Invariant og RNG-kontrakt (læs før kode)

| Krav | Handling |
|------|----------|
| Samme `runId` + `mineId` + `depth` → samme `CaveConfig` og samme `MineRunSlotState[]` | Ingen nye `Math.random`-kald i layout uden seed; ingen ændring af rækkefølgen af eksisterende `rng()`-træk i `generateLayerState` uden at duplikere dem (som i dag for de første tre træk). |
| Kerne-lag uændret af grafik-preset | Kun layout/gulv/kosmetik berøres som beskrevet. |

**Under-layout RNG:** Brug et **dedikeret under-frø** til felt-positioner, fx  
`mulberry32(hashStringToSeed(\`${mineLayerSeedKey(runId, mineId, depth)}|oreXZ|v1\`))`  
— så felt-placering **ikke** forbruger den samme `mulberry32`-strøm som `rollMineFieldKind` / kiste-loot. Dokumentér suffix (`oreXZ|v1`) så fremtidige ændringer kan versioneres.

---

### 18.2 Fase 1 — Fladt underlag (PR 1)

**Formål:** Gulvhøjde konstant i hele spillefladen; `sampleCaveFloorMeshY` og rendret gulvmesh matcher.

| Trin | Fil(er) | Handling |
|------|---------|----------|
| 1.1 | `src/lib/caveFloorSurface.ts` | Gør `rawCaveFloorY` konstant (fx kun fast offset `0.02` eller `0`), eller sæt noise-amplitude til `0`. Bevar evt. signatur med `noise`-parameter til kompatibilitet, men resultatet skal være **uafhængigt af (x,z)**. |
| 1.2 | Gulv-mesh | Bekræft at `makeHorizontalPlane` / tilsvarende i cave-byggeren bruger samme hjørne­højder som `rawCaveFloorY` (grep efter `rawCaveFloorY`, `makeHorizontalPlane`). Ved afvigelse: én sandhedskilde — typisk `rawCaveFloorY`. |
| 1.3 | `src/components/mine/sinkOreSlotPosition.ts` | **`alignOreSlotYToCaveFloor`:** når gulv er fladt, er `yHere - yRef` altid `0` — implementér som **no-op** (tidlig `return`) eller fjern kald til alignment fra `sinkOreSlotWorldPosition` og dokumentér invariant: «malmpivot-Y er kun basis + sinks». |
| 1.4 | `src/gem/mineCosmetics.ts` | Efter fladt gulv er `surfaceY` konstant; ingen logik­ændring nødvendig udover evt. forenkling af kommentarer. |
| 1.5 | Tests | Tilføj/evt.: ét test-case at `sampleCaveFloorMeshY(..., x, z)` er **uafhængig af x,z** (eller konstant inden for epsilon). Kør `mineCaveContext.test.ts`, `mineCosmetics.test.ts`. |

**Exit-kriterium:** Ingen synlig «bølge» på gulvmesh; ingen lodret justering fra floor-sampling ændrer malmens Y meningsfuldt.

---

### 18.3 Fase 2 — Forenkling af lodret malm-stack (PR 2, kan merges med PR 1 hvis lille)

**Formål:** Færre lag efter fladt gulv.

| Trin | Fil(er) | Handling |
|------|---------|----------|
| 2.1 | `sinkOreSlotPosition.ts` | Efter no-op alignment: gennemgå `oreFootVisualSinkBias` — behold kun hvad der stadig retter **mesh-form** (rich/large scale); fjern død kode. |
| 2.2 | `src/gem/procedural/buildProceduralMineRock.ts` | **Valgfrit:** Bevar bund-fladning (`FLAT_THRESHOLD`) og foot-ankring indtil QA; kun fjern/oprens hvis ingame-tests viser redundant lodret korrection. |
| 2.3 | Manuel QA | Gennemse én malm pr. type (normal/hard/rich/crystal) + kiste/mob — ingen svæv, acceptable fødder. |

---

### 18.4 Fase 3 — Ny felt­placering (Poisson-lignende, PR 3)

**Formål:** Erstat `computeRoomLayout`-skiftet (classic / corridor / island / dogleg) med **stokastisk placering** inde i spillepolygon/rektangel, med **min-afstand** mellem felter og **eksklusionszone** om spawn.

#### 18.4.1 Geometrisk container

- Bevar **rumskala** (`RoomSize` → `ROOM_SIZE_WORLD_MUL`) og et forenklet **basis-bounds** `B` fra `base.bounds` som i dag.
- Definér **inderside** af spillefladen: rektangel eller polygon med **væg-padding** (samme orden som `INNER_PAD` / playable half extents — genbrug `getPlayableHalfExtents` eller tilsvarende konstanter fra `pickMineSpawn.ts` / `caveHalfExtents`).
- Enten:
  - **(Anbefalet)** Ét «neutralt» rum: `boundsHalfX` / `boundsHalfZ` afledes fra **maksimal udstrækning af felter + `INTERACTIVE_ORE_MESH_PAD`** (som classic-grenen i dag), eller
  - Behold forhold **korridor-lignende** (`hx < hz`) som **valgfri** vægtning fra `RoomTemplate` — kun hvis I stadig vil variere rumform; ellers start med **kvadratisk** container for mindst kompleksitet.

#### 18.4.2 Spawn-eksklusion uden cirkulær afhængighed

`pickMineSpawn` bruger klippehindringer; felterne må ikke ligge under spillerens start.

**Anbefalet procedure:**

1. Udled **foreløbig** `halfX`, `halfZ` fra `B` og rumstørrelse (samme som nu før felter lægges, eller fast kvotient).
2. Beregn **deterministisk spawn XZ** der matcher den **ingen-hindring**-gren i `pickMineSpawn` (obstacles tom): udtræk ren funktion `pickMineSpawnXZEmptyRoom({ halfX, halfZ, mineRunId, runDepth })` fra eksisterende logik i `pickMineSpawn.ts` (samme hash som `spawnFracIndex` og samme kandidatliste).
3. Dart throwing / Poisson: for hvert felt `i = 0 .. slotCount-1`, gentag med `layoutRng`: foreslå `(x,z)` uniformt i indre rektangel; **afvis** hvis afstand til eksisterende felter `< MIN_SLOT_DIST`, eller til spawn `< SPAWN_CLEAR_RADIUS`, eller uden for bounds.
4. **Y på felter:** Konstant `fy` fra `floorYFromBase(base)` (som nu); ingen floor-sample nødvendig efter Fase 1.
5. Udregn **endelig** `bounds`, `boundsHalfX/Y`, `fogNear`/`fogFar` fra felternes ekstremværdier + pad (som classic/island-grene).

Konstanter (tuned i én fil, fx øverst i `mineCaveContext.ts`):

- `MIN_SLOT_DIST` — start ~2.8–3.5 (XZ, meter); skal være ≥ mesh-pad + lidt gameplay-luft.
- `SPAWN_CLEAR_RADIUS` — start ~2.5–4.0; verificér mod faktisk spawn og klippe-radius.

**Max forsøg** pr. felt (fx 80–120); hvis felt ikke kan placeres: **fallback** (deterministisk): spiral fra midten, eller seneste gyldige punkt med minimal overlap-advarsel i dev — eller reducer `MIN_SLOT_DIST` trinvist i kun fallback-gren (documentér).

#### 18.4.3 Skæbnen for `RoomTemplate`

**Minimal migration:** Behold `drawRoomTemplate(rng)` og `drawRoomSize(rng)` i `resolveEffectiveCaveConfig` / `generateLayerState` **uden at bruge dem til XZ** (kun til fog/tuning eller fremtidig brug). Det undgår ændring af RNG-forbruget i kerne-laget.

**Alternativ (renere):** Fjern template fra layout og kompenser RNG med samme antal dummy-træk — kun hvis tests og grep viser ingen afhængighed af `cfg.template` i gameplay.

#### 18.4.4 Filer der typisk ændres

| Fil | Ændring |
|-----|---------|
| `src/gem/mineCaveContext.ts` | Ny `placeOreSlotsStochastic(...)` (eller omskrivning af `computeRoomLayout`); behold eksport af `computeRoomLayout` eller erstat med ét kald; versionér layout-seed. |
| `src/components/mine/pickMineSpawn.ts` | Eksporter/refaktor `pickMineSpawnXZ` for **tom hindringsliste** til genbrug i layout-fasen. |
| `src/gem/mineCaveContext.test.ts` | Opdater forventninger: bounds/slots stadig deterministiske; evt. snapshot af ét seed. |
| `src/data/areas.caveConfig.test.ts` | Tilpas hvis `oreSlots`-koordinater ændrer sig strukturelt. |

#### 18.4.5 Kosmetiske klipper

`generateCosmeticRocks` bruger allerede afstand til `oreSlots` og floor-sample. Efter Fase 1 + 3:

- Floor-Y konstant → kosmetik-Y forenkles implicit.
- Behold **`farEnoughFromSlots`**; evt. tilføj **min-afstand mellem kosmetiske instanser** (sekundær dart-pass) hvis clustering stadig ses.

---

### 18.5 Fase 4 — Dokumentation og oprydning (PR 4 eller samme som PR 3)

- Opdatér **§2** kort reference-tabel i denne fil (hvor layout genereres).
- Afklar i kommentar i `mineCaveContext.ts`: «layout seed v1» og Poisson-konstanter.
- Hvis `RoomTemplate` ikke længere styrer geometri: marker i `types.ts` som **kun metadata / fremtid** eller fjern efter grep.

---

### 18.6 Test- og QA-matrix

| Område | Automatiseret | Manuel |
|--------|----------------|--------|
| Flat gulv | `sampleCaveFloorMeshY` konstant | Visuel: ingen bølge |
| Determinisme | Samme seed → samme `resolveEffectiveCaveConfig().oreSlots` | — |
| Slot-antal | `mineLayer.test.ts` | — |
| Spawn | — | Start ikke inde i malm / ikke klemt mod væg |
| Kosmetik | `mineCosmetics.test.ts` afstand til slots | Rich preset, mange instanser |
| Nedstigning / save | Eksisterende flow-tests | Load midt i run |

---

### 18.7 Rækkefølge og PR-strategi

1. **PR A:** §18.2 + §18.3 (gulv + lodret forenkling). Lav pause til QA.
2. **PR B:** §18.4 (felt-placering + spawn-eksklusion + tests).
3. **PR C:** §18.5 (docs + død kode / template-oprydning).

Rollback: Fase 1 er isoleret i `caveFloorSurface.ts` + `sinkOreSlotPosition.ts`; Fase 3 er isoleret i `mineCaveContext.ts` (+ lille refaktor `pickMineSpawn`).

---

*Slut på implementeringsguide v1.1.*
