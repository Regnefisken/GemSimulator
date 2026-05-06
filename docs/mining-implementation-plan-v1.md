# GemSimulator – Minesystem Implementeringsplan v1.0

**Dato:** 6. maj 2026  
**Baseret på:** [`mining-concept-v1.md`](./mining-concept-v1.md)  
**Scope:** Kobberminen (`kobbermine`) – andre miner berøres ikke i denne iteration  
**Tilgang:** Inkrementelle faser. Hver fase er selvstændigt deploybar uden at bryde eksisterende funktionalitet.

---

## Indholdsfortegnelse

1. [Forudsætninger og baseline](#1-forudsætninger-og-baseline)
2. [Fase 0 – Type-udvidelser og fundament](#2-fase-0--type-udvidelser-og-fundament)
3. [Fase 1 – C: Fullscreen mine-layout og HUD](#3-fase-1--c-fullscreen-mine-layout-og-hud)
4. [Fase 2 – A: Procedural grotte-arkitektur](#4-fase-2--a-procedural-grotte-arkitektur)
5. [Fase 3 – B: Voxel-hakke og crosshair](#5-fase-3--b-voxel-hakke-og-crosshair)
6. [Fase 4 – D: Loot-drop system med voxel-items](#6-fase-4--d-loot-drop-system-med-voxel-items)
7. [Fase 5 – E: ChestLootScene](#7-fase-5--e-chestlootscene)
8. [Test- og acceptkriterier per fase](#8-test--og-acceptkriterier-per-fase)
9. [Rollback-strategi](#9-rollback-strategi)

---

## 1. Forudsætninger og baseline

### Allerede tilgængeligt
- `simplex-noise@4.0.3` ✅ (allerede i `package.json`)
- `@react-three/fiber@9.x`, `@react-three/drei@10.x`, `three@0.184` ✅
- `VoxelScene` med `VoxelMesh` (instanced boxes) ✅
- `MineDrop`-typer i `src/gem/mining.ts` ✅
- `materialsCount(state)` i `src/lib/gameState.ts` ✅

### Vigtige tekniske begrænsninger
- **`VoxelScene` er en standalone `<Canvas>`** – kan ikke renderes inde i `MiningCave3D`. Vi laver en ny intern komponent `WorldVoxelItem` der genbruger samme instancing-logik direkte i grottens R3F-tree.
- **`Area`-typen mangler `caveConfig`** – udvides i Fase 0.
- **`AppShell`** wrapper hele applikationen – fullscreen kræver opt-in fra App.tsx-niveau (Fase 1).

### Filer der berøres (overblik)

| Fase | Filer ændret | Filer oprettet |
|------|-------------|----------------|
| 0 | `src/types.ts`, `src/data/areas.ts` | – |
| 1 | `src/App.tsx`, `src/components/layout/AppShell.tsx`, `src/components/mine/MineScreen.tsx`, `src/components/mine/MineHUD.tsx` | `src/components/mine/MineHUD.tsx` (revidering), `src/components/mine/MinimapHUD.tsx` |
| 2 | `src/components/mine/3d/MiningCave3D.tsx` | `src/components/mine/3d/ProceduralCave.tsx`, `src/components/mine/3d/cave/CaveWalls.tsx`, `src/components/mine/3d/cave/Stalactites.tsx`, `src/components/mine/3d/cave/CrystalClusters.tsx`, `src/components/mine/3d/cave/DustParticles.tsx`, `src/lib/caveSeed.ts` |
| 3 | `src/components/mine/MineScreen.tsx`, `src/components/mine/3d/MiningCave3D.tsx` | `src/components/mine/3d/Pickaxe3D.tsx`, `src/components/mine/Crosshair.tsx` |
| 4 | `src/components/mine/MineScreen.tsx`, `src/components/mine/3d/MiningCave3D.tsx` | `src/components/mine/3d/WorldLootItem.tsx`, `src/components/mine/3d/WorldVoxelItem.tsx`, `src/lib/lootEntities.ts` |
| 5 | `src/components/mine/MineScreen.tsx`, `src/gem/mining.ts`, `src/components/mine/3d/MiningCave3D.tsx`, `src/lib/gameState.ts` | `src/components/mine/ChestLootScene.tsx`, `src/components/mine/ChestLootCard.tsx`, `src/components/mine/3d/WorldChest.tsx` |

---

## 2. Fase 0 – Type-udvidelser og fundament

**Mål:** Forbered datamodellen så efterfølgende faser kan trække på `area.caveConfig` uden refactorings undervejs.  
**Risiko:** Lav. Ingen runtime-ændringer.

### 0.1 Udvid `Area`-typen

**Fil:** `src/types.ts`

Tilføj en optional `caveConfig` på `Area`:
```typescript
export type CaveConfig = {
  oreSlots: [number, number, number][]
  bounds: number
  fogColor: string
  fogNear: number
  fogFar: number
  ambientColor: string
  ambientIntensity: number
  floorColor: string
  ceilingColor: string
  wallColor: string
  crystalMetal?: MetalName
  stalactiteRange: [number, number]
  stalagmiteRange: [number, number]
  crystalClusterRange: [number, number]
  depthFogScale: boolean
}
```

### 0.2 Default-konfig for kobbermine

**Fil:** `src/data/areas.ts`

Tilføj en `caveConfig` på `kobbermine`-objektet:
```typescript
caveConfig: {
  oreSlots: [
    [5, 0.48, -2],
    [-4.2, 0.48, 4.5],
    [1.2, 0.48, -6.5],
    [-6.2, 0.48, -3],
    [6.5, 0.48, 5],
  ],
  bounds: 9,
  fogColor: '#2a1810',
  fogNear: 8,
  fogFar: 26,
  ambientColor: '#a86038',
  ambientIntensity: 0.18,
  floorColor: '#3a2418',
  ceilingColor: '#1f1208',
  wallColor: '#4a2c1a',
  crystalMetal: 'Kobber',
  stalactiteRange: [6, 10],
  stalagmiteRange: [4, 7],
  crystalClusterRange: [8, 15],
  depthFogScale: true,
},
```

### 0.3 Hjælpefunktion til konfig-fallback

**Fil:** `src/types.ts` (eller ny `src/data/caveDefaults.ts`)

Eksportér `getCaveConfig(area: Area): CaveConfig` der returnerer `area.caveConfig` eller en generisk default. Dermed påvirker manglende konfig på de andre miner intet.

### Acceptkriterier
- TypeScript bygger uden fejl
- Eksisterende `MiningCave3D` virker uændret (bruger endnu ikke `caveConfig`)
- `npm test` passerer

---

## 3. Fase 1 – C: Fullscreen mine-layout og HUD

**Mål:** Mine-skærmen fylder hele viewporten med dedikeret HUD i stedet for at sidde inde i AppShell.  
**Risiko:** Medium. Ændrer App.tsx render-tree.

### 3.1 Tilføj fullscreen-flag til `AppShell`

**Fil:** `src/components/layout/AppShell.tsx`

- Acceptér ny prop: `fullscreen?: boolean`
- Hvis `fullscreen`: skjul tab-bar, header, og evt. padding/margin. Render kun `children` direkte i et `fixed inset-0` wrapper.
- Bevar `gameNotice`-overlay (det skal stadig kunne vises).

### 3.2 Aktivér fullscreen i `App.tsx`

**Fil:** `src/App.tsx`

- Beregn `isFullscreenMine = tab === 'map' && state.viewMode !== 'map' && currentAreaIsMine`
- Send `fullscreen={isFullscreenMine}` til `<AppShell />`
- Sørg for at tab-skift altid forlader fullscreen-tilstand

### 3.3 Ny HUD-arkitektur i `MineScreen.tsx`

**Fil:** `src/components/mine/MineScreen.tsx`

Refactor layout:
- Erstat `<div className="space-y-4 pb-4">` med to lag:
  - **Layer 1** (`absolute inset-0`): 3D-canvas-container
  - **Layer 2** (`absolute inset-0 pointer-events-none`): HUD-elementer (knapper får `pointer-events-auto`)
- Topbar: tilbage-knap (venstre), depth (center), essens-tæller (højre)
- HP-bar: fuld bredde under topbar, kun synlig hvis `rockEvent.type !== 'chest'`
- Bottom-bar: hakke-info + lager-kapacitet (venstre), minimap (højre)
- Behold `DamageNumbers`, `RockDropBanner` som overlays

### 3.4 Udvid `MineHUD.tsx`

**Fil:** `src/components/mine/MineHUD.tsx`

Refactor til at fungere som horisontalt fixed-position-element med `position: absolute` props der lader `MineScreen` bestemme placering. Subkomponenter:
- `<HUDTopBar />`
- `<HUDBottomBar />`
- `<HUDHpBar />`

### 3.5 Ny `MinimapHUD`-komponent

**Fil:** `src/components/mine/MinimapHUD.tsx` (ny)

- Render 5 cirkel-ikoner svarende til `area.caveConfig.oreSlots.length`
- Aktiv slot (`depth % oreSlots.length`) er stor + farvet med dominant metal-accent
- Inactive slots: små grå cirkler

### 3.6 Overgangsanimation

**Fil:** `src/components/mine/MineScreen.tsx`

- Lokal state: `[entered, setEntered] = useState(false)` – sættes `true` efter 50 ms
- Wrapper-div med `transition-opacity duration-400` der starter `opacity-0` og bliver `opacity-100`
- `useLayoutEffect` på `state.currentArea` resetter ved areaskift

### 3.7 Platform-scope ✅ (v1)

- **Ikke målrettet mobil/touch i denne iteration:** ingen virtuelt joystick, ingen tap-to-mine eller touch-optimerede crosshair. Fullscreen HUD antager stadig primarily **mus + WASD + pointer lock**. Touch kan tilføjes i senere milestone.

### Acceptkriterier
- Mine-canvas fylder hele viewporten
- Tab-bar er skjult mens man er i mine
- Tilbage-knap vender tilbage til kortet og gendanner tab-bar
- Alle 7 HUD-elementer er synlige og funktionelle
- Eksisterende `ChestScene` fungerer stadig (vises som fullscreen)
- `DamageNumbers` og `RockDropBanner` vises korrekt over canvas
- V1-scope: ingen touch-/joystick-controls (desktop-først), jf. §11

---

## 4. Fase 2 – A: Procedural grotte-arkitektur

**Mål:** Statisk grotte erstattes af proceduralt genereret miljø der varierer pr. besøg.  
**Risiko:** Medium. Ny kode i R3F-tree, men eksisterende OreNode-logik berøres ikke.

### 4.1 Seed-utility

**Fil:** `src/lib/caveSeed.ts` (ny)

```typescript
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise'

export function createSeededRandom(seed: number): () => number { /* mulberry32 */ }
export function createCaveNoise(seed: number): NoiseFunction2D { /* simplex med PRNG */ }
export function pickRange(rng: () => number, [min, max]: [number, number]): number
```

### 4.2 Procedural cave-container

**Fil:** `src/components/mine/3d/ProceduralCave.tsx` (ny)

- Tag `caveConfig: CaveConfig` + `seed: number` som props
- Internt: `useMemo` på alt der afhænger af seeden (vægge, stalaktitter, klynger)
- Render i denne rækkefølge:
  1. `<CaveWalls />`
  2. `<Stalactites />` (loft + gulv)
  3. `<CrystalClusters />`
  4. `<DustParticles />`

### 4.3 Ujævne vægge

**Fil:** `src/components/mine/3d/cave/CaveWalls.tsx` (ny)

- 4 vægge + gulv + loft som `PlaneGeometry(22, 22, 8, 8)` 
- Vertex offsets via simplex noise: `geom.attributes.position.array[i*3+1] += noise * 0.4`
- Recompute normals: `geom.computeVertexNormals()`
- Material: `MeshStandardMaterial` fra `caveConfig.wallColor` med `roughness: 0.9`, `metalness: 0.05`

### 4.4 Stalaktitter og stalagmitter

**Fil:** `src/components/mine/3d/cave/Stalactites.tsx` (ny)

- Beregn antal fra `pickRange(rng, caveConfig.stalactiteRange)`
- For hver: random position med konflikt-check mod `caveConfig.oreSlots` (min afstand 2.0)
- Geometri: `ConeGeometry(radius, height, 6)` – 6 sider for low-poly look
- Stalaktitter peger nedad fra y=5.0; stalagmitter peger opad fra y=0.0

### 4.5 Krystalklynger

**Fil:** `src/components/mine/3d/cave/CrystalClusters.tsx` (ny)

- Antal fra `pickRange(rng, caveConfig.crystalClusterRange)`
- Hver klynge: 3–5 små `BoxGeometry`-instancer monteret på en væg
- Farve: hentet fra metal-paletten via `caveConfig.crystalMetal` (henter HSL-baserede variationer fra `METAL_ACCENT['kobber']`)
- Materiale: `MeshStandardMaterial` med `emissive`, `emissiveIntensity: 0.3`
- `useFrame`-pulsering på `emissiveIntensity = base + 0.15 * sin(time * 0.8)`

### 4.6 Støvpartikler

**Fil:** `src/components/mine/3d/cave/DustParticles.tsx` (ny)

- `Points` med `BufferGeometry` med 100 vertices
- Per-frame opadgående drift på `position.y` med wraparound når y > 5
- Trigger-burst på prop-ændring `hitTrigger?: number` – tilføj 20 partikler ved hit-positionen

### 4.7 Integration i `MiningCave3D.tsx`

**Fil:** `src/components/mine/3d/MiningCave3D.tsx`

Ændringer:
- Importér `getCaveConfig` og `ProceduralCave`
- Generér `seed = useState(() => Math.random())` ved komponent-mount
- Erstat de hardcodede walls/floor/ceiling med `<ProceduralCave caveConfig={cfg} seed={seed} />`
- Erstat `ORE_SLOTS` med `cfg.oreSlots`
- Erstat fixed `<fog args={[..., 6, 34]} />` med dynamisk fra `cfg.fogNear/fogFar`, justeret med `depth` hvis `cfg.depthFogScale`
- Bevar `<PlayerControls />` og `<OreNode />`-loop

### 4.8 PlayerControls bounds

**Fil:** `src/components/mine/3d/PlayerControls.tsx`

- Acceptér ny optional prop `bounds?: number` (default = 9)
- Brug i `clamp` i stedet for hardcoded `BOUND`

### Acceptkriterier
- Hver gang man entrer minen ser grotten visuelt anderledes ud
- Stalaktitter overlapper aldrig med OreNodes
- Performance: stabil 60 FPS på en mid-tier laptop (eller ingen mærkbar regression)
- Mining-mekanik virker uændret
- Andre miner (jernkløften osv.) bruger fortsat den gamle look (eller faller tilbage til en simpel default-konfig)

---

## 5. Fase 3 – B: Voxel-hakke og crosshair

**Mål:** First-person voxel-hakke synlig nederst-til-højre i synsfeltet, med swing-animation. SVG-crosshair midt på skærmen.  
**Risiko:** Lav. Isoleret tilføjelse til scenen.

### 5.1 Genbrug eksisterende `Pickaxe.pixelItem`-data ✅

Vi tegner **ikke** nye voxel-arrays. I stedet bruger vi den allerede eksisterende `pickaxe.pixelItem: PixelItem` på `state.pickaxes[i]`, som har præcis den samme `data: string[]` + `colorMap: ColorMap` struktur som al anden item-rendering.

Det betyder:
- Hvert pickaxe-tier (træ → sten → jern → ...) har allerede sin unikke voxel-grafik via `pickaxe.pixelItem`
- Når spilleren equipper en anden hakke i smedjen, opdateres 3D-modellen automatisk
- **Ingen `pickaxeVoxels.ts`-fil oprettes** – vi springer hele dette underpunkt over
- 100% visuel konsistens med eksisterende UI (Lager-fanen, Smedje-skærm)

### 5.2 `Pickaxe3D`-komponent

**Fil:** `src/components/mine/3d/Pickaxe3D.tsx` (ny)

- Props: `pixelItem: PixelItem`, `swingTrigger: number`, `disabled: boolean`
- Render: `<group ref={groupRef}>` der mountes som child af kameraet
- Indeholder samme instanced-mesh logik som `VoxelScene.VoxelMesh` (genbruges direkte ved at udfaktorisere `VoxelMesh` til en delt komponent eller blot importere den hvis den eksporteres)
- Voxels gen-instances automatisk når `pixelItem` skifter (tier-skift)
- Position som child af kameraet:
  - Bruger `useThree(({ camera }) => camera)`
  - I `useEffect`: `camera.add(group); return () => camera.remove(group)`
- Default placering (justeres ved implementation): `position: [0.45, -0.55, -1.0]`, `rotation: [0.15, -0.2, 0.05]`, `scale: 0.04`
- State machine for swing:
  - `swingState: 'idle' | 'down' | 'return'`
  - `swingTrigger`-ændring → `swingState='down'`, `startTime = clock.elapsedTime`
  - Idle: subtle bob via `position.y += sin(t)*0.002`
  - Down: lerp rotation.x fra `0.15` til `1.4` over 100 ms
  - Return: ease-out tilbage over 180 ms

### 5.2.1 Udfaktoring af `VoxelMesh` (forudsætning)

**Fil:** `src/components/VoxelScene.tsx`

For at `Pickaxe3D` kan genbruge instancing-logikken uden at duplikere kode, eksporteres `VoxelMesh` fra `VoxelScene.tsx` (det er allerede en intern komponent). Alternativ: udfaktorér til en ny `src/components/VoxelMesh.tsx` der importeres begge steder.

**Bemærk:** Samme udfaktorering bruges også af `WorldVoxelItem` i Fase 4, så det er værd at gøre rigtigt her.

### 5.3 Swing-trigger-bridging

**Fil:** `src/components/mine/MineScreen.tsx`

- State: `[swingTrigger, setSwingTrigger] = useState(0)`
- I `handleMineHit`: `setSwingTrigger(n => n + 1)` ved hit
- Send `swingTrigger` + `pickaxe.pixelItem` som props ned til `MiningCave3D` → `Pickaxe3D`

### 5.4 Crosshair-overlay

**Fil:** `src/components/mine/Crosshair.tsx` (ny)

- HTML/SVG overlay (ikke i Canvas)
- Absolute centered, `pointer-events: none`
- SVG: 2 linjer + cirkel
- Props: `state: 'normal' | 'hover-active' | 'swing'`
- Bruger CSS-keyframes til scale-animation ved swing

### 5.5 Hover-detection

**Fil:** `src/components/mine/3d/MiningCave3D.tsx`

- Tilføj raycaster fra kamera-center hver frame (eller throttle til 100 ms)
- Tjek om strålen rammer den aktive `OreNode`
- Bubble result op til `MineScreen` via callback `onCrosshairTargetChange?: (active: boolean) => void`
- `MineScreen` opdaterer `Crosshair`-state

### 5.6 Integration i `MiningCave3D`

**Fil:** `src/components/mine/3d/MiningCave3D.tsx`

- Render `<Pickaxe3D />` som direkte child af `<CaveContent>`
- Komponenten bliver kun synlig når pointer er låst (kontrolleret via prop)

### Acceptkriterier
- Hakken er synlig nederst-til-højre i FPS-view
- Klik på OreNode trigger swing-animation der visuelt rammer ned mod stenen
- Crosshair skifter farve (grøn) når den peger på den aktive node
- Crosshair scaler kort op ved swing
- Forskellige equippede pickaxes viser forskellige voxel-modeller
- Når hakken er broken, stopper animationen og pickaxe forbliver i idle

---

## 6. Fase 4 – D: Loot-drop system med voxel-items

**Mål:** Når en sten brister, popper de droppede items op i 3D-grotten som voxel-meshes. Spilleren klikker dem for at samle dem op.  
**Risiko:** Medium-høj. Ændrer `handleMineHit`-flowet (drops kommer ikke direkte i inventory længere).

### 6.1 Loot-entitet og state

**Fil:** `src/lib/lootEntities.ts` (ny)

```typescript
import type { MineDrop } from '../gem/mining'

/**
 * En enkelt fysisk repræsentation i grotten. En MineDrop med quantity > 1
 * splittes til flere entities (én pr. enhed).
 */
export type WorldLootEntity = {
  id: string
  position: [number, number, number]
  /** Den oprindelige drop-template (uden quantity). Quantity er altid 1 her. */
  drop: MineDrop
  spawnTime: number
  collected: boolean
}

export function spawnPositionsAround(
  origin: [number, number, number],
  count: number,
  rng?: () => number,
): [number, number, number][]

/** Splitter et MineDrop med quantity > 1 til N separate entities á quantity 1. */
export function explodeDropToEntities(
  drop: MineDrop,
  origin: [number, number, number],
): WorldLootEntity[]

export function getDropPixelData(drop: MineDrop): { data: string[]; colorMap: ColorMap } | null
```

`getDropPixelData` mapper hver `MineDrop`-variant til den korrekte `PixelItem`/`Gem` data:
- `'ore'` → `drop.ore.pixelItem`
- `'nugget'` → `drop.nugget.pixelItem`
- `'rough-stone'` → `drop.stone.pixelItem`
- `'gem'` → `{ data: drop.gem.data, colorMap: drop.gem.colorMap }`
- `'chest'`, `'blueprint'`, `'nothing'` → `null` (håndteres separat)

`explodeDropToEntities` ✅:
- For `'ore'` med `quantity: 3` → returnerer 3 separate entities, hver med en clonet `RawOre` og `quantity: 1`
- For `'nugget'` med `quantity: 2` → 2 separate entities á 1 nugget
- For `'rough-stone'`, `'gem'` → altid 1 entity (de har implicit quantity 1)
- Hver entity får sin egen unikke spawn-position via `spawnPositionsAround(origin, totalCount)`

### 6.2 `WorldVoxelItem`-komponent (in-scene voxel-mesh)

**Fil:** `src/components/mine/3d/WorldVoxelItem.tsx` (ny)

Vigtig: dette er **ikke** en wrapper omkring `VoxelScene` – det er en intern R3F-komponent der renderer instanced voxels direkte i grottens canvas.

```typescript
type Props = {
  data: string[]
  colorMap: ColorMap
  position: [number, number, number]
  scale?: number
  spawnTime?: number       // for spawn-animation
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}
```

Internt:
- Genbrug instancing-logik fra `VoxelScene.VoxelMesh` (kopier eller udfaktorér)
- Wrap i `<group>` med `useFrame`-baseret rotation + bob
- Spawn-animation: scale fra 0 → 1 over 200 ms (baseret på `clock.elapsedTime - spawnTime`)
- Pivot adjustment så centrum af grid'et er i origo

### 6.3 `WorldLootItem`-komponent

**Fil:** `src/components/mine/3d/WorldLootItem.tsx` (ny)

- Wrap `WorldVoxelItem` med drop-specifik logik
- Sjældne drops (`'gem'`, `'nugget'` med Sølv+): tilføj `<pointLight>` med farve fra metal/gem
- `onClick`: kald prop `onCollect(entity)`
- Collect-animation: state `'idle' | 'collecting'`, lerp position mod kamera + scale → 0 over 250 ms før unmount
- **Persistens:** Ingen tids-baseret despawn ✅ – items forbliver i grotten indtil spilleren forlader minen (alle entities ryddes ved mine-exit, se 6.6)

### 6.4 `MiningCave3D` udvidelse

**Fil:** `src/components/mine/3d/MiningCave3D.tsx`

Tilføj nye props:
```typescript
type CaveContentProps = {
  /* ... eksisterende ... */
  lootEntities: WorldLootEntity[]
  onCollectLoot: (entityId: string) => void
}
```

Render `<WorldLootItem />` for hver entity i `lootEntities.map(...)`.

### 6.5 Refactor `handleMineHit` i `MineScreen.tsx`

**Fil:** `src/components/mine/MineScreen.tsx`

Nuværende flow (bricker stenen):
```
rollMineDrop() → applyDrop() → INCREMENT_DEPTH
```

Nyt flow:
```
rollMineDrop() → spawn loot entity (state) → INCREMENT_DEPTH
                 (applyDrop kaldes først ved klik på loot)
```

Detaljer:
- Tilføj state: `[lootEntities, setLootEntities] = useState<WorldLootEntity[]>([])`
- Når sten brister:
  1. `rollMineDrop()`
  2. Hvis `drop.kind === 'nothing'` → ingen spawn, fortsæt som før
  3. Hvis `drop.kind === 'chest'` → trigger ChestLootScene (Fase 5) eller behold gammel `ChestScene` indtil da
  4. Ellers: spawn 1 entity (eller 2–3 ved store mængder ore/nugget) ved den ramte OreNode-position
- `INCREMENT_DEPTH` og `GAIN_XP` sker uændret med det samme
- Bonus essens-roll sker uændret

Ny callback `handleCollectLoot(entityId)`:
1. Find entity, tjek `materialsCount(state) + extraMaterialsFromDrop(drop) <= matCap`
2. Hvis fuld: vis floater "Lager fuldt!", behold entity
3. Hvis OK: `applyDrop(drop)`, marker entity `collected: true`, fjern fra state efter animation
4. Vis floater `+1 Kobbermalm` (bruger eksisterende `pushFloater` udvidet med tekst)

**Multi-spawn ved quantity ✅:**
- Hvis `drop.kind === 'ore'` og `drop.ore.quantity === 3` → kald `explodeDropToEntities(drop, slotPos)` der returnerer 3 separate entities med hver `quantity: 1`
- Spilleren skal klikke på hver enkelt for at samle dem op
- Hvis lager er fuldt og kun nogle items kan samles op, beholdes resten i scenen

### 6.6 Cleanup-logik – persistens indtil mine-exit ✅

**Fil:** `src/components/mine/MineScreen.tsx`

- **Ingen tids-baseret despawn.** Items forbliver i grotten så længe spilleren er i minen.
- **Cleanup ved mine-exit:** `useEffect`-cleanup når komponenten unmountes nulstiller `lootEntities = []`. Da `MiningCave3D`/`MineScreen` mountes igen ved næste besøg, starter grotten ren (matcher seed-strategien fra Fase 2).
- **Pool-limit** (endeligt, se §11 ✅): **`MAX_WORLD_LOOT = 48`**. Rimelighed: ved quantity-split kan ét hug give mange meshes; ~48 giver luft til lange mining-sessioner, mens samtidige entities stadig holder et sundt performance-budget. Hvis grænsen overskrides: FIFO-eviction af ældste entity. Floater "Loot blev til støv" vises ved auto-eviction (fast farve – fx bleg grå/brun).
- **`onBack`-knap:** Trigger sammen unmount-flow → entities slettes. Eksplicit ingen "Er du sikker?"-bekræftelse selvom der er uopsamlet loot (designvalg: spilleren bærer ansvar for at samle op).

### 6.7 Floater-udvidelse

**Fil:** `src/components/mine/DamageNumbers.tsx` + `MineScreen.tsx`

- Udvid `DamageFloater` med optional `text?: string` og `color?: string`
- `pushFloater` får extra parametre til pickup- eller fejl-tekster
- **Pickup-floaters ✅:** Brug metal-accent farve fra `METAL_ACCENT[{metal}]` (eller tilsvarende primær voxel-farve for gems / rough stones) som `color` på `+1 Kobbermalm`-lignende beskeder — matcher spillets øvrige metal-repræsentation
- **System/fejl ✅:** Fx "Lager fuldt!" og evictions-beskeder bruger fast semantisk farve (amber/rød), ikke metal-accent

### Acceptkriterier
- Når en sten brister, popper et eller flere voxel-items op i scenen ved stenen
- **Drop med quantity 3 spawner 3 separate items** (ikke 1 med "×3")
- Items roterer langsomt og bobber
- Items har samme udseende som i Lager-fanen (samme `PixelItem.data`/`colorMap`)
- Klik på item samler det op + viser `+1 [Item]` floater + tilføjer til inventory
- Hvis lager er fuldt: floater "Lager fuldt!" vises, item bliver liggende
- **Items persisterer i grotten indtil spilleren forlader minen** – ingen tids-baseret despawn
- Forlader spilleren minen via tilbage-knap, slettes alle uopsamlede items
- Maks 48 items kan ligge samtidig (FIFO-eviction ved overskridelse)
- Eksisterende `RockDropBanner` virker stadig (eller kan deaktiveres til fordel for floaters)
- Mine-progression (`INCREMENT_DEPTH`) sker uafhængigt af opsamling – man kan godt fortsætte uden at samle

---

## 7. Fase 5 – E: ChestLootScene

**Mål:** Erstat den nuværende `ChestScene` med:
1. En **vedvarende 3D-kiste** der spawner i grotten ved chest-rock-events
2. En **interaktiv loot-modal** (`ChestLootScene`) der åbnes ved klik på kisten

Kisten og dens resterende indhold persisterer i grotten indtil spilleren forlader minen ✅.

**Risiko:** Medium-høj. Ny 3D-entitet i scenen + ny modal + ny rolling-funktion + refactor af chest-flow.

### 7.1 Ny rolling-funktion `rollChestLoot`

**Fil:** `src/gem/mining.ts`

```typescript
export type ChestLootResult = {
  gold: number
  items: MineDrop[]   // 2-6 items afhængig af tier
  blueprintId: string | null
}

export function rollChestLoot(
  area: Area,
  depth: number,
  tier: ChestTier,
  activeCharms: string[],
): ChestLootResult
```

Implementation:
- `gold` = behold eksisterende `rollChestReward(area, depth, tier)`
- `items` = en række af kald til `rollMineDrop` med justeret rarityBonus baseret på tier:
  - `wood`: 2-3 items, `+0` rarity
  - `silver`: 3-4 items, `+0.05` rarity
  - `gold`: 4-6 items, `+0.12` rarity
- `blueprintId` = behold `rollBlueprintFromGoldChest(area.id, tier)`

### 7.2 `WorldChest`-komponent (3D-objekt i grotten)

**Fil:** `src/components/mine/3d/WorldChest.tsx` (ny)

En **vedvarende 3D-kiste** der lever i grotten – ikke en modal-overgang.

```typescript
type WorldChestEntity = {
  id: string
  position: [number, number, number]
  tier: ChestTier
  /** Resterende ikke-opsamlede items + guld. Initialiseres ved spawn. */
  remainingLoot: ChestLootResult
  opened: boolean   // åbnet mindst én gang (visuel åbningstilstand)
}
```

Komponenten:
- Renderer en simpel voxel-kiste (en håndfuld `BoxGeometry`-instances med tier-specifik farve: brun/sølv/guld)
- Hover-glow når crosshair peger på den
- `onClick` → kald `onOpen(entity.id)` på parent
- Ved `opened === true` og `remainingLoot` er tom → vis kiste som åben/tom (let opacity-reduktion)
- Kisten despawner ikke automatisk – den bliver i grotten

### 7.3 Spawning af kister

**Fil:** `src/components/mine/MineScreen.tsx`

Ny state:
```typescript
const [worldChests, setWorldChests] = useState<WorldChestEntity[]>([])
```

Refactor af `useLayoutEffect` der ruller nye `rockEvent`:
- Når `rockEvent.type === 'chest'` rolles for et slot:
  - I stedet for at sætte hele scenen til `ChestScene`, spawner vi en `WorldChestEntity` i `worldChests`-state
  - Position = den aktuelle slot's position (samme position som OreNode ville stå)

**Beslutning ✅:** `INCREMENT_DEPTH` udløses **straks ved spawn** af chest-event (samme øjeblik som kisten placeres i `worldChests`). Det betyder:
- Det næste slot bliver med det samme den aktive node
- Spilleren kan vælge at hugge videre eller åbne kisten først
- Kisten forbliver tilgængelig i baggrunden indtil spilleren forlader minen

### 7.4 `ChestLootScene`-komponent (modal-overlay)

**Fil:** `src/components/mine/ChestLootScene.tsx` (ny)

Modal der åbnes ved klik på en `WorldChest`. Renderes som overlay over grotten.

Layout:
```
┌─────────────────────────────────────────┐
│ ✨ [Sølv Kiste] ✨            [✕ Luk]  │
│                                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │card│ │card│ │card│ │💰  │   (grid)  │
│  └────┘ └────┘ └────┘ └────┘           │
│                                         │
│        [Tag alt muligt]                 │
└─────────────────────────────────────────┘
```

Props:
- `chest: WorldChestEntity`
- `state: GameState`
- `dispatch: Dispatch<Action>`
- `onClose: () => void`
- `onUpdateChest: (id: string, remaining: ChestLootResult) => void` – callback til at opdatere parent state med resterende loot

Internt:
- Ingen lokal `loot`-state – komponenten viser direkte `chest.remainingLoot`
- Ved klik på item: `dispatch(applyDropAction)` + kald `onUpdateChest(id, lootMinusItem)`
- Ved klik på guld: `dispatch({ type: 'ADD_GOLD', amount })` + opdater `remainingLoot.gold = 0`
- Guld er altid takeable
- "Tag alt muligt"-knap: itererer og samler alt der har plads + guld
- "Luk"-knap (eller ESC): `onClose()` – **ingen `INCREMENT_DEPTH`**, **ingen tab af loot** ✅
- Ved næste besøg af spilleren i kisten ses opdateret indhold (kun det der ikke er taget)

Vigtige detaljer:
- Bonus-essens og blueprint-roll: håndteres ved **første** åbning (state `chest.opened` skifter til `true`). Ved efterfølgende åbninger sker disse rolls ikke igen.
- Lyd: `playRockBreak()` ved første åbning, lettere "klap"-lyd ved efterfølgende
- **Tom kiste i modal ✅:** Hvis `remainingLoot.gold === 0 && remainingLoot.items.length === 0`, vis tekst fx "Kisten er tom" og én **[Luk]**-knap. **Ingen auto-luk** og ingen fade-af af den 3D-kiste på jorden — tomme kisten bliver synlig i grotten indtil mine-exit (jf. §7.6).

### 7.5 Refactor `MineScreen.tsx`

**Fil:** `src/components/mine/MineScreen.tsx`

- **Slet** den eksisterende `rockEvent.type === 'chest' ? <ChestScene/> : <MiningCave3D/>`-branching
- Render altid `<MiningCave3D ... />` (kister er nu en del af scenen)
- Send `worldChests` + `onChestClick` som props til `MiningCave3D`
- `MiningCave3D` mapper `worldChests.map(c => <WorldChest ... />)` ved siden af `OreNodes`
- Lokal state: `[activeChestId, setActiveChestId] = useState<string | null>(null)`
- `handleChestClick(id)` → `setActiveChestId(id)` → renderer `<ChestLootScene chest={...} />` som overlay
- `handleChestClose()` → `setActiveChestId(null)`
- `handleUpdateChest(id, remaining)` opdaterer `worldChests`-state

### 7.6 Persistens og despawn ✅

- **Mens i grotten:** Kister og deres resterende indhold persisterer permanent
- **Ved mine-exit:** Komponent unmounter → `worldChests = []` ved næste mount
- **Pool-limit** (jf. §11 ✅): **`MAX_WORLD_CHESTS = 6`**. Kiste-events er sjældne; 6 samtidige kister er allerede et ekstrem-scenarie — lavere capped count end loot holder scenen lys. FIFO-eviction ved overskridelse.

### 7.7 Slet eller arkivér `ChestScene`

**Fil:** `src/components/mine/ChestScene.tsx`

- Hvis ChestLootScene fungerer uden regressioner: slet `ChestScene`
- Eller behold som dead-code-ref med `@deprecated`-kommentar i 1 sprint

### 7.8 `ADD_GOLD`-action (hvis ikke eksisterende)

**Fil:** `src/lib/gameState.ts`

- Tjek om der findes en separat `ADD_GOLD`-action eller om `OPEN_CHEST` er den eneste vej til guld
- Hvis kun `OPEN_CHEST`: tilføj `ADD_GOLD { amount: number }` til union type + reducer-case
- Bruges fra ChestLootScene når guld-kortet klikkes

### 7.9 `ChestLootCard`-komponent

**Fil:** `src/components/mine/ChestLootCard.tsx` (ny)

- Props: `kind: 'item' | 'gold'`, `drop?: MineDrop`, `goldAmount?: number`, `onTake: () => void`, `disabled: boolean`, `disabledReason?: string`
- Layout: kort med:
  - Voxel-preview (lille `<VoxelScene>` for items, mønt-grafik for guld)
  - Item-navn og mængde / guld-beløb
  - Klik-handler eller lås-ikon hvis disabled
- Animation: hover-glow, click-pop, removed via parent state

### Acceptkriterier
- Chest-rock-events spawner en synlig 3D-kiste i grotten ved den ramte slot-position ✅
- Spilleren kan klikke kisten for at åbne ChestLootScene
- Indholdet vises som visuelle kort (samme rendering som Lager)
- Guld-kortet er altid klikbart og giver guld via `dispatch`
- Item-kort er låst hvis lager er fuldt
- "Tag alt muligt"-knap virker
- **"Luk"-knappen lukker modalen uden bekræftelse** ✅
- **Resterende loot går IKKE tabt ved "Luk"** – kisten beholder indholdet ✅
- Spilleren kan klikke kisten igen og se det resterende indhold
- Kisten persisterer i grotten indtil mine-exit
- Næste rock spawner uafhængigt af om kisten er åbnet/tømt
- Bonus-essens og blueprint-roll trigger kun ved **første** åbning af en given kiste
- Eksisterende `OPEN_CHEST`-essence/blueprint-flow er bevaret (bare nu opdelt i WorldChest-spawn + ChestLootScene-interaktion)
- **Tom kiste ✅:** Ved tomt loot vises modal kun med forklarende tekst og [Luk] — ingen auto-luk eller fade-af af den 3D-kiste på jorden (den forbliver åben/tom indtil mine-exit)

---

## 8. Test- og acceptkriterier per fase

### Manuel test-checklist (skal gennemføres efter hver fase)

| Test | Fase 0 | Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 |
|------|--------|--------|--------|--------|--------|--------|
| `npm test` passerer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TypeScript build uden fejl | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Kobbermine kan åbnes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Hugning af sten virker | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Items lander i Lager | ✓ | ✓ | ✓ | ✓ | (via klik) | ✓ |
| Kiste kan åbnes | ✓ | ✓ | ✓ | ✓ | ✓ | (ny scene) |
| Andre miner uberørt | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Save/load virker | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Automatiserede tests (Vitest)

Ved hver fase tilføjes tests i `src/__tests__/` eller ved siden af kildefilerne:

- **Fase 0:** Test at `getCaveConfig(kobbermine)` returnerer den definerede konfig
- **Fase 1:** Snapshot-test af `MineHUD`-rendering
- **Fase 2:** Test at `createSeededRandom(seed)` er deterministisk; test at stalaktit-positioner ikke overlapper OreSlots
- **Fase 3:** Test af swing-state machine (state-overgange ved trigger)
- **Fase 4:** Test af `getDropPixelData(drop)` for hver `MineDrop`-variant; test af `spawnPositionsAround`; integrationstest af `handleCollectLoot` med fuldt lager
- **Fase 5:** Test af `rollChestLoot` for hver tier; test at "Tag alt muligt" respekterer kapacitet

---

## 9. Rollback-strategi

Hver fase er en separat git-commit (eller separat PR). Rollback-stien:

| Fase | Rollback | Påvirkning |
|------|----------|-----------|
| 0 | Revert types + areas.ts | Ingen runtime-effekt |
| 1 | Revert App.tsx + AppShell + MineScreen layout | Tilbage til ikke-fullscreen |
| 2 | Revert MiningCave3D + slet cave/-mappe | Tilbage til simpel boks-grotte |
| 3 | Revert MiningCave3D pickaxe-mount + Crosshair | Ingen synlig hakke, original cursor |
| 4 | Revert handleMineHit + slet WorldLoot* | Tilbage til instant-pickup-flow |
| 5 | Revert MineScreen chest-branch + slet ChestLootScene | Bruger gammel `ChestScene` |

Feature-flags (valgfri):
- Tilføj `localStorage`-styret `__newMine` flag
- Conditional rendering i MineScreen baseret på flag
- Tillader A/B-test under udvikling

---

## 10. Tidsestimat (rough)

| Fase | Estimat | Kompleksitet |
|------|---------|--------------|
| 0 | 1-2 timer | Lav |
| 1 | 4-6 timer | Medium |
| 2 | 6-10 timer | Medium-høj |
| 3 | 3-5 timer | Lav-medium (forenklet med eksisterende `pixelItem`) |
| 4 | 8-12 timer | Høj |
| 5 | 8-12 timer | Høj (3D-kiste + persistens + modal) |
| **Total** | **~30-47 timer** | – |

Estimater er for én udvikler. Inkluderer ikke iterativ tweaking af visual polish.

---

## 11. Beslutningslog og åbne spørgsmål

### Besluttede punkter ✅

1. **Pickaxe-voxel data:** Genbrug eksisterende `state.pickaxes[i].pixelItem` direkte. Ingen nye voxel-arrays designes. Tier-skift opdaterer 3D-modellen automatisk.

2. **Multiple-quantity drops:** Quantity 3 spawner 3 separate world-items (ikke 1 med "×3"). Spilleren skal samle hver enkelt op manuelt.

3. **ChestLootScene exit:** Lukning kræver ingen bekræftelse. Resterende loot går **ikke** tabt – kisten persisterer i grotten med uopsamlet indhold.

4. **Despawn-strategi:** Alle drops og kister persisterer i grotten indtil spilleren forlader minen via tilbage-knappen. Ingen tids-baseret despawn.

5. **Pickup-floater-farver:** ✅ **Metal-accent** (`METAL_ACCENT` eller ækvivalent primær voxel-farve for gem/sten) på positive pickup-beskeder. Fejl/eviction: faste UI-farver.

6. **Mobil/touch:** ✅ **Ikke med i denne iteration** — kun mus + WASD/pointer-lock. Touch/joystick beskrives som v2-arbejde.

7. **Pool-limits (anbefalet standard):** ✅ **`MAX_WORLD_LOOT = 48`**, **`MAX_WORLD_CHESTS = 6`**, FIFO-eviction ved overskridelse. Begrundelse kort: quantity-split inflaterer meshes; ~48 absorberer lange mining-sessioner uden at hive instancing op unødigt højt. Sjældent flere end få samtidige kister — 6 er et konservativt loft.

8. **Depth-progression ved kiste:** ✅ **`INCREMENT_DEPTH` ved spawn** af chest-rock (samme tick som `WorldChest` tilføjes), så aktiv slot skifter videre selv mens kisten ligger uberørt i baggrunden.

9. **Tom kiste efter udpakning:** ✅ **Bliv stående** — 3D-kisten forbliver i grotten (åben/tom visuel tilstand); modal viser kun "tom"-tekst og [Luk], **ingen fade-out eller auto-luk**.

### Åbne spørgsmål

Ingen kritiske — implementér efter overstående konstanter og justér kun ved playtest.

---

*Dokumentet er en levende implementeringsguide.*
