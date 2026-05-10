# GemSimulator — Plan: Stokastisk malm­felt­placering (§18.4)

**Status:** Ikke implementeret i repo (maj 2026). Layout bruger stadig `computeRoomLayout` med **classic / corridor / island / dogleg** i `src/gem/mineCaveContext.ts`.

**Forankring:** Udvider og operationaliserer **§18.4** i [`mine-system-implementation-guide.md`](./mine-system-implementation-guide.md) og RNG-kontrakten i **§18.1** (under-layout-frø). Forudsætter at **§18.2** (fladt underlag) er på plads — det er det i den nuværende kodebase (`caveFloorSurface.ts`, no-op alignment i `sinkOreSlotPosition.ts`).

**Relateret:** [`mine-implementation-plan.md`](./mine-implementation-plan.md) (designvalg 1A–7).

---

## 1. Formål og ikke-mål

**Formål**

- Erstatte template-baserede malm­mønstre (ring, L, «perler på snor») med **stokastisk placering** i et defineret spilleområde.
- **Min-afstand** mellem interaktive felter og **eksklusionszone** om spillerens spawn, så start ikke klumper med malm eller klemmes uhensigtsmæssigt.
- Bevare **fuld determinisme**: samme `runId` + `mineId` + `depth` → samme `CaveConfig` (herunder `oreSlots`) og uændret kerne-lag-RNG i `generateLayerState`.
- Bevare invarianten **`slots.length === oreSlots.length`**.

**Ikke-mål (første iteration)**

- Nye rum­skabeloner som gameplay-feature.
- Ændring af hvor mange felter der rulles (5–10) eller felt-type-RNG (sten/kiste/mob) — kun **XZ-layout** og afledte bounds/tåge.

---

## 2. Invariant og RNG-kontrakt

| Krav | Handling |
|------|----------|
| Kerne-lag (`MineRunSlotState[]`) uændret af grafik-preset | Kun layout/kosmetik berøres; ingen ændring af preset i `generateLayerState`. |
| Samme seed → samme layout | Ingen `Math.random` i layout uden deterministisk frø. |
| Layout må **ikke** stjæle `rng()`-træk fra felt-indhold | Brug **dedikeret layout-frø** adskilt fra `mulberry32(mineLayerSeedKey(...))` som bruges til `rollMineFieldKind` / loot. |

**Anbefalet under-frø (versionér suffix ved algoritme-skift):**

```text
layoutSeed = hashStringToSeed(`${mineLayerSeedKey(runId, mineId, depth)}|oreXZ|v1`)
layoutRng = mulberry32(layoutSeed)
```

Alle dart-throwing-træk kommer fra `layoutRng`. Dokumentér konstanten **`oreXZ|v1`** i `mineCaveContext.ts` (jf. guide §18.5).

---

## 3. Geometrisk container

- Bevar **rumskala** (`RoomSize` → `ROOM_SIZE_WORLD_MUL`) og basis-bounds **`B`** fra `base.bounds` som i `resolveEffectiveCaveConfig` i dag.
- Definér **inderside** af spillefladen med samme orden som eksisterende padding (`INNER_PAD`, `getPlayableHalfExtents`, logik i `pickMineSpawn.ts`).
- **Container-strategi (vælg én til PR):**
  - **Anbefalet:** Neutralt rektangel; udled `boundsHalfX` / `boundsHalfZ` fra felternes ekstrema + `INTERACTIVE_ORE_MESH_PAD` (som classic-grenen i dag).
  - **Valgfrit:** Korridor-lignende forhold (`hx < hz`) som ekstra vægtning fra `RoomTemplate` — kun hvis I vil bevare rumform-variation uden gamle malm­kurver.

---

## 4. Spawn-eksklusion (uden cirkulær afhængighed)

`pickMineSpawn` bruger klippe-hindringer; felt-layout kender ikke «ryddede» klipper før runtime. Derfor:

1. Udled **foreløbig** `halfX`, `halfZ` fra `B` og rumstørrelse (samme orden som i dag før felter endeligt bestemmer bounds — eller fast kvotient dokumenteret i koden).
2. Udtræk en ren funktion **`pickMineSpawnXZEmptyRoom({ halfX, halfZ, mineRunId, runDepth })`** der matcher **ingen-hindring**-grenen når obstacle-listen er tom: genbrug samme hash som `spawnFracIndex` og samme kandidatliste som i `pickMineSpawn.ts` (linjer omkring `spawnFracIndex` og `wallBackedCandidates`).
3. **Dart throwing:** For hvert felt `i = 0 … slotCount-1`, med `layoutRng`: foreslå `(x,z)` uniformt i det indre rektangel; **afvis** hvis:
   - afstand til et allerede placeret felt **< `MIN_SLOT_DIST`**, eller
   - afstand til spawn-punkt **< `SPAWN_CLEAR_RADIUS`**, eller
   - punktet falder uden for det tilladte område.
4. **Y:** Konstant `fy` fra `floorYFromBase(base)` — ingen floor-sample (fladt gulv).
5. Udregn **endelige** `bounds`, `boundsHalfX`, `boundsHalfZ`, og evt. `fogNear` / `fogFar` fra felternes ekstrema + pad (samme princip som classic/island-grene i dag).

**Konstanter** (ét sted, fx top af `mineCaveContext.ts`; tune i QA):

| Konstant | Start-interval | Note |
|----------|----------------|------|
| `MIN_SLOT_DIST` | ~2.8–3.5 m (XZ) | ≥ mesh-pad + gameplay-luft |
| `SPAWN_CLEAR_RADIUS` | ~2.5–4.0 m | Verificér mod reel spawn og klippe-radius |

**Max forsøg** pr. felt (fx 80–120). **Fallback** hvis placering fejler (skal være deterministisk): spiral fra midten, sidste gyldige punkt med dev-warning, eller trinvis reduktion af `MIN_SLOT_DIST` kun i fallback-gren — **dokumentér valgt strategi i koden**.

---

## 5. Skæbne for `RoomTemplate` og `computeRoomLayout`

**Minimal migration (mindst RNG-ripple):**

- Behold `drawRoomTemplate(rng)` og `drawRoomSize(rng)` i `resolveEffectiveCaveConfig` / `generateLayerState` med **samme antal `rng()`-kald som nu**, men brug template/size **kun** til fog/tuning eller metadata — **ikke** til XZ-placering af felter.

**Alternativ (renere, større PR):**

- Fjern template fra geometri og kompenser med dummy-træk så kerne-RNG matcher — kun efter grep viser at `cfg.template` / `cfg.size` ikke kræves i gameplay eller UI.

Erstat eller indpak eksisterende **`computeRoomLayout`** med fx **`placeOreSlotsStochastic(...)`** der returnerer samme `RoomLayoutResult`-form som i dag, så resten af resolveren kan forbliver stabil.

---

## 6. Filer og konkrete ændringer

| Fil | Ændring |
|-----|---------|
| `src/gem/mineCaveContext.ts` | Implementér stokastisk placering + `layoutSeed` / `oreXZ\|v1`; kobl ind i `resolveEffectiveCaveConfig`; konstanter og kommentarer. |
| `src/components/mine/pickMineSpawn.ts` | Eksporter/refaktor **`pickMineSpawnXZ`** (tom hindringsliste) til genbrug i layout-fasen. |
| `src/gem/mineCaveContext.test.ts` | Samme seed → samme `oreSlots` og bounds; opdater forventninger hvis koordinater ændrer sig. |
| `src/data/areas.caveConfig.test.ts` | Tilpas hvis statiske configs eller forventninger til `oreSlots` brydes. |
| `src/gem/mineCosmetics.ts` | Evt. finjustér efter nye koordinater; `farEnoughFromSlots` bevares; valgfrit sekundært min-afstand mellem kosmetiske instanser hvis clustering ses. |

---

## 7. Tests og QA

**Automatiseret**

- Determinisme: `resolveEffectiveCaveConfig` to gange med samme args → identisk layout.
- `mineLayer.test.ts`: slot-antal og match med `cfg.oreSlots.length` stadig gyldigt.
- Evt. snapshot af ét kendt seed efter implementering.

**Manuel**

- Spawn ikke inde i malm / ikke klemt mod væg; flere dybder og `RoomSize`.
- Rich grafik-preset: mange kosmetiske klipper — stabilt udseende og raycasts.

---

## 8. PR-rækkefølge og rollback

1. **PR 1:** Refaktor `pickMineSpawn` → eksponér `pickMineSpawnXZEmptyRoom` (eller tilsvarende), **uden** at ændre spawn-adfærd i spil (regressionstest / manuel).
2. **PR 2:** `placeOreSlotsStochastic` + integration i `resolveEffectiveCaveConfig`; tests opdateret.
3. **PR 3 (valgfrit):** Dokumentation i `mine-system-implementation-guide.md` §2 + kommentarer til «layout seed v1»; oprydning i `RoomTemplate`-metadata hvis relevant.

**Rollback:** Layout-logik er koncentreret i `mineCaveContext.ts` (+ lille flade i `pickMineSpawn.ts`). Fladt gulv (`caveFloorSurface.ts`) berøres ikke.

---

## 9. Tjekliste før merge

- [ ] Ingen nye useedede `Math.random`-kald i layout-stien.
- [ ] `hashStringToSeed` / `mulberry32` fra `mineCaveContext` bruges konsekvent til `layoutRng`.
- [ ] `generateLayerState` første RNG-træk (slotCount → template → size) uændret **eller** eksplicit kompenseret og dokumenteret.
- [ ] `MineHUD` / andre steder der viser `roomTemplate` / `roomSize` er meningsfulde eller markeret som metadata.
- [ ] Kosmetik stadig placeret med afstand til `oreSlots`.

---

*Slut på plan for stokastisk malm­felt­layout.*
