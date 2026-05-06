# GemSimulator – Minesystem Konceptdokument v1.0

**Dato:** 6. maj 2026  
**Scope:** Kobberminen (`kobbermine`) – eksklusivt fokus i første iteration  
**Stack:** React Three Fiber · Three.js · Tailwind CSS · TypeScript  
**Fælles beslutninger er markeret med** ✅

---

## Indholdsfortegnelse

1. [Arkitekturel kontekst](#1-arkitekturel-kontekst)
2. [A – Procedural grotte-arkitektur](#2-a--procedural-grotte-arkitektur)
3. [B – Voxel-hakke og crosshair](#3-b--voxel-hakke-og-crosshair)
4. [C – Fullscreen mine-layout og HUD](#4-c--fullscreen-mine-layout-og-hud)
5. [D – Loot-drop system med voxel-items](#5-d--loot-drop-system-med-voxel-items)
6. [E – Kiste-oplevelsen (ChestLootScene)](#6-e--kiste-oplevelsen-chestlootscene)
7. [Fremtidssikring og udvidelsesmodel](#7-fremtidssikring-og-udvidelsesmodel)
8. [Afklarede UX/præstationsvalg](#afklarede-uxpræstationsvalg-)
9. [Kendte begrænsninger og åbne punkter](#9-kendte-begrænsninger-og-åbne-punkter)

---

## 1. Arkitekturel kontekst

### Hvad eksisterer i dag

| Komponent | Beskrivelse |
|-----------|-------------|
| `MiningCave3D.tsx` | R3F `<Canvas>` med 5 hardcodede `ORE_SLOTS`, flat box-geometri til vægge/gulv/loft, 3 pointLights, fog |
| `OreNode.tsx` | Enkelt stretched box med HSL-farve; `onClick` → `onMineHit` |
| `PlayerControls.tsx` | `PointerLockControls` + WASD bevægelse, `BOUND=9`, `EYE_Y=1.55` |
| `MineScreen.tsx` | Al mining-logik (`handleMineHit`), `rollMineDrop`, `applyDrop`, `dispatch` |
| `VoxelScene.tsx` | R3F instanced `BoxGeometry` voxels fra `data: string[]` + `colorMap` |
| `drawGem()` | 2D canvas-rendering af `PixelItem` (bruges i Lager-kort og previews) |

### Kritisk indsigt: Ingen externe 3D-assets

Der eksisterer ingen `.glb`/`.gltf`/`.obj`-filer i projektet. Al visuel repræsentation af items sker via `PixelItem.data` + `PixelItem.colorMap` → `VoxelScene` (3D) eller `drawGem` (2D canvas). **Alle nye visuelle systemer bygger på dette fundament** for at sikre konsistens.

---

## 2. A – Procedural grotte-arkitektur

### Designmål
Grotten skal føles levende og aldrig identisk fra besøg til besøg, men holde sig inden for kobberminens stemning (mørk, støvet, med kobber-årer i væggene).

### Seed-strategi ✅
**Ny seed ved hvert besøg.** Seeden genereres i `useState(() => Math.random())` ved mount af `MiningCave3D`. Den gemmes ikke i `GameState` – kun i komponent-memory. Ved næste besøg er grotten frisk.

```
CaveSession {
  seed: number           // genereres ved mount
  stalactites: Mesh[]    // afledt af seed
  wallVariation: float[] // vertex offsets
  crystalClusters: []    // kobber-glødende punkter på vægge
}
```

### Procedurale elementer

#### Ujævne vægge
`PlaneGeometry` med 8×8 subdivisions. Vertex Y-offsets beregnet med `simplex-noise` (npm-pakke tilføjes) fra seed. Amplitude: ±0.4 enheder. Gælder for alle 4 vægge samt loft.

**Materiale:** `MeshStandardMaterial` med `roughness: 0.9`, `metalness: 0.05`, `color` fra en seeded HSL-variation (mørk brun/grå for kobbermine). Ingen externe teksturer nødvendige – rå geometri-variation giver organisk look.

#### Stalaktitter og stalagmitter
- **Antal:** 6–10 stalaktitter (fra loft), 4–7 stalagmitter (fra gulv) – seeded antal
- **Geometri:** `ConeGeometry` med radius 0.08–0.25 og height 0.4–1.8, random variation per instance
- **Placering:** Beregnes fra seed. Afstanden til nærmeste `ORE_SLOT` must være > 2.0 enheder (konfliktcheck)
- **Materiale:** `MeshStandardMaterial`, `roughness: 0.95`, lidt mørkere end vægge

#### Kobber-krystalklynger (ambient, ikke-interaktive)
Små emissive meshes på vægge og loft der simulerer kobbermalm-årer:
- `BoxGeometry` voxels i 2–4 farver fra kobbers metalpalette (`METAL_ACCENT['kobber']`)
- `emissiveIntensity: 0.3` med en langsom `Math.sin(time * 0.8)`-pulsering
- 8–15 klynger per grotte, placeret på vægflader

#### Støvpartikler
`Points` med `BufferGeometry`:
- 80–120 partikler i konstant langsom opadgående drift (seeded startpositioner)
- Trigger-burst på `hitPulse`-ændring: 20 ekstra partikler nær OreNode
- Farve: hvid/grå med lav opacity (`0.15–0.35`)

#### Dynamisk belysning
- Behold eksisterende `ambientLight` + 3 pointLights
- Tilføj én `DirectionalLight` med svag intensitet fra "indgangs-retning" (+Z-akse)
- **Fakkel-flicker:** 1–2 pointLights animeres: `intensity = base + 0.3 * Math.sin(time * 3.7 + seed)`
- Kobbermine-specifik lys-tone: varm orangebrun ambient

#### Tåge
`fog` justeres dynamisk baseret på `depth`:
- Shallow (depth 0–9): `near: 12, far: 22`
- Medium (depth 10–29): `near: 9, far: 18`
- Deep (depth 30+): `near: 6, far: 14`

### OreSlots: Fra hardcode til data-driven ✅
De nuværende 5 hardcodede `ORE_SLOTS` flyttes til `area`-konfiguration (se [Fremtidssikring](#7-fremtidssikring-og-udvidelsesmodel)).

---

## 3. B – Voxel-hakke og crosshair

### Voxel-hakke ✅
Hakken bygges som **samme voxel-repræsentation som resten af spillet** – instanced boxes fra hakke-objektets `PixelItem`. Ingen separate GLTF-filer.

#### Datakilde ✅
Den equippede hakkes grafik lever allerede i `Pickaxe.pixelItem` (`data` + `colorMap`). I implementation tegnes førsteperson-modellen ud fra samme struktur som Lager-preview, så skift af hakke (tier/repair) automatisk matcher UI.

Den tidligere idé om manuelt vedligeholdte `VoxelSpec`-arrays erstattes dermed — ækvivalent visuelt udtryk kan beskrives ved design af `Pickaxe.pixelItem` på data-niveau, ikke ved duplikat arrays i minen.

#### Placering og idle-animation
Hakken mountes som `group` child af `camera` (first-person weapon-stil):
```
position: [0.45, -0.55, -1.0]
rotation: [0.15, -0.2, 0.05] (initial)
```

`useFrame` idle-bob:
```
x += 0.003 * sin(time * 1.2) * movementScale
y += 0.002 * sin(time * 2.1)
```

#### Swing-animation (state machine)
```
SwingState: 'idle' | 'swing-down' | 'swing-return'
```
- **Trigger:** `onMineHit` callback
- **swing-down:** Roter X-aksen +70° over 100 ms, translate Z -0.15
- **swing-return:** Ease-out tilbage til idle over 180 ms
- **Particle-sparks ved kontakt:** 5–8 gnist-partikler nær OreNode (kun hvis `interactive`)

### Crosshair
HTML-overlay (absolut positioneret, pointer-events none):
- SVG: to linjer (horizontal + vertikal) + lille cirkel i centrum
- Normal tilstand: hvid, `opacity: 0.7`
- Hover over aktiv OreNode: grøn puls-animation
- Ved swing: kort scale-up + fade (CSS keyframe, ~80 ms)
- Implementeres som separat React-komponent over `<Canvas>`

---

## 4. C – Fullscreen mine-layout og HUD

### Layout-strategi ✅
Når `state.viewMode === 'mine'` (eller tilsvarende active-mine-flag):
- `App.tsx` skjuler tab-navigation og globale UI-elementer
- `MineScreen` fylder `100dvh` (dynamic viewport height, mobilsikker)
- `Canvas` fylder hele skærmen under HUD

### HUD-elementer ✅ (alle 7 valgt)

HUD er et fixed overlay-lag over Canvas. **Platform v1 ✅:** fullscreen mine er målrettet **desktop** (mus + WASD + pointer lock); virtuelt joystick og tap-to-mine er udskudt.

```
┌─────────────────────────────────────────────────────────┐
│ [← Kort]   Dybde: 42   ████████░░ 8/10   🏺 234      │  ← Top-bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    (3D GROTTE)                          │
│                        ╋  ← crosshair                  │
│                                                         │
├──────────────────────────────────┬──────────────────────┤
│ [Hakke: Jernnakke ██████░░ 6/8]  │  [Mini: ●○○●○]     │  ← Bottom-bar
│ [Lager: 47/100]                  │                     │
└──────────────────────────────────┴──────────────────────┘
```

| Element | Placering | Indhold |
|---------|-----------|---------|
| Tilbage-knap | Top-left | Pil + "Kort" – stor touch-target (min 48×48px) |
| Dybde | Top-center | Nuværende depth-tal |
| Essens-tæller | Top-right | Antal essenser med ikon |
| HP-bar | Under top-bar, fuld bredde | OreNode HP (farve: grøn→gul→rød) |
| Hakke-info | Bottom-left | Navn + holdbarhed-bar |
| Lager-kapacitet | Bottom-left | `X/Y` råvarer (rød når >90%) |
| OreSlot-minimap | Bottom-right | 5 cirkel-ikoner, aktiv er highlightet + metal-farve |

### Overgangsanimation
- Indgang til mine: 400 ms fade-in + let zoom ind fra Z+2
- Tilbage til kort: 300 ms fade-out, ingen zoom (hurtig exit)
- Implementeres med CSS `transition` + `opacity`/`transform` i React state

---

## 5. D – Loot-drop system med voxel-items

### Kernebeslutning: Visuel konsistens ✅
Dropped items renderes via **`VoxelScene`** med de eksisterende `PixelItem.data` / `PixelItem.colorMap` fra `MineDrop`. En dropped kobbermalm ser nøjagtigt ud som dens kort i Lager. Ingen nye art-assets nødvendige.

### `WorldLootItem`-komponent

```typescript
interface WorldLootEntity {
  id: string
  position: [number, number, number]
  drop: MineDrop          // eksisterende type – ingen ændringer
  spawnTime: number       // Date.now()
  collected: boolean
}
```

State i `MiningCave3D` (eller `MineScreen`):
```typescript
const [lootEntities, setLootEntities] = useState<WorldLootEntity[]>([])
```

### Spawning ved rock-break

I `handleMineHit` (MineScreen), når stenen brister:
1. `rollMineDrop(...)` → `drop`
2. Beregn 1–3 spawn-positioner omkring den ramte OreSlot-position (random offset ±1.5 på X/Z, +0.3 på Y)
3. `setLootEntities(prev => [...prev, { id: uuid(), position, drop, spawnTime: Date.now(), collected: false }])`
4. `applyDrop` kaldes **ikke** endnu – items er i "pending" state

### Rendering af `WorldLootItem`

Hver `WorldLootEntity` renderes som en `<group>` i R3F-scenen:
- **`VoxelScene`** med `data` + `colorMap` ekstraheret fra `drop`:

| `drop.kind` | `data` kilde | `colorMap` kilde |
|-------------|-------------|-----------------|
| `'ore'` | `drop.ore.pixelItem.data` | `drop.ore.pixelItem.colorMap` |
| `'nugget'` | `drop.nugget.pixelItem.data` | `drop.nugget.pixelItem.colorMap` |
| `'rough-stone'` | `drop.stone.pixelItem.data` | `drop.stone.pixelItem.colorMap` |
| `'gem'` | `drop.gem.data` | `drop.gem.colorMap` |

- **Scale:** 0.08 (lille world-space størrelse)
- **Spawn-animation:** `scale 0 → 1` over 200 ms + lille hop (Y +0.4 → Y +0.0, ease-out)
- **Idle-animation:** Langsom rotation (Y-akse, 0.8 rad/s) + svag Y-bob (`Math.sin`)
- **Sjældne drops** (gem, nugget): Tilføj lille emissive `pointLight` på same position

### Opsamling – manuel klik ✅

`onClick` på `WorldLootItem`-meshen:
1. Tjek inventory-kapacitet (kald `materialsCount(state)` eller gem-cap)
2. Hvis plads: `dispatch(applyDrop(drop))` + fjern fra `lootEntities` + collect-animation
3. Hvis fuldt: Vis floating tekst "Lager fuldt!" ved item, item forbliver
4. **Collect-animation:** Item flyver mod kamera (lerp position over 250 ms) + scale 0 → fjernes

### Cleanup ✅

- **Items persisterer i grotten indtil spilleren forlader minen** – ingen tids-baseret despawn
- Når spilleren forlader minen via tilbage-knappen, ryddes alle uopsamlede items
- Droppet loot der ikke samles op **gives ikke** til spilleren – går tabt ved mine-exit
- Max **48 samtidige** loot-entities (pool-limit ✅; FIFO-eviction): hvis grænsen overskrides, droppes ældste

### Floating damage/pick-up tekst

Eksisterende `DamageNumbers` bruges til:
- `+1 Kobbermalm` ved opsamling — **floaterfarve = metal-accent** (`METAL_ACCENT` eller ækvivalent for gem/sten), så udtrykket matcher Lager ✅
- `LAGER FULDT` i fast semantisk farve (fx amber/rød) ved afvist opsamling

---

## 6. E – Kiste-oplevelsen (ChestLootScene)

### Designbeslutning ✅
- **Al kiste-loot inkl. guld** → præsenteres i ChestLootScene. Intet går automatisk til inventory.
- Spilleren ser og klikker hvert item – guld vises som et tydeligt guld-kort på linje med de øvrige.
- **Kisten er et vedvarende 3D-objekt i grotten** – ikke en modal-overgang. Klik åbner modalen.
- **Lukning kræver ingen bekræftelse**. Resterende loot går **ikke** tabt – det venter i kisten til næste klik.
- Kisten persisterer (med dens resterende indhold) indtil spilleren forlader minen.
- **Progression ✅:** aktiv dybde øges (`INCREMENT_DEPTH`) **samme øjeblik kisten spawnes** på kortet, så hugning kan fortsætte parallelt med at åbne kisten senere.

### Koncept: Lukket kiste-interface

Når en kiste-roll sker ved et slot, forbliver spillere i førsteperson grotten og ser en **synlig kiste i 3D**; første åbning udløser overlay med loot-kort:

```
┌─────────────────────────────────────────────────────┐
│         ✨ Du fandt en [Sølv Kiste]! ✨             │
│                                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐           │
│  │[3D]  │  │[3D]  │  │[3D]  │  │[💰]  │           │
│  │ Ore  │  │ Gem  │  │ Ore  │  │ 340  │           │
│  │ ×3   │  │ 1×   │  │ ×1   │  │ guld │           │
│  └──────┘  └──────┘  └──────┘  └──────┘           │
│                                                     │
│  [Tag alt muligt]              [Luk kisten]        │
└─────────────────────────────────────────────────────┘
```

### ChestLootScene detaljer

- **Baggrund:** Semi-transparent overlay over 3D-grotten (grotten forbliver synlig bagved)
- **3D-kiste i grotten:** En simpel voxel-kiste lever i scenen ved chest-rock-events (åbningsanimation ved første klik)
- **Item-slots:** Hvert item i kistens loot-liste vises som et kort – inkl. guld:
  - Råvarer og gems: **`VoxelScene`-kort** (eksakt samme rendering som Lager-preview)
  - Guld: Særskilt guldmønt-kort med beløb tydeligt markeret – visuelt adskilt men i samme grid
  - Kortet viser item-navn, mængde/beløb og rarity
  - Hover/fokus: let glow
  - **Klik for at tage:** Item/guld tilføjes til inventory + kortet fjernes fra kisten
  - **Kan ikke tages (lager fuldt for råvarer/gems):** Kortet er nedtonet med lås-ikon. Guld har ingen kapacitetsbegrænsning og kan altid tages.
- **"Tag alt muligt"-knap:** Tager alle items (og guld) der er plads til i ét klik
- **"Luk"-knap (eller ESC):** Lukker modalen øjeblikkeligt uden bekræftelse – resterende loot venter i kisten ✅
- **Genåbning:** Spilleren kan klikke kisten igen og se det resterende indhold
- **Bonus-essens og blueprint-roll:** Kun ved **første** åbning af en given kiste
- **Tom kiste ✅:** Når al loot er taget åbnes modal med kort forklaring («Kisten er tom») og [Luk] — ingen auto-luk. Den åbne tomme **3D-kiste forbliver på jorden** i grotten til mine-exit.

### Kiste-loot generation
Kistens indhold genereres ved `rollMineDrop` resulterende i `{ kind: 'chest', gold, tier }`. Selve item-listen til ChestLootScene genereres via en ny funktion `rollChestLoot(tier, area, depth)` der returnerer `MineDrop[]` (2–6 items afhængig af tier). Denne funktion bygger oven på den eksisterende `rollMineDrop`-logik.

---

## 7. Fremtidssikring og udvidelsesmodel

### OreSlots: Data-driven arkitektur

Nuværende hardcode erstattes af `area`-konfiguration:

```typescript
interface CaveConfig {
  oreSlots: [number, number, number][]   // positioner i world space
  bounds: number                          // BOUND til PlayerControls
  fogNear: number
  fogFar: number
  ambientColor: string
  crystalMetal?: MetalName               // dominant glow-farve
  stalactiteRange: [number, number]       // [min, max] antal
  depthFogScale: boolean                  // tåge øges med depth
}
```

`areas.ts` udvides med `caveConfig?: CaveConfig`. Kobbermine får en default. Andre miner kan have radikalt anderledes layouts (f.eks. 8 slots, større bounds).

### Mine-skalering
For at gøre kobbermine "dybere og større" fremover:
- `depth`-parameter kan bruges til at justere `CaveConfig.bounds` dynamisk (dybere = større rum)
- Sekundære rum/gange kan tilføjes som ekstra `group`-geometri ved bestemte depth-tærskler
- `ORE_SLOTS`-antal kan øges med depth (f.eks. 5 → 7 → 9 slots)

### Nye mine-typer
Al ny kode er struktureret så den nemt kan aktiveres for andre miner via `area.caveConfig`. Jernkløften, Sølvhulen osv. kan få deres egne `caveConfig` med anderledes stemning og layout – uden kodeændringer i kernelogikken.

### Loot-system er `MineDrop`-agnostisk
`WorldLootItem` kan rendere **enhver** `MineDrop`-type. Nye item-typer (f.eks. `blueprint`, eksotiske ressourcer) kræver kun en ny `case` i render-switch.

### Performance-overvejelser
- `simplex-noise` er tilgængelig fra `package.json` — beregninger køres kun ved cave-mount (ikke per frame)
- Stalaktitter/stalagmitter er statiske meshes (ingen per-frame update)
- Loot: max **48** samtidige entities ✅; kister i scenen **6** ✅ (FIFO-eviction) — balanceret mod instancing i WebGL
- Voxel-droppenes instancer bør caches/memoeres eller deles via fælles voxel-instancing-komponent
- Cave-geometri recycles ikke ved depth-ændring — kun ved mine exit/enter

---

## Afklarede UX/præstationsvalg ✅

Samme liste som [`mining-implementation-plan-v1.md`](./mining-implementation-plan-v1.md) §11:

1. Positive pickup-floaters — **metal-accent**
2. **Ingen mobil/touch** i v1 — desktop-først
3. Pool: **`MAX_WORLD_LOOT = 48`**, **`MAX_WORLD_CHESTS = 6`** (FIFO)
4. **Depth-stigning ved kiste ved spawn**, ikke først ved åbning
5. Tom kiste: **Blivende** mesh + modal kun med [Luk], ingen fade/auto-luk

---

## 9. Kendte begrænsninger og åbne punkter

| Punkt | Status | Note |
|-------|--------|------|
| `simplex-noise` | ✅ i projektet | Til procedurale vægge |
| Voxel-hakke | Besluttet | Brug equipped `Pickaxe.pixelItem` |
| `rollChestLoot()` | Ny ved implementation | Tier → antal/forbedret rarity |
| Kiste-loot item-antal pr. tier | Designskitse | Fx træ 2–3, sølv 3–4, guld 4–6 (justeres i kodning) |
| Loot før mine-exit | Besluttet | Uopsamlet loot **går tabt ved tilbage til kort**; ingen timed despawn i grotten |
| Touch/mobil | Besluttet v1 | **Ikke målrettet** i første milestone |
| `ChestScene` legacy | Ved implementation | Udskiftes af ChestLootScene + WorldChest |
| Hakke-swing lyd | Afvent | Kobles på swing-trigger |
| Head-bob | Nice-to-have | Valgfrit i PlayerControls |

---

## Anbefalet implementeringsrækkefølge (til fremtidig session)

1. **C** – Fullscreen layout + HUD (lavest risiko, størst visuelt løft med det samme)
2. **A** – Procedural grotte-arkitektur (kræver `simplex-noise`; giver levende scene)
3. **B** – Voxel-hakke + crosshair (isoleret komponent, let at tilføje)
4. **D** – Loot-drop voxel-system (kræver `WorldLootItem` + integration i `handleMineHit`)
5. **E** – ChestLootScene (bygger oven på D's voxel-rendering-system)

---

*Dette dokument afspejler fælles designbeslutninger truffet 6. maj 2026. Opdateres løbende.*
