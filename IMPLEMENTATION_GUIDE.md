# Implementeringsguide: Gem Simulator — Udvidelse til fuldt spil

## Designgrundlag (besluttet med bruger)

| # | Beslutning |
|---|---|
| Navigation | **Bund-tab-bar** (mobilvenlig). Hovedviews skiftes via tabs. |
| Kort = hub | Kortet er det centrale navigationsrum. Hver lokation åbner sit eget rum. |
| Lokationer (start) | **Kobbermine** (eneste oplåste mine), **Smedjen**, **Butikken** er åbne fra start. **Smykkeværkstedet** låses op senere. Senere miner kræver level + reputation. |
| Mine = "ægte 3D" | Miner er de eneste rum med ægte 3D-miljø. Starter som placeholder (R3F-scene med 1 klippe + SVG-hakke), men arkitekturen er klar til fuldt 3D-miljø senere. |
| Andre rum = statiske 2D | Smedjen, Butikken og Smykkeværkstedet er statiske skærme. |
| Roterende 3D-gem | UI med roterende ædelstens-3D **bevares uændret**. Bruges i Smedjen (efter slibning), Inventory-preview og Smykkeværkstedet. |
| **Universel pixel-rendering** | Malm, ingots, rå klipper og hakker rendres med **samme system** som ædelsten — `drawGem` (2D) og `VoxelScene` (3D). Alt i spillet er pixel-art, alt kan roteres i 3D. |
| Mining-output | To **parallelle** drop-veje: **rå klipper** (→ ædelsten via Smedjens slibebord) og **rå malm** (→ ingots via Smedjens smelter). To "wow!"-drops: sjælden **færdig ædelsten** direkte og sjælden **ren metalklump** (kræver kun 1 klump → 1 ingot, langt hurtigere end almindelig malm). |
| Smelter har tiers | Tier 1 håndterer simple metaller. Højere tiers (2-5) låses op via opgraderinger og kræves for sjældne metaller (sølv, guld, mithril, runestål). |
| Mine-progression | Hver mine har **specifik metal-pool**. Kobbermine: kobber + tin. Senere miner: sølv, guld, mithril, runestål. Bronze er en legering (kobber + tin) lavet i smedjen — ikke et drop. |
| Inventory | Tre kategorier: **Ædelsten**, **Råvarer**, **Redskaber**. Plads kan udvides via køb senere. |
| **XP / Level** | Spilleren har level. XP optjenes ved mining, smelting, gem-crafting, smykke-crafting og smykke-salg. Level gates avancerede miner og charms. |

---

## Korrigeret gem-loop (kerne-loop)

```
┌──────────────────────────────────────────────────────────────┐
│  MINE (Kobbermine, Jernkløften, Sølvhulen, …)               │
│                                                              │
│  Klippe-klik → drop-roll:                                    │
│    • ~68% Rå malm        ──┐                                 │
│    • ~17% Rå klippe      ──┤                                 │
│    •  ~2% Færdig gem     ──┼─→ til Inventory                 │
│    •  ~3% Metalklump (★) ──┤                                 │
│    • ~10% Intet (+ XP)     │                                 │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  SMEDJE (tre stationer)                                      │
│                                                              │
│  Smelter:    Rå malm    → Metal-ingots                       │
│              Metalklump → Ingot (1:1, hurtig vej, ★)         │
│              (kræver tilstrækkelig smelter-tier)             │
│                                                              │
│  Slibebord: Rå klippe   → Ædelsten                           │
│             (+ valgfrit ingot-slot → metal-inklusioner)      │
│                                                              │
│  Legeringer: Kobber-ingot + Tin-ingot → Bronze-ingot         │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  SMYKKEVÆRKSTED                                              │
│  Ædelsten + ingots (+ essenser) → Smykker                    │
│  Smykker → Adelsmarkedet → Guld + Reputation + XP            │
└──────────────────────────────────────────────────────────────┘
```

---

## Filstruktur efter fuld implementering

```
src/
  App.tsx                              ← view-router
  types.ts                             ← udvides
  style.css                            ← uændret (+ små additions)
  lib/
    storage.ts                         ← udvides
    gameState.ts                       ← NY: useReducer + persistens
    migrations.ts                      ← NY: schema-migrations
    leveling.ts                        ← NY: XP-formler + level-gates
  data/
    magic.ts                           ← uændret
    palettes.ts                        ← uændret
    templates.ts                       ← uændret (gem-templates)
    metals.ts                          ← NY (Fase 4)
    oreTemplates.ts                    ← NY: pixel-templates for rå malm + metalklumper + helpers (lighten/darken)
    ingotTemplates.ts                  ← NY: pixel-templates for ingots
    pickaxeTemplates.ts                ← NY: pixel-templates for hakker
    pickaxes.ts                        ← NY: hakke-tiers + stats
    smelterTiers.ts                    ← NY: smelter-tiers + ore-typer de kan håndtere
    areas.ts                           ← NY: lokationer + krav + metal-pool
    shop.ts                            ← NY (Fase 7)
    essences.ts                        ← NY (Fase 9)
    jewelry.ts                         ← NY (Fase 8)
  gem/
    generate.ts                        ← udvides
    draw2d.ts                          ← uændret (universel pixel-renderer)
    mining.ts                          ← NY (Fase 2)
    smelting.ts                        ← NY (Fase 6)
    crafting.ts                        ← NY (Fase 6)
  components/
    layout/
      AppShell.tsx                     ← NY
      TabBar.tsx                       ← NY
      LevelBadge.tsx                   ← NY: viser level + XP-bar
    map/
      MapScreen.tsx                    ← NY
      LocationCard.tsx                 ← NY
    mine/
      MineScreen.tsx                   ← NY (Fase 2)
      Rock3DScene.tsx                  ← NY: R3F-canvas (Fase 2)
      PickaxeOverlay.tsx               ← NY (Fase 2)
      DamageNumbers.tsx                ← NY (Fase 2)
      MineHUD.tsx                      ← NY (Fase 2)
    smithy/
      SmithyScreen.tsx                 ← NY (Fase 6)
      GemCrafter.tsx                   ← NY: bruger eksisterende GemViewer
      Smelter.tsx                      ← NY
      AlloyStation.tsx                 ← NY: bronze-crafting m.m.
    shop/
      ShopScreen.tsx                   ← NY (Fase 7)
    jewelry/
      JewelryWorkshopScreen.tsx        ← NY (Fase 8)
    inventory/
      InventoryScreen.tsx              ← NY (Fase 4)
      GemInventoryTab.tsx              ← NY
      MaterialsInventoryTab.tsx        ← NY: viser rå klipper / rå malm / metalklumper / ingots med 2D ikon + 3D-preview
      ToolsInventoryTab.tsx            ← NY: viser hakker med 2D + 3D
      ItemPreviewModal.tsx             ← NY: fuldskærm 3D-rotation (genbruger VoxelScene)
    Header.tsx                         ← uændret
    GemViewer.tsx                      ← genbruges; udvides Fase 5
    VoxelScene.tsx                     ← uændret (universel 3D-renderer)
    GemCard.tsx                        ← udvides (Fase 5)
    PixelItemCard.tsx                  ← NY: generisk kort til malm/ingot/hakke (genbruger drawGem)
    Collection.tsx                     ← bruges i GemInventoryTab
```

---

# Fase 0 — Fundament: types, game state, XP og persistens

**Formål:** Etablér det datafundament, som alle senere faser bygger på, så vi kun migrerer localStorage **én** gang.

## Trin

1. **Udvid `src/types.ts`**
   ```ts
   export type ColorMap = Record<string, string>

   export type MagicProperty = { /* uændret */ }

   export type MetalName =
     | 'Tin' | 'Kobber' | 'Jern' | 'Bronze'
     | 'Sølv' | 'Guld' | 'Mithril' | 'Runestål'

   // Bronze er en LEGERING — den kan eksistere som ingot (lavet i AlloyStation)
   // og som inklusion i ædelsten, men aldrig som rå malm eller metalklump fra mining.
   export const MINEABLE_METALS: MetalName[] = ['Tin','Kobber','Jern','Sølv','Guld','Mithril','Runestål']
   export const ALLOY_ONLY_METALS: MetalName[] = ['Bronze']

   export type MetalInclusion = {
     name: MetalName
     icon: string
     pixelColor: string      // bruges i gem.colorMap som M1/M2/M3
     goldBonus: number
     effect: string
   }

   export type Gem = {
     id: string
     name: string
     purity: number
     karat: number | null
     data: string[]
     colorMap: ColorMap
     timestamp: string
     isGodTier: boolean
     metalInclusions: MetalInclusion[]    // NY (0–3)
     magicProperties: MagicProperty[]     // NY (0–3) — erstatter magicProperty
     goldValue: number                    // NY
   }

   // Universal pixel-item (samme renderkontrakt som Gem: data + colorMap)
   export type PixelItem = {
     data: string[]
     colorMap: ColorMap
   }

   export type RawOre = {
     metalName: MetalName
     quantity: number
     pixelItem: PixelItem      // 2D + 3D rendering — stenklump m. metalåre
   }

   // "Wow!"-drop: ren metalklump fra mining. Kræver kun 1 klump → 1 ingot.
   export type MetalNugget = {
     metalName: MetalName
     quantity: number
     pixelItem: PixelItem      // klump uden grå sten omkring — tydeligt værdifuld
   }

   export type MetalIngot = {
     metalName: MetalName
     quantity: number
     pixelItem: PixelItem
   }

   export type RoughStone = {
     id: string
     paletteName: string
     quality: 'crude'|'fine'|'pristine'
     pixelItem: PixelItem
   }

   export type Pickaxe = {
     id: string
     tier: number
     name: string
     damage: number
     durability: number
     maxDurability: number
     pixelItem: PixelItem      // genbruger samme rendering
   }

   export type LocationId =
     | 'kobbermine' | 'jernkloeften' | 'soelvhulen'
     | 'guldgrotten' | 'mithrilbjerget' | 'rune-dybet'
     | 'smedjen' | 'butikken' | 'smykkevaerkstedet'

   export type Area = {
     id: LocationId
     kind: 'mine' | 'smedje' | 'butik' | 'smykke'
     name: string
     icon: string
     description: string
     unlockedByDefault: boolean
     metalPool?: { metal: MetalName; weight: number }[]   // kun 'mine'
     depthMultiplier: number
     rarityBonus: number
     requirement?: {
       level?: number
       reputation?: number
       gold?: number
     }
   }

   // Forward-declared types (fulde definitioner introduceres i senere faser).
   // De skal eksistere som tomme/optional felter i Fase 0 for at GameState kan persisteres.
   export type ActiveEffect = { id: string; expiresAt?: number; chargesLeft?: number }   // udvides i Fase 9
   export type Jewelry = { id: string }                                                  // udvides i Fase 8
   export type SmeltingJob = { id: string; metalName: MetalName; startedAt: number; timeMs: number; source: 'ore'|'nugget'; inputUsed: number }   // fuld definition i Fase 6

   export type ViewMode = 'map' | 'location'

   export type GameState = {
     // Progression
     level: number
     xp: number                  // XP i nuværende level
     gold: number
     reputation: number

     // Mining state
     depth: number
     totalGemsFound: number
     activePickaxeId: string
     pickaxes: Pickaxe[]

     // Inventory
     gems: Gem[]
     roughStones: RoughStone[]
     rawOre: RawOre[]
     metalNuggets: MetalNugget[]   // NY: rene metalklumper (★ rare drop)
     metalIngots: MetalIngot[]
     // 'materials' tæller summen af alle 4 (roughStones.length + Σ rawOre.qty + Σ metalNuggets.qty + Σ metalIngots.qty)
     inventoryCapacity: { gems: number; materials: number; tools: number }

     // Smedje
     smelterTier: number          // 1..5
     smeltingJobs: SmeltingJob[]  // aktive jobs — tom indtil Fase 6

     // Lokation + adgang
     viewMode: ViewMode           // 'map' = MapScreen, 'location' = currentArea-skærm
     currentArea: LocationId
     unlockedLocations: LocationId[]

     // Effekter (Fase 9) — tomme arrays i Fase 0
     activeCharms: string[]
     activeEffects: ActiveEffect[]

     // Smykker (Fase 8) — tomt array i Fase 0
     jewelry: Jewelry[]

     version: number
   }

   export type Palette = { name: string; colorMap: ColorMap }
   export type Template = { shapeName: string; data: string[] }
   ```

2. **Opret `src/lib/leveling.ts`** — ren matematik:
   ```ts
   export function xpToNextLevel(level: number): number {
     return Math.floor(100 * Math.pow(level, 1.55))
     // Lvl 1→2: 100, 2→3: 293, 3→4: 538, 5→6: 1069, 10→11: 3548, 20→21: 11220
   }

   export const XP_REWARDS = {
     mineHit: 1,                  // pr. klik
     rockBroken: 8,               // pr. knust klippe
     oreSmelted: 5,               // pr. ingot produceret
     gemCrafted: 12,              // pr. ny ædelsten
     jewelryCrafted: 25,          // pr. smykke
     jewelrySold: 15,             // pr. salg på Adelsmarkedet
   }

   export function applyXpGain(state: GameState, amount: number): GameState {
     let xp = state.xp + amount
     let level = state.level
     let need = xpToNextLevel(level)
     while (xp >= need) {
       xp -= need
       level += 1
       need = xpToNextLevel(level)
     }
     return { ...state, xp, level }
   }
   ```

3. **Opret `src/lib/migrations.ts`** — opgraderer gamle `Gem`-objekter:
   ```ts
   export const CURRENT_STATE_VERSION = 1

   export function migrateGem(raw: any): Gem {
     return {
       ...raw,
       metalInclusions: raw.metalInclusions ?? (raw.hasGoldInclusions ? [GOLD_DEFAULT_INCLUSION] : []),
       magicProperties: raw.magicProperties ?? (raw.magicProperty ? [raw.magicProperty] : []),
       goldValue: raw.goldValue ?? 0,
     }
   }

   export function migrateGameState(raw: any): GameState {
     // Hvis raw er null eller mangler version: byg defaults
     // Hvis version < CURRENT: kør sekventielle migration-steps
   }
   ```

4. **Opret `src/lib/gameState.ts`** — central state-håndtering:
   ```ts
   // Action-typen rammesat i Fase 0; de senere actions er kommenterede ud
   // og aktiveres trinvist i Fase 2/6/7 osv. (keep diff'en lille pr. fase).
   export type Action =
     // Fase 0
     | { type: 'GAIN_XP'; amount: number }
     | { type: 'GAIN_REPUTATION'; amount: number }
     | { type: 'EARN_GOLD'; amount: number }
     | { type: 'SPEND_GOLD'; amount: number }
     | { type: 'CHANGE_LOCATION'; location: LocationId }
     | { type: 'SET_VIEW_MODE'; viewMode: ViewMode }
     | { type: 'UNLOCK_LOCATION'; location: LocationId }
     | { type: 'ADD_GEM'; gem: Gem }
     // Fase 2 (mining)
     | { type: 'ADD_ORE'; ore: RawOre }
     | { type: 'ADD_NUGGET'; nugget: MetalNugget }
     | { type: 'ADD_ROUGH_STONE'; stone: RoughStone }
     | { type: 'SET_ACTIVE_PICKAXE'; id: string }
     | { type: 'DAMAGE_PICKAXE'; amount: number }
     // Fase 6 (smedje)
     | { type: 'CONSUME_ORE'; metalName: MetalName; quantity: number }
     | { type: 'CONSUME_NUGGET'; metalName: MetalName; quantity: number }
     | { type: 'CONSUME_ROUGH_STONE'; id: string }
     | { type: 'CONSUME_INGOT'; metalName: MetalName; quantity: number }
     | { type: 'ADD_INGOT'; ingot: MetalIngot }
     | { type: 'START_SMELTING'; job: SmeltingJob }
     | { type: 'TICK_SMELTING' }
     // Fase 7 (butikken)
     | { type: 'BUY_PICKAXE'; pickaxe: Pickaxe }
     | { type: 'UPGRADE_SMELTER' }
     | { type: 'EXPAND_INVENTORY'; category: 'gems'|'materials'|'tools'; amount: number }
     | { type: 'BUY_CHARM'; charmId: string }
     // Fase 8 (smykker)
     | { type: 'ADD_JEWELRY'; jewelry: Jewelry }
     | { type: 'SELL_JEWELRY'; id: string }

   // I Fase 0 implementeres KUN actions fra "Fase 0"-blokken.
   // Hver senere fase tilføjer sin blok til reducer'en.

   // Aggregation-konvention for alle ADD_*-actions med stack-bare items
   // (RawOre, MetalNugget, MetalIngot — grupperet pr. metalName):
   //
   //   case 'ADD_ORE': {
   //     const idx = state.rawOre.findIndex(o => o.metalName === action.ore.metalName)
   //     if (idx >= 0) {
   //       const next = [...state.rawOre]
   //       next[idx] = { ...next[idx], quantity: next[idx].quantity + action.ore.quantity }
   //       return enforceCapacity({ ...state, rawOre: next }, 'materials')
   //     }
   //     return enforceCapacity({ ...state, rawOre: [...state.rawOre, action.ore] }, 'materials')
   //   }
   // Tilsvarende for ADD_NUGGET og ADD_INGOT.
   // RoughStone og Gem stack'er IKKE — de pushes individuelt med id.

   // 'materials'-kapacitet beregnes som:
   //   materialsCount(state) =
   //     state.roughStones.length +
   //     state.rawOre.reduce((s, o) => s + o.quantity, 0) +
   //     state.metalNuggets.reduce((s, n) => s + n.quantity, 0) +
   //     state.metalIngots.reduce((s, i) => s + i.quantity, 0)
   // Hvis materialsCount > inventoryCapacity.materials: afvis nye drops + dispatch notifikation.

   // initialState bruger en starter-hakke. makePickaxe() defineres i Fase 2,
   // så i Fase 0 hardcoder vi en minimal stub direkte:
   const STARTER_PICKAXE: Pickaxe = {
     id: 'pickaxe-tin',
     tier: 0,
     name: 'Tinhakke',
     damage: 5,
     durability: 50,
     maxDurability: 50,
     pixelItem: { data: [], colorMap: {} },   // erstattes i Fase 2 når makePickaxe(0) bruges
   }

   export const initialState: GameState = {
     level: 1, xp: 0, gold: 0, reputation: 0,
     depth: 0, totalGemsFound: 0,
     activePickaxeId: STARTER_PICKAXE.id,
     pickaxes: [STARTER_PICKAXE],
     gems: [], roughStones: [], rawOre: [], metalNuggets: [], metalIngots: [],
     inventoryCapacity: { gems: 40, materials: 200, tools: 10 },
     smelterTier: 1,
     smeltingJobs: [],
     viewMode: 'map',
     currentArea: 'kobbermine',
     unlockedLocations: ['kobbermine', 'smedjen', 'butikken'],
     activeCharms: [],
     activeEffects: [],
     jewelry: [],
     version: CURRENT_STATE_VERSION,
   }

   export function reducer(state: GameState, action: Action): GameState { /* ... */ }
   ```
   **Note for Fase 2:** når `makePickaxe(0)` er klar, opdater `migrateGameState` til at erstatte tomme `pixelItem` på starter-hakken med det fra `makePickaxe(0)`. Det sker automatisk i migration-stepped (version 1 → 2).

5. **Udvid `src/lib/storage.ts`**:
   ```ts
   const STATE_KEY = 'gem-game-state'
   export function loadState(): GameState
   export function saveState(s: GameState): void
   ```

6. **Opdatér `src/App.tsx`** til `useReducer` + `loadState`/`saveState`. Behold nuværende UI midlertidigt — Fase 1 erstatter den.

## Test (efter Fase 0)
- [ ] `npm run build` lykkes uden TypeScript-fejl.
- [ ] `npm run dev` starter, en eksisterende localStorage-samling indlæses uden krasj. `gems[]` har migrerede objekter med `metalInclusions: []` og `magicProperties: [...]`.
- [ ] Slet localStorage helt → ny session starter med `initialState` (level 1, xp 0, kobbermine valgt).
- [ ] Generér en ny ædelsten (med eksisterende UI) → den persisteres og overlever reload.
- [ ] `xpToNextLevel(1)` returnerer 100, `xpToNextLevel(10)` ≈ 3548 (sanity check).

---

# Fase 1 — Layout: AppShell, TabBar, MapScreen og level-badge

**Formål:** Etablér ramme-arkitekturen med bund-tab-bar og kortet som hub. Inkluderer level/XP-bar i toppen.

## Trin

1. **`src/components/layout/TabBar.tsx`** — fixed bottom-bar med 3 tabs:
   ```ts
   type Tab = 'map' | 'inventory' | 'shop'
   ```
   Min 64px høj. Aktiv tab er fremhævet. Touch-target ≥44px.

2. **`src/components/layout/LevelBadge.tsx`** — fixed top eller indlejret i Header:
   - Viser "Lvl {level}" + en tynd XP-bar med `xp / xpToNextLevel(level)`.
   - Viser også guld og reputation (små badges).

3. **`src/components/layout/AppShell.tsx`** — wrapper:
   ```tsx
   <div className="min-h-screen pb-20 pt-4">
     <LevelBadge state={state} />
     {children}
     <TabBar active={...} onChange={...} />
   </div>
   ```

4. **`src/data/areas.ts`** — fuld lokationsliste med metal-pool og krav:
   ```ts
   export const AREAS: Area[] = [
     // Miner — progression med stigende level/reputation/gold-krav
     {
       id: 'kobbermine', kind: 'mine', name: 'Kobbermine', icon: '⛏️',
       description: 'En primitiv mine med kobber- og tinåre.',
       unlockedByDefault: true,
       depthMultiplier: 1.0, rarityBonus: 0.00,
       metalPool: [
         { metal: 'Kobber', weight: 65 },
         { metal: 'Tin',    weight: 35 },
       ],
     },
     {
       id: 'jernkloeften', kind: 'mine', name: 'Jernkløften', icon: '⛏️',
       description: 'Mørke gange fyldt med jernåre. Kræver lvl 5.',
       unlockedByDefault: false,
       requirement: { level: 5, gold: 200 },
       depthMultiplier: 1.4, rarityBonus: 0.03,
       metalPool: [
         { metal: 'Jern',   weight: 60 },
         { metal: 'Kobber', weight: 25 },
         { metal: 'Tin',    weight: 15 },
       ],
     },
     {
       id: 'soelvhulen', kind: 'mine', name: 'Sølvhulen', icon: '⛏️',
       description: 'Glitrende sølvåre dybt under bjerget.',
       unlockedByDefault: false,
       requirement: { level: 12, reputation: 3, gold: 1500 },
       depthMultiplier: 1.9, rarityBonus: 0.06,
       metalPool: [
         { metal: 'Sølv',   weight: 50 },
         { metal: 'Jern',   weight: 35 },
         { metal: 'Kobber', weight: 15 },
       ],
     },
     {
       id: 'guldgrotten', kind: 'mine', name: 'Guldgrotten', icon: '⛏️',
       description: 'En skjult grotte rig på rent guld.',
       unlockedByDefault: false,
       requirement: { level: 22, reputation: 12, gold: 12000 },
       depthMultiplier: 2.6, rarityBonus: 0.10,
       metalPool: [
         { metal: 'Guld',   weight: 45 },
         { metal: 'Sølv',   weight: 35 },
         { metal: 'Jern',   weight: 20 },
       ],
     },
     {
       id: 'mithrilbjerget', kind: 'mine', name: 'Mithrilbjerget', icon: '⛏️',
       description: 'Højtsiddende åre af det legendariske mithril.',
       unlockedByDefault: false,
       requirement: { level: 35, reputation: 30, gold: 75000 },
       depthMultiplier: 3.5, rarityBonus: 0.15,
       metalPool: [
         { metal: 'Mithril', weight: 40 },
         { metal: 'Guld',    weight: 35 },
         { metal: 'Sølv',    weight: 25 },
       ],
     },
     {
       id: 'rune-dybet', kind: 'mine', name: 'Rune-Dybet', icon: '⛏️',
       description: 'Mystisk dyb fyldt med runestål-årer.',
       unlockedByDefault: false,
       requirement: { level: 55, reputation: 75, gold: 350000 },
       depthMultiplier: 5.0, rarityBonus: 0.22,
       metalPool: [
         { metal: 'Runestål', weight: 35 },
         { metal: 'Mithril',  weight: 35 },
         { metal: 'Guld',     weight: 30 },
       ],
     },

     // Statiske lokationer
     { id: 'smedjen',           kind: 'smedje', name: 'Smedjen',           icon: '🔨', description: 'Slib rå klippe og smelt malm.', unlockedByDefault: true,  depthMultiplier: 0, rarityBonus: 0 },
     { id: 'butikken',          kind: 'butik',  name: 'Butikken',          icon: '🪙', description: 'Køb opgraderinger og forbrugsvarer.', unlockedByDefault: true,  depthMultiplier: 0, rarityBonus: 0 },
     { id: 'smykkevaerkstedet', kind: 'smykke', name: 'Smykkeværkstedet',  icon: '💍', description: 'Lav eksklusive smykker.', unlockedByDefault: false, requirement: { level: 8, reputation: 5 }, depthMultiplier: 0, rarityBonus: 0 },
   ]
   ```

5. **`src/components/map/MapScreen.tsx`** — grid af `LocationCard`. Låste lokationer vises gråtonet med kravbeskrivelse. Klik på oplåst lokation:
   ```ts
   dispatch({ type: 'CHANGE_LOCATION', location: locId })
   dispatch({ type: 'SET_VIEW_MODE', viewMode: 'location' })
   ```
   Lokations-skærme har en "← Tilbage til kortet"-knap der dispatcher `SET_VIEW_MODE: 'map'`.

6. **`src/components/map/LocationCard.tsx`** — pixel-art-stil kort med ikon, navn, status (oplåst/låst/aktiv) + krav.

7. **Reducer-side-effect**: ved `GAIN_XP`, `GAIN_REPUTATION` eller `EARN_GOLD` skal alle krav tjekkes — hvis noget nu er opfyldt, dispatch `UNLOCK_LOCATION` automatisk.

8. **Opdatér `App.tsx`** til view-routing baseret på `tab` + `state.viewMode`:
   ```tsx
   const [tab, setTab] = useState<Tab>('map')
   let screen: React.ReactNode

   if (tab === 'inventory') {
     screen = <InventoryScreen />
   } else if (tab === 'shop') {
     // Genvejs-tab — åbner butikken som lokation
     screen = <ShopScreenPlaceholder />
   } else {
     // tab === 'map'
     if (state.viewMode === 'map') {
       screen = <MapScreen />
     } else {
       const area = AREAS.find(a => a.id === state.currentArea)!
       if (area.kind === 'mine')        screen = <MineScreenPlaceholder area={area} />
       else if (area.kind === 'smedje') screen = <SmithyPlaceholder />
       else if (area.kind === 'butik')  screen = <ShopScreenPlaceholder />
       else if (area.kind === 'smykke') screen = <JewelryPlaceholder />
     }
   }
   ```
   Når brugeren skifter til "shop"-tab fra TabBar, sættes `viewMode` ikke — `tab='shop'` viser butikken direkte uden at flytte spilleren væk fra deres aktive lokation. Det betyder spillere altid kan handle uden at miste kontekst.

9. **Flyt** den nuværende `GemViewer` + "Slib Ny Ædelsten"-knap ind i en midlertidig `SmithyPlaceholder` så funktionalitet bevares indtil Fase 6.

## Test (efter Fase 1)
- [ ] Bund-tab-bar er synlig, klikbar og skifter mellem tre faner.
- [ ] Level-badge viser Lvl 1 + tom XP-bar + 0 guld + 0 reputation.
- [ ] Kort-fanen viser alle lokationer; kun Kobbermine, Smedjen, Butikken er åbne. Resten har tydelige krav.
- [ ] Klik på Smedjen åbner den tidligere "Slib Ny Ædelsten"-skærm — funktionalitet bevaret 1:1.
- [ ] Mobilbredde 375px: ingen overlap, scroll virker.
- [ ] Reload bevarer aktiv lokation og level/xp.

---

# Fase 2 — Kobberminen: 3D-placeholder + mining-loop

**Formål:** Implementér mining-kerne med fundamentet for senere fuldt 3D-miljø.

## Designprincipper
- `Rock3DScene.tsx` er en `<Canvas>` på 100% bredde × max 60vh højde — fuldt udskiftelig senere.
- Klippen = `<mesh>` med icosahedron-geometri. Klik → damage. Shake-animation via `useFrame`.
- SVG-hakke ligger som **overlay** ovenpå canvas (`absolute inset-0`).
- Damage-tal er HTML-elementer i samme overlay-lag.
- Drop-rolls kalder `rollMineDrop(area, depth)` — area afgør metalpool.

## Trin

1. **`src/data/pickaxeTemplates.ts`** — pixel-templates for hakker (16×16):
   ```ts
   // Hver hakke har: håndtag = træfarve (T), hoved = metalfarve (H), kant = mørkere (K)
   // Skala 1: brug i inventory (ikon-størrelse ~80px). Skala 2: i 3D (VoxelScene).
   export const PICKAXE_TEMPLATE: string[] = [
     '..............HK',
     '.............HHK',
     '............HHHK',
     '..........HHHKK.',
     '.........HHHK...',
     '........HHHK....',
     '.......THKK.....',
     '......TT........',
     '.....TT.........',
     '....TT..........',
     '...TT...........',
     '..TT............',
     '.TT.............',
     'TT..............',
     'T...............',
     '................',
   ]
   // Tilsvarende for større hakker — kan starte med samme template men forskellige farver.
   ```

2. **`src/data/pickaxes.ts`** — hakke-stats + farve-maps:
   ```ts
   export function makePickaxe(tier: number): Pickaxe {
     const config = PICKAXE_CONFIGS[tier]
     return {
       id: `pickaxe-${config.slug}`,
       tier,
       name: config.name,
       damage: config.damage,
       durability: config.maxDurability,
       maxDurability: config.maxDurability,
       pixelItem: {
         data: PICKAXE_TEMPLATE,
         colorMap: { T: '#8b4513', H: config.headColor, K: config.edgeColor },
       },
     }
   }

   const PICKAXE_CONFIGS = [
     { slug: 'tin',    name: 'Tinhakke',    damage: 5,  maxDurability: 50,  headColor: '#cbd5e1', edgeColor: '#64748b' },
     { slug: 'iron',   name: 'Jernhakke',   damage: 10, maxDurability: 100, headColor: '#71717a', edgeColor: '#3f3f46' },
     { slug: 'steel',  name: 'Stålhakke',   damage: 18, maxDurability: 200, headColor: '#94a3b8', edgeColor: '#1e293b' },
     { slug: 'mithril',name: 'Mithrilhakke',damage: 35, maxDurability: 400, headColor: '#818cf8', edgeColor: '#3730a3' },
     { slug: 'rune',   name: 'Runehakke',   damage: 70, maxDurability: 800, headColor: '#6ee7b7', edgeColor: '#047857' },
   ]
   ```
   Initial state: `pickaxes: [makePickaxe(0)]`, `activePickaxeId: 'pickaxe-tin'`.

3. **`src/data/oreTemplates.ts`** — pixel-templates for malm-stykker (16×16):
   ```ts
   // Rå malm: stenklump-base (B) med tilfældige metalårer (M) og mørke huller (O)
   export const RAW_ORE_TEMPLATE: string[] = [
     '................',
     '......BBBB......',
     '....BBMMMMBB....',
     '...BMMOOOMMOB...',
     '..BMOOOOOMMOOB..',
     '..BMOMMMOOMOOB..',
     '.BMOMMMMMOMMOOB.',
     '.BMOMMMMMOMMOOB.',
     '.BMOMMMMMOMMOOB.',
     '..BMOMOOOMMOOB..',
     '..BMOOOOOMMOB...',
     '...BMMOOOMMB....',
     '....BBMMMMBB....',
     '......BBBB......',
     '................',
     '................',
   ]

   // Ren metalklump: ingen sten — kun blank metal m. lys-/skygge-detalje (★ rare drop)
   // K = lys-kant, M = metal-base, S = mørk skygge, F = funkle-glimt
   export const NUGGET_TEMPLATE: string[] = [
     '................',
     '......KKKK......',
     '.....KMMMMK.....',
     '....KMMFMMSK....',
     '...KMMMMMMMSK...',
     '..KMMFMMMMMMSK..',
     '..KMMMMMMMMMSK..',
     '..KMMMMMFMMMSK..',
     '..KMMMMMMMMSSK..',
     '..KMMMMMMMSSSK..',
     '...KMMMMMSSSK...',
     '....KMMSSSSK....',
     '.....KSSSSK.....',
     '......KKKK......',
     '................',
     '................',
   ]

   export function makeOrePixelItem(metalName: MetalName): PixelItem {
     const metal = METALS[metalName]
     return {
       data: RAW_ORE_TEMPLATE,
       colorMap: { B: '#57534e', O: '#44403c', M: metal.pixelColor },
     }
   }

   // Rå klippe: bruger ROUGH_STONE_TEMPLATE (en simpel klippet, kantet form) +
   // palettens hovedfarver. Quality skubber farven mod lysere (pristine) eller mørkere (crude).
   export function makeRoughStonePixelItem(palette: Palette, quality: RoughStone['quality']): PixelItem {
     const tint = quality === 'pristine' ? 0.2 : quality === 'crude' ? -0.15 : 0
     const map: ColorMap = { ...palette.colorMap }
     if (tint > 0) Object.keys(map).forEach(k => { map[k] = lightenColor(map[k], tint) })
     if (tint < 0) Object.keys(map).forEach(k => { map[k] = darkenColor(map[k], -tint) })
     return { data: ROUGH_STONE_TEMPLATE, colorMap: map }
   }

   // Simpel kantet klippet form (16×16) — placeholder; kan forfines.
   export const ROUGH_STONE_TEMPLATE: string[] = [
     '................',
     '......OOOO......',
     '....OODDDDOO....',
     '...ODDGGGGDDO...',
     '..ODGGGGGGDDO...',
     '..ODGGLLGGGDO...',
     '.ODGLLLLLGGGDO..',
     '.ODGLLLLLGGGDO..',
     '.ODGLLLLLGGDDO..',
     '..ODGLLGGGDDO...',
     '..ODGGGGGGDO....',
     '...ODDGGGDDO....',
     '....OODDDOO.....',
     '......OOOO......',
     '................',
     '................',
   ]

   export function makeNuggetPixelItem(metalName: MetalName): PixelItem {
     const metal = METALS[metalName]
     return {
       data: NUGGET_TEMPLATE,
       colorMap: {
         K: lightenColor(metal.pixelColor, 0.35),
         M: metal.pixelColor,
         S: darkenColor(metal.pixelColor, 0.35),
         F: '#ffffff',
       },
     }
   }

   // Små farve-helpers — også brugbare andre steder (gem-glow, jewelry).
   export function lightenColor(hex: string, amount: number): string {
     const { r, g, b } = parseHex(hex)
     return rgbToHex(
       Math.min(255, Math.round(r + (255 - r) * amount)),
       Math.min(255, Math.round(g + (255 - g) * amount)),
       Math.min(255, Math.round(b + (255 - b) * amount)),
     )
   }
   export function darkenColor(hex: string, amount: number): string {
     const { r, g, b } = parseHex(hex)
     return rgbToHex(
       Math.max(0, Math.round(r * (1 - amount))),
       Math.max(0, Math.round(g * (1 - amount))),
       Math.max(0, Math.round(b * (1 - amount))),
     )
   }
   function parseHex(hex: string) {
     const h = hex.replace('#','')
     return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
   }
   function rgbToHex(r:number,g:number,b:number) {
     return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')
   }
   ```

4. **`src/data/ingotTemplates.ts`** — staveformede ingots (16×16):
   ```ts
   export const INGOT_TEMPLATE: string[] = [
     '................',
     '................',
     '................',
     '....IIIIIIII....',
     '...IHHHHHHHHI...',
     '..IHHEEEEEEHHI..',
     '..IHEEHHHHEEHI..',
     '..IHEEHHHHEEHI..',
     '..IHEEHHHHEEHI..',
     '..IHHEEEEEEHHI..',
     '...IHHHHHHHHI...',
     '....IIIIIIII....',
     '................',
     '................',
     '................',
     '................',
   ]
   // I = lys kant, H = hoved (metal), E = mørk skygge
   ```

5. **`src/gem/mining.ts`** — drop-logik:
   ```ts
   export function rockHpForDepth(depth: number, area: Area): number {
     return Math.floor((20 + depth * 12 + depth * depth * 0.6) * area.depthMultiplier)
   }

   export type MineDrop =
     | { kind: 'ore'; ore: RawOre }
     | { kind: 'nugget'; nugget: MetalNugget }      // NY: ren metalklump (★)
     | { kind: 'rough-stone'; stone: RoughStone }
     | { kind: 'gem'; gem: Gem }
     | { kind: 'nothing' }

   // Drop-thresholds (cumulative). Påvirkes af area.rarityBonus.
   // ~2% gem  ★ → ~5% nugget ★ → ~22% rough stone → ~90% ore → ~100% nothing
   export function rollMineDrop(area: Area, depth: number): MineDrop {
     const r = Math.random()
     const gemThreshold     = 0.02 + area.rarityBonus
     const nuggetThreshold  = gemThreshold     + 0.03 + area.rarityBonus * 0.5
     const stoneThreshold   = nuggetThreshold  + 0.17 + area.rarityBonus * 0.5
     const oreThreshold     = 0.90

     if (r < gemThreshold)    return { kind: 'gem',          gem:    createRandomGem() }
     if (r < nuggetThreshold) return { kind: 'nugget',       nugget: rollNuggetFromArea(area) }
     if (r < stoneThreshold)  return { kind: 'rough-stone',  stone:  rollRoughStone() }
     if (r < oreThreshold)    return { kind: 'ore',          ore:    rollRawOreFromArea(area, depth) }
     return { kind: 'nothing' }
   }

   function rollMetalFromPool(area: Area): MetalName {
     // Sanity: filtrer alloy-only metaller fra pool — de skal aldrig droppe.
     const validPool = area.metalPool!.filter(p => MINEABLE_METALS.includes(p.metal))
     const totalWeight = validPool.reduce((s, p) => s + p.weight, 0)
     let r = Math.random() * totalWeight
     for (const entry of validPool) {
       if (r < entry.weight) return entry.metal
       r -= entry.weight
     }
     return validPool[0].metal
   }

   function rollRawOreFromArea(area: Area, depth: number): RawOre {
     const metal = rollMetalFromPool(area)
     return {
       metalName: metal,
       quantity: 1 + Math.floor(Math.random() * 2),
       pixelItem: makeOrePixelItem(metal),
     }
   }

   // Rå klippe — uden specifik area-tilknytning. Palette vælges tilfældigt fra PALETTES.
   function rollRoughStone(): RoughStone {
     const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]
     const r = Math.random()
     const quality: RoughStone['quality'] = r < 0.6 ? 'crude' : r < 0.92 ? 'fine' : 'pristine'
     return {
       id: `rough-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
       paletteName: palette.name,
       quality,
       pixelItem: makeRoughStonePixelItem(palette, quality),  // defineres i oreTemplates.ts
     }
   }

   // Nugget favoriserer det sjældneste metal i area's pool — det føles "tjent".
   function rollNuggetFromArea(area: Area): MetalNugget {
     const reweighted = area.metalPool!.map(p => ({
       metal: p.metal,
       weight: 100 / Math.max(p.weight, 1),  // invertér: lavere base-vægt = højere nugget-chance
     }))
     const total = reweighted.reduce((s, p) => s + p.weight, 0)
     let r = Math.random() * total
     for (const entry of reweighted) {
       if (r < entry.weight) {
         return {
           metalName: entry.metal,
           quantity: 1,
           pixelItem: makeNuggetPixelItem(entry.metal),
         }
       }
       r -= entry.weight
     }
     const fallback = area.metalPool![0].metal
     return { metalName: fallback, quantity: 1, pixelItem: makeNuggetPixelItem(fallback) }
   }
   ```

6. **`src/components/mine/Rock3DScene.tsx`** — R3F-canvas:
   ```tsx
   <Canvas camera={{ position: [0, 1, 5], fov: 45 }}>
     <ambientLight intensity={0.6} />
     <directionalLight position={[3, 5, 4]} intensity={1.0} />
     <Rock onHit={onHit} hp={hp} maxHp={maxHp} shakeSeed={shakeSeed} />
     <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
   </Canvas>
   ```
   `Rock` = `<mesh onClick={onHit}>` med `<icosahedronGeometry args={[1.2, 1]} />` og brun-grå standardmaterial.

7. **`src/components/mine/PickaxeOverlay.tsx`** — SVG-hakke (~80px) i nedre højre. Animeres via CSS-keyframe ved hit:
   ```css
   @keyframes pickaxe-strike { 0%{transform:rotate(0)} 30%{transform:rotate(-45deg)} 60%{transform:rotate(20deg)} 100%{transform:rotate(0)} }
   .animate-strike { animation: pickaxe-strike 200ms ease-out; }
   ```

8. **`src/components/mine/DamageNumbers.tsx`** + **`src/components/mine/MineHUD.tsx`** (HP-bar, dybde, hakke-durability).

9. **`src/components/mine/MineScreen.tsx`** — orkestrerer:
   - Lokal state: `hp`, `maxHp`, `shakeSeed`, `damageEvents`.
   - `handleHit()`: tjek durability → hvis 0, blokér + notifikation. Ellers: træk damage, vis flyvende tal, ryst klippe. Når `hp ≤ 0`: kald `rollMineDrop(area, state.depth)` → dispatch korrekt action + `GAIN_XP(rockBroken)`. Ny klippe spawner, dybde stiger.
   - Drop-handling — switch på `drop.kind`:
     ```ts
     switch (drop.kind) {
       case 'ore':         dispatch({ type: 'ADD_ORE', ore: drop.ore });             break
       case 'nugget':      dispatch({ type: 'ADD_NUGGET', nugget: drop.nugget });    break  // ★ wow!
       case 'rough-stone': dispatch({ type: 'ADD_ROUGH_STONE', stone: drop.stone }); break
       case 'gem':         dispatch({ type: 'ADD_GEM', gem: drop.gem });             break  // ★ wow!
     }
     ```
     Begge ★-drops trigger ekstra-fed visuel feedback (stjernepartikler, kraftigere damage-tal-skrift, kort lyd hvis tilføjet senere).
   - Hver hit giver også `GAIN_XP(mineHit)`.
   - "Tilbage til kortet"-knap øverst.

## Test (efter Fase 2)
- [ ] Klik på Kobberminen på kortet → 3D-klippe vises, kameraet stationært.
- [ ] Klik 5 gange → HP falder, klippe ryster, SVG-hakke animerer, damage-tal flyver op.
- [ ] Hver klik giver +1 XP, hver knust klippe giver +8 XP. XP-bar i Header opdaterer.
- [ ] Når HP = 0: drop sker, ny klippe har højere HP, dybde +1.
- [ ] Drop fra Kobbermine indeholder **kun** Kobber- og Tin-baserede drops (over 30+ drops). Verificér via inventory.
- [ ] Over 100+ knuste klipper observeres mindst én **metalklump** (★, ~3% chance) — "wow!"-feedback udløses tydeligt.
- [ ] Over 100+ knuste klipper observeres mindst én **direkte ædelsten** (★, ~2% chance) — wow-feedback udløses.
- [ ] I Sølvhulen (når låst op): nuggets favoriserer Sølv frem for Kobber/Jern (sjældnere metal i pool = højere nugget-chance).
- [ ] Hakke-durability falder. Når 0: hits blokeres + notifikation om at købe ny i Butikken.
- [ ] Mobil 375px: 3D-canvas fylder bredden, hakke + HUD overlapper ikke TabBar.
- [ ] Reload bevarer dybde, malm, nuggets, level.

---

# Fase 3 — Inventory: tre tabs med universel pixel-rendering

**Formål:** Inventory hvor **alle items** (gems, malm, ingots, hakker) bruger samme pixel-renderer — både 2D-ikon og fuldskærm 3D-rotation.

## Trin

1. **`src/components/PixelItemCard.tsx`** — generisk kort:
   ```tsx
   interface Props {
     item: PixelItem
     label: string
     subtitle?: string
     count?: number
     onClick?: () => void
     highlighted?: boolean
   }
   // Bruger drawGem() (2D canvas) til at rendere ikonet — uændret fra eksisterende kode.
   // Klik åbner ItemPreviewModal med 3D-rotation.
   ```

2. **`src/components/inventory/ItemPreviewModal.tsx`** — fullscreen-modal:
   ```tsx
   // Bruger eksisterende VoxelScene direkte med item.data + item.colorMap.
   // Auto-rotation aktiveret. Tilføj item-info-panel (statistik) ved siden af.
   ```
   Genbrug 100% af det roterende UI fra GemViewer — bare med generisk `PixelItem` i stedet for `Gem`.

3. **`src/components/inventory/InventoryScreen.tsx`** — fanen "inventory":
   - Tre underfaner: **Ædelsten**, **Råvarer**, **Redskaber**.
   - Kapacitetsindikator i toppen af hver tab: `12 / 40`.

4. **`GemInventoryTab.tsx`** — eksisterende `GemCard` + `Collection`-grid. Klik åbner `GemViewer`-modal (uændret).

5. **`MaterialsInventoryTab.tsx`** — fire sektioner:
   - **Rå klipper**: liste med `PixelItemCard`, sorteret efter quality.
   - **Rå malm**: liste pr. metal (grupperet) med `PixelItemCard` + count.
   - **Metalklumper** (★): liste pr. metal med fremhævet ramme/glow — disse er sjældne og værdifulde.
   - **Metal-ingots**: liste pr. metal med `PixelItemCard` + count.
   - Klik på et item → `ItemPreviewModal` med roterende 3D.

6. **`ToolsInventoryTab.tsx`**:
   - Liste over `Pickaxe`-objekter, hver med `PixelItemCard` (2D-ikon).
   - Aktiv hakke har `highlighted` ring.
   - Klik åbner modal med 3D-roterende hakke + stats (damage, durability) + "Sæt som aktiv"-knap.

7. **Kapacitetshåndtering** i reducer: `ADD_*`-actions kontrollerer mod `inventoryCapacity` og dispatcher en notifikation hvis fuld.

## Test (efter Fase 3)
- [ ] Klik på taske-ikonet → inventory åbner med tre faner.
- [ ] Ædelsten-fanen: kort med pixel-art-ikoner. Klik → roterende 3D-modal.
- [ ] Råvarer-fanen: rå malm vises som **stenklump** med metalfarve i pixels. Klik → roterende 3D af stenklumpen.
- [ ] Hvis spilleren har fået en metalklump (★): den vises i en separat "Metalklumper"-sektion med tydelig fremhævning. Klik → roterende 3D af blank, ren metalklump uden sten omkring.
- [ ] Redskaber-fanen: Tinhakken vises som lille pixel-hakke (2D). Klik → roterende 3D-hakke.
- [ ] Skift aktivt hakke fra modal → ikon i tools-tab og minens HUD opdateres.
- [ ] Visuel konsistens: gems, malm og hakker har samme art-stil og rotationsfølelse.

---

# Fase 4 — Multi-Magic + Multi-Metal generation

**Formål:** Aktivér de to breaking changes på `Gem`-typen i selve generationen og visningen.

## Trin

1. **`src/data/metals.ts`**:
   ```ts
   export const METALS: Record<MetalName, MetalInclusion> = {
     'Tin':      { name: 'Tin',      icon: '⚪', pixelColor: '#d4d4d8', goldBonus: 1.10, effect: '+10% guld' },
     'Kobber':   { name: 'Kobber',   icon: '🔶', pixelColor: '#b45309', goldBonus: 1.20, effect: '+20% guld' },
     'Jern':     { name: 'Jern',     icon: '⬛', pixelColor: '#52525b', goldBonus: 1.35, effect: '+35% guld' },
     'Bronze':   { name: 'Bronze',   icon: '🟫', pixelColor: '#92400e', goldBonus: 1.50, effect: '+50% guld' },
     'Sølv':     { name: 'Sølv',     icon: '⬜', pixelColor: '#cbd5e1', goldBonus: 1.90, effect: '+90% guld' },
     'Guld':     { name: 'Guld',     icon: '🟡', pixelColor: '#fcd34d', goldBonus: 2.50, effect: '+150% guld' },
     'Mithril':  { name: 'Mithril',  icon: '💠', pixelColor: '#818cf8', goldBonus: 4.00, effect: '+300% guld + glow' },
     'Runestål': { name: 'Runestål', icon: '🔷', pixelColor: '#6ee7b7', goldBonus: 6.00, effect: '+500% guld + rune-aura' },
   }
   ```

2. **Opdatér `src/gem/generate.ts`**:
   - `rollMagicProperties(): MagicProperty[]` — sandsynligheder 61.5/30/7/1.5 (ingen/1/2/3), unikke pr. sten.
   - `rollMetalInclusions(area?: Area): MetalInclusion[]` — lavere generel sandsynlighed; vægtes mod sjældne metaller ved højere area-rarityBonus.
   - Tilføj inklusioner til `data` med nøglerne `M1`/`M2`/`M3` og put farverne i `colorMap`.
   - Beregn `goldValue` som **sidste step** i `createRandomGem()` og `craftGemFromRoughStone()` (Fase 6):
     ```ts
     export function computeGoldValue(gem: Gem, depth: number): number {
       const magicMul = [1, 2.5, 7, 20][gem.magicProperties.length] ?? 1
       const metalMul = gem.metalInclusions.reduce((m, x) => m * x.goldBonus, 1)
       const purityMul = [0.5, 1, 1.5, 3][gem.purity - 1] ?? 1
       const depthMul = 1 + depth * 0.1
       return Math.max(1, Math.floor(5 * magicMul * metalMul * purityMul * depthMul))
     }
     ```
   - **Kalde-sted:** alle steder hvor en `Gem` oprettes (i `createRandomGem` + `craftGemFromRoughStone`):
     ```ts
     const gem: Gem = { ...basis, goldValue: 0 }
     gem.goldValue = computeGoldValue(gem, currentDepth)
     return gem
     ```
     `currentDepth` overføres som parameter — for direkte mining-drops bruges `state.depth`, for crafting-i-Smedjen bruges `state.depth` (eller 0 hvis vi vil holde slibning depth-uafhængig).

3. **Opdatér `GemCard.tsx`**:
   - Map over `gem.magicProperties` → flere små badges.
   - Map over `gem.metalInclusions` → ikon-række.
   - Vis `goldValue` med mønt-ikon.

4. **Opdatér `GemViewer.tsx`**:
   - Loop over magic. Beregn glow ud fra højeste rarity blandt magic + metal-inklusioner.
   - Ved 3+ inklusioner: ekstra dramatisk glow-puls (`glow-legendary`).

5. **Reducer**: `ADD_GEM` opdaterer `state.totalGemsFound++` og dispatcher `GAIN_XP(gemCrafted)`.

## Test (efter Fase 4)
- [ ] Slib 50+ ædelsten (midlertidig debug-knap i Smedje-placeholder). Procentfordelingen for magic-egenskaber matcher 61.5/30/7/1.5 (±10%).
- [ ] Mindst én sten har 2 magic-egenskaber. Badges vises korrekt side om side.
- [ ] Mindst én sten har metal-inklusioner — pixels vises i 2D **og** 3D.
- [ ] `goldValue` skalerer mærkbart med antal magic + metaller.
- [ ] Eksisterende sten i localStorage migreres uden tab.
- [ ] Hver crafted gem giver +12 XP.

---

# Fase 5 — Smelter-tiers (datafundament for Fase 6)

**Formål:** Definér smelter-tier-systemet før vi bygger smelteren, så vi kender kontrakten.

## Trin

1. **`src/data/smelterTiers.ts`**:
   ```ts
   export type SmelterTier = {
     tier: number
     name: string
     allowedMetals: MetalName[]
     speedMultiplier: number    // 1.0 = base
     upgradeCost: number        // 0 for tier 1 (start)
   }

   export const SMELTER_TIERS: SmelterTier[] = [
     { tier: 1, name: 'Simpel Smelteovn', allowedMetals: ['Tin','Kobber','Jern'],                                speedMultiplier: 1.00, upgradeCost: 0      },
     { tier: 2, name: 'Forstærket Ovn',   allowedMetals: ['Tin','Kobber','Jern','Sølv'],                         speedMultiplier: 1.25, upgradeCost: 1500   },
     { tier: 3, name: 'Smedeovn',         allowedMetals: ['Tin','Kobber','Jern','Sølv','Guld'],                  speedMultiplier: 1.50, upgradeCost: 8000   },
     { tier: 4, name: 'Mithril-Smelter',  allowedMetals: ['Tin','Kobber','Jern','Sølv','Guld','Mithril'],        speedMultiplier: 1.85, upgradeCost: 50000  },
     { tier: 5, name: 'Rune-Forge',       allowedMetals: ['Tin','Kobber','Jern','Sølv','Guld','Mithril','Runestål'], speedMultiplier: 2.50, upgradeCost: 250000 },
   ]

   export const ORE_PER_INGOT: Record<MetalName, number> = {
     'Tin': 2, 'Kobber': 2, 'Jern': 3, 'Bronze': 0,  // bronze er legering
     'Sølv': 4, 'Guld': 5, 'Mithril': 8, 'Runestål': 12,
   }

   // Metalklump (★): kun 1 klump → 1 ingot. Den hurtige vej.
   export const NUGGET_PER_INGOT: Record<MetalName, number> = {
     'Tin': 1, 'Kobber': 1, 'Jern': 1, 'Bronze': 0,
     'Sølv': 1, 'Guld': 1, 'Mithril': 1, 'Runestål': 1,
   }

   export const SMELT_TIME_MS: Record<MetalName, number> = {
     'Tin': 4000, 'Kobber': 5000, 'Jern': 8000, 'Bronze': 6000,
     'Sølv': 12000, 'Guld': 18000, 'Mithril': 30000, 'Runestål': 60000,
   }

   // Nuggets smelter også hurtigere — ren metal, ingen "rensning" nødvendig.
   export const NUGGET_SMELT_TIME_MULTIPLIER = 0.5
   ```

2. **`src/data/jewelry.ts`** (allerede planlagt til Fase 8) — kan defineres som tom array nu og fyldes senere.

## Test (efter Fase 5)
- [ ] TypeScript kompilerer. Konstanterne kan importeres og loggges.
- [ ] `SMELTER_TIERS[0].allowedMetals` indeholder `['Tin','Kobber','Jern']` — som forventet.

---

# Fase 6 — Smedjen: smelter, slibebord, legeringer

**Formål:** Det centrale crafting-rum. Smelteren bruger tiers fra Fase 5.

## Trin

1. **`src/gem/smelting.ts`** — ren logik:
   ```ts
   export type SmeltingSource = 'ore' | 'nugget'

   export type SmeltingJob = {
     id: string
     metalName: MetalName
     source: SmeltingSource     // 'ore' = forarbejdning, 'nugget' = hurtig vej
     inputUsed: number          // hvor meget af source der blev forbrugt
     timeMs: number             // efter speedMultiplier
     startedAt: number          // Date.now()
   }

   export function canSmelt(metalName: MetalName, smelterTier: number): boolean {
     return SMELTER_TIERS[smelterTier - 1].allowedMetals.includes(metalName)
   }

   export function startSmeltingJob(
     metalName: MetalName,
     source: SmeltingSource,
     state: GameState,
   ): SmeltingJob | null {
     const tier = SMELTER_TIERS[state.smelterTier - 1]
     if (!tier.allowedMetals.includes(metalName)) return null

     if (source === 'nugget') {
       const needed = NUGGET_PER_INGOT[metalName]
       const owned = state.metalNuggets.find(n => n.metalName === metalName)?.quantity ?? 0
       if (owned < needed) return null
       return {
         id: `smelt-${Date.now()}`,
         metalName,
         source: 'nugget',
         inputUsed: needed,
         timeMs: (SMELT_TIME_MS[metalName] * NUGGET_SMELT_TIME_MULTIPLIER) / tier.speedMultiplier,
         startedAt: Date.now(),
       }
     }

     const needed = ORE_PER_INGOT[metalName]
     const owned = state.rawOre.find(o => o.metalName === metalName)?.quantity ?? 0
     if (owned < needed) return null
     return {
       id: `smelt-${Date.now()}`,
       metalName,
       source: 'ore',
       inputUsed: needed,
       timeMs: SMELT_TIME_MS[metalName] / tier.speedMultiplier,
       startedAt: Date.now(),
     }
   }
   ```

2. **`src/gem/crafting.ts`**:
   ```ts
   export function craftGemFromRoughStone(
     stone: RoughStone,
     ingots: { metalName: MetalName; quantity: number }[],
   ): Gem {
     // Brug eksisterende createRandomGem-byggeklodser; lås palette fra stone.paletteName.
     // Hvis ingots leveres: garanterer metalInclusions med disse metaller.
   }

   export function craftAlloy(input: { a: MetalName; b: MetalName }): MetalName | null {
     // Kobber + Tin = Bronze. Andre legeringer kan tilføjes senere.
     if ((input.a === 'Kobber' && input.b === 'Tin') || (input.a === 'Tin' && input.b === 'Kobber')) {
       return 'Bronze'
     }
     return null
   }
   ```

3. **`src/components/smithy/Smelter.tsx`**:
   - To kolonner pr. metal: "Smelt fra malm" og "Smelt fra klump (★)" — sidstnævnte kun synlig hvis spilleren ejer en klump af det metal.
   - Filter for kun tier-tilladte metaller. Vis tooltips på disabled-knapper.
   - "Smelt"-knap pr. kombination — disabled hvis utilstrækkeligt input.
   - Aktive jobs vises med progress-bar (`(now - startedAt) / timeMs`). Jobs fra nuggets har et lille ★-badge i UI.
   - `useEffect` med `setInterval(500ms)` kalder `dispatch({type:'TICK_SMELTING'})` der færdiggør jobs.
   - Færdigt job: `ADD_INGOT` + `GAIN_XP(oreSmelted)`. Reducer trækker fra `rawOre` eller `metalNuggets` afhængigt af `job.source`.
   - Tier-info-panel viser: nuværende tier-navn, hvilke metaller den kan smelte, "Opgrader til Tier {n}" knap (→ Butikken).
   - **Ingen offline-progress** i Fase 6 (jobs pauser ved reload — kan tilføjes som fremtidig forbedring).

4. **`src/components/smithy/AlloyStation.tsx`**:
   - Vælg to ingot-typer → "Lav legering"-knap.
   - Når kobber + tin = bronze → forbrug 1 af hver, producér 1 bronze-ingot. (Andre legeringer kan tilføjes senere som data-driven liste.)

5. **`src/components/smithy/GemCrafter.tsx`**:
   - Liste over rå klipper. Vælg en + valgfrit op til 3 metal-ingots.
   - "Slib"-knap → 1.5s polering-animation → kald `craftGemFromRoughStone()` → dispatch `ADD_GEM` + `CONSUME_ROUGH_STONE` + `CONSUME_INGOT`-actions + `GAIN_XP(gemCrafted)`.
   - Resultat vises i den **eksisterende, uændrede** `GemViewer`.

6. **`src/components/smithy/SmithyScreen.tsx`** — three-section layout (eller stablet på mobil): Smelter, AlloyStation, GemCrafter. Pixel-art baggrund.

7. **Fjern** den midlertidige "Slib Ny Ædelsten"-knap fra Fase 1.

## Test (efter Fase 6)
- [ ] Mine Kobbermine → 2+ kobber-malm. Gå til Smedjen.
- [ ] Smelt 2 Kobber (fra malm) → progress-bar starter, efter ~5s tilføjes 1 kobber-ingot. +5 XP.
- [ ] Smelt 2 Tin → 1 tin-ingot.
- [ ] Mining indtil en kobber-klump (★) drops. Smelter viser nu en ekstra "Smelt fra klump"-knap. Tryk → progress-bar er ~50% kortere (~2.5s) og forbruger 1 klump → 1 ingot.
- [ ] AlloyStation: vælg Kobber + Tin → 1 bronze-ingot. Begge inputs forbruges.
- [ ] Forsøg at smelte Sølv: knap er disabled med tooltip "Kræver smelter tier 2".
- [ ] Slib en rå klippe **med** 2 kobber-ingots → resulterende ædelsten har præcis 2 kobber-inklusioner. +12 XP.
- [ ] Reload mens et smelte-job kører: jobbet pauser (eller fortsætter — afhænger af implementation, default: pauser).

---

# Fase 7 — Butikken: opgraderinger, smelter-tiers, charms

**Formål:** Permanente opgraderinger og forbrugsvarer.

## Trin

1. **`src/data/shop.ts`** — items i 5 kategorier:
   - **Hakker**: Jernhakke (200g, lvl 3), Stålhakke (1000g, lvl 8), Mithrilhakke (10000g, lvl 25), Runehakke (100000g, lvl 50).
   - **Smelter-opgraderinger**: viser næste tier med pris fra `SMELTER_TIERS[currentTier].upgradeCost`.
   - **Forbrugsvarer**: Dynamit (instant kill næste klippe), Slibesten (+1 purity til næste sten), Reparations-kit (+50% durability til aktivt hakke).
   - **Inventory-udvidelser**: +20 gem-pladser (500g), +100 materials (300g), +5 tool-slots (1000g).
   - **Charms** (passive): "Heldig minearbejder" (+5% sjælden drop, lvl 5), "Smedens øje" (+10% goldValue, lvl 10), "Dyb stille" (+15% dybdebonus, lvl 15).

2. **`src/components/shop/ShopScreen.tsx`**:
   - Tabs for hver kategori. Prisliste, "Køb"-knap → dispatch `SPEND_GOLD` + relevant action.
   - Disable hvis utilstrækkeligt guld eller level for lavt — vis krav som tooltip.

3. **Reducer-actions**: `BUY_PICKAXE`, `UPGRADE_SMELTER` (state.smelterTier++ + spend gold), `BUY_CONSUMABLE`, `EXPAND_INVENTORY`, `BUY_CHARM`.

4. **Charms i state**: `activeCharms: CharmId[]`. Beregningskode i `mining.ts`, `generate.ts` osv. tjekker for charm-IDs og applicerer modifiers.

## Test (efter Fase 7)
- [ ] Tjen 200g + nå level 3 → Butikken → Køb Jernhakke. Vises i Redskaber-tab. Sæt aktiv. Mining-skader stiger.
- [ ] Smelter-opgradering tier 1→2: koster 1500g, kræver guld. Efter køb kan Sølv smeltes.
- [ ] Smelter tier 4 kræver Mithril i smelter-allowed → kan først bruges efter unlock af Mithrilbjerget (lvl 35).
- [ ] Køb +20 gem-pladser → kapacitet stiger.
- [ ] Køb "Heldig minearbejder" → drop-rate for rå klipper og direkte gems stiger mærkbart.
- [ ] Forbrugsvarer kan bruges (knap i relevant kontekst).
- [ ] Disabled-state + tooltips for utilstrækkeligt guld/level virker.

---

# Fase 8 — Smykkeværkstedet (uden essenser endnu)

**Formål:** Crafting af smykker fra ædelsten + ingots. Sælges på Adelsmarkedet for guld + reputation. Smykkeværkstedet er låst indtil lvl 8 + 5 reputation.

## Trin

1. **`src/data/jewelry.ts`** — opskrifter med stigende krav:
   ```ts
   export const JEWELRY_RECIPES: JewelryRecipe[] = [
     { id: 'simple-ring',     name: 'Simpel Ring',      requires: { gemPurityMin: 1, ingot: { 'Kobber': 1 } },                  goldValue: 50,    reputation: 1,  level: 8  },
     { id: 'bronze-amulet',   name: 'Bronzeamulet',     requires: { gemPurityMin: 2, ingot: { 'Bronze': 2 } },                  goldValue: 200,   reputation: 2,  level: 12 },
     { id: 'silver-amulet',   name: 'Sølvamulet',       requires: { gemPurityMin: 2, ingot: { 'Sølv': 2 } },                    goldValue: 500,   reputation: 4,  level: 18 },
     { id: 'gold-circlet',    name: 'Guldcirklet',      requires: { gemPurityMin: 3, ingot: { 'Guld': 1, 'Sølv': 1 } },         goldValue: 2000,  reputation: 10, level: 25 },
     { id: 'mithril-diadem',  name: 'Mithril-Diadem',   requires: { gemPurityMin: 3, gemMagicMin: 1, ingot: { 'Mithril': 1 } }, goldValue: 8000,  reputation: 25, level: 38 },
     { id: 'rune-circlet',    name: 'Runecirklet',      requires: { gemPurityMin: 4, gemMagicMin: 2, ingot: { 'Runestål': 1, 'Mithril': 1 } }, goldValue: 50000, reputation: 80, level: 55 },
   ]
   ```

2. **`src/types.ts`** udvidelse:
   ```ts
   export type Jewelry = {
     id: string
     recipeId: string
     name: string
     gemUsed: { id: string; name: string }
     ingotsUsed: { metalName: MetalName; quantity: number }[]
     goldValue: number
     reputationValue: number
     pixelItem: PixelItem      // visuel kombination — kan starte simpel
     timestamp: string
   }
   ```

3. **`src/components/jewelry/JewelryWorkshopScreen.tsx`**:
   - Vælg opskrift → vælg sten (filtreret på krav) → vælg ingots → "Lav smykke"-knap.
   - Resultat tilføjes til `state.jewelry[]` + `GAIN_XP(jewelryCrafted)`.
   - "Sælg på Adelsmarkedet"-knap → `SELL_JEWELRY` → `EARN_GOLD` + `GAIN_REPUTATION` + `GAIN_XP(jewelrySold)`.

4. **Lås Smykkeværkstedet op** når lvl 8 + 5 reputation er opnået (auto-tjek i reducer).

## Test (efter Fase 8)
- [ ] Smykkeværkstedet er låst i starten med "Krav: Lvl 8 + 5 Reputation"-besked.
- [ ] Når kravene mødes → Smykkeværkstedet låses op automatisk og notifikation vises.
- [ ] Lav en Simpel Ring → vises i smykkeliste. Sælg → guld + reputation + XP stiger.
- [ ] Krav til opskrifter blokerer korrekt (purity, magic, ingot-typer, level).

---

# Fase 9 — Æteriske essenser

**Formål:** Det sidste system. Essenser er biprodukter og bruges i avanceret crafting.

## Trin

1. **`src/data/essences.ts`** — 8 essenser (samme liste som tidligere).

2. **Acquisition-points**:
   - **Mining drops**: extend `rollMineDrop()` med ny `kind: 'essence'` (~1.5% common, ~0.3% rare, ~0.05% legendary). Sjældnere essenser favoriseres i sjældnere miner (via area.rarityBonus).
   - **Smelting biprodukt**: 2% chance for common-essens, 0.5% for rare ved hvert færdigt smelte-job.
   - **Adelsmarkedet**: "Køb essens"-fane i Smykkeværkstedet med vekslende daglig udbud.

3. **`src/components/jewelry/EssenceChamber.tsx`** — fane i smykkeværkstedet med ejede essenser.

4. **Essence-Infusion**:
   - I `JewelryWorkshopScreen`: valgfrit slot for én essens pr. crafting.
   - I `GemCrafter` (Smedjen): tilsvarende slot.
   - I `MineScreen`: enkeltklik-brug af forbrugbare essenser.

5. **Reducer**: `CONSUME_ESSENCE`, `APPLY_ESSENCE_EFFECT` (kortvarige buffs i `state.activeEffects`).

## Test (efter Fase 9)
- [ ] Mine 100+ omgange → mindst én common-essens.
- [ ] Smelt 30+ malm → mindst én biprodukts-essens.
- [ ] Brug Drageglimmer i Smedjen → næste slibede sten har Ild-magic-egenskab garanteret.
- [ ] Brug Fønix-Aske i Minen → aktivt hakke fuld-repareret + permanent +5 max durability.
- [ ] Adelsmarkedet viser tilfældigt udbud. Køb fungerer.
- [ ] Legendary-essenser føles ekstremt tilfredsstillende.

---

# Fase 10 — Polish & integration

**Formål:** Bring spillet til en sammenhængende oplevelse.

## Trin

- **Save-versioning**: `state.version` bumpes ved hver schema-ændring fremover.
- **Notifikations-system**: enkelt toast-system (~50 linjer) til drop-events, level-ups, lock-ups.
- **Lyd**: valgfrit Howler.js — hak-lyde, ka-ching ved guld, glasagtig klang ved nye gems.
- **Achievements**: trackes via `totalGemsFound`, `totalDepth`, `essencesCollected`.
- **Mobil-optimering**: tjek alle skærme i 375px og 414px bredde.
- **Performance**: profilér mining-loop ved 1000+ klik. `useMemo` på inventory-lister.

## Test (efter Fase 10)
- [ ] Fuld spilgennemgang fra fresh localStorage: kort → Kobbermine (lvl 1-5) → Smedje (smelt+slib) → Butik (Jernhakke) → Jernkløften (lvl 5+) → … → Mithrilbjerget (lvl 35+).
- [ ] Mobil 375px: ingen UI-overlap, alle knapper klikbare.
- [ ] Save/load over en hel session bevarer **alt**.
- [ ] Performance: stabil 60fps efter 500+ mining-klik.

---

# Fremtidige forbedringer (ud over feature-listen)

Disse er **bevidst udeladt** for at holde scopet, men arkitekturen er klar:

1. **Ægte 3D-mineløb**: Erstat `Rock3DScene` med `MineEnvironment3D` (gangsystem, flere klipper, partikler). Logik-laget i `mining.ts` er allerede afkoblet.
2. **Offline-progress for smelteovn**: Beregn ved app-start hvor mange jobs er færdige siden `closedAt`-timestamp.
3. **Mine-specifikke baggrunde**: Hver mine får sit eget 3D-miljø (kobbermine = rødlig sten; mithrilbjerget = krystallinsk blå; rune-dybet = mørk rune-glødende).
4. **Auto-save throttling**: Debounce localStorage-skrivning til 1s.
5. **Cloud-save**: Trivielt fra ét serializerbart `GameState`.
6. **Crafting-recepter for hakker**: Erstat "køb i butik" med "lav i smedjen" når Smedjen er moden.
7. **Flere legeringer**: Electrum (sølv+guld), Stål (jern+kul hvis vi tilføjer kul), Aetherium (mithril+runestål).
8. **Daglige opgaver / contracts** fra Adelsmarkedet for konstant XP.

---

# Implementeringsrækkefølge — opsummering

```
Fase 0  →  Fundament (types, state, persistens, leveling)
Fase 1  →  Layout (TabBar, MapScreen, LevelBadge, AREAS)
Fase 2  →  Kobberminen + 3D placeholder + mining-loop
Fase 3  →  Inventory (3 tabs) — universel pixel-rendering
Fase 4  →  Multi-magic + multi-metal generation
Fase 5  →  Smelter-tier datafundament
Fase 6  →  Smedjen (smelter + slibebord + legeringer)
Fase 7  →  Butikken (incl. smelter-opgraderinger + charms)
Fase 8  →  Smykkeværkstedet + Adelsmarkedet
Fase 9  →  Æteriske essenser
Fase 10 →  Polish & integration
```

**Spillet er fuldt spilbart efter Fase 6** — derefter er alt additive forbedringer.

---

# Konsistens-checkliste (verificér før Fase 0 startes)

Disse er kontrakter der bygges i tidlige faser og **bruges** i senere faser. Hvis du ændrer en, så ændr alle bruger-sider.

| Kontrakt | Defineret i | Bruges i | Note |
|---|---|---|---|
| `PixelItem = { data, colorMap }` | Fase 0 (`types.ts`) | Fase 2 (ore/nugget/pickaxe), Fase 3 (PixelItemCard), Fase 8 (Jewelry) | Ren `drawGem`/`VoxelScene` kontrakt |
| `MetalName` enum | Fase 0 (`types.ts`) | overalt | **Tilføj nye metaller i begge `MINEABLE_METALS` og `ALLOY_ONLY_METALS`** |
| `GameState.smeltingJobs` | Fase 0 (forward-declared) | Fase 6 (Smelter) | Tomt array i Fase 0; pushes til i Fase 6 |
| `GameState.viewMode` | Fase 0 | Fase 1 (App.tsx routing) | `'map'` initielt; ændres ved klik på lokation |
| Reducer aggregation for stack-bare items | Fase 0 (kommentar) | Fase 2 (ADD_ORE/NUGGET), Fase 6 (ADD_INGOT) | Find-by-metalName + addér quantity, ellers push |
| `materialsCount(state)` helper | Fase 0 (kommentar) | Fase 2 (capacity-tjek), Fase 3 (UI), Fase 7 (køb af udvidelse) | Sum af 4 arrays — én helper-funktion |
| `MineDrop` discriminated union | Fase 2 (`mining.ts`) | Fase 2 (MineScreen.handleHit) | Switch på `kind` |
| `SmeltingJob.source` | Fase 6 (`smelting.ts`) | Fase 6 (Smelter UI + reducer) | `'ore'` eller `'nugget'` afgør hvilket array der reduceres |
| `MINEABLE_METALS` filter | Fase 0 | Fase 2 (`rollMetalFromPool`) | Forhindrer Bronze fra at droppe |
| `computeGoldValue` | Fase 4 (`generate.ts`) | Fase 4 (`createRandomGem`), Fase 6 (`craftGemFromRoughStone`) | Sidste step inden `Gem` returneres |

## Cross-fase afhængigheder (top-down)

```
Fase 0  →  alle senere faser bygger på types + reducer-skelet
Fase 1  →  AREAS-data + viewMode er forudsat fra Fase 2 og frem
Fase 2  →  rollMineDrop er forudsat fra Fase 6 (drops havner i smedjen)
Fase 4  →  Gem-typens nye felter er forudsat fra Fase 6 (slibning) og Fase 8 (smykker)
Fase 5  →  smelter-tier-data er forudsat fra Fase 6 (smelter-logik) og Fase 7 (opgraderinger)
Fase 6  →  craftGemFromRoughStone er fundament for Fase 8
Fase 8  →  reputation + jewelry-system er fundament for Fase 9 (Adelsmarkedet)
```

Hver fase efterlader et **stabilt** API som senere faser kan bygge på uden at omformulere tidligere kode. Kun reducer-blokken vokser monotont (nye `case`-grene tilføjes) — ingen eksisterende kode skal omskrives.
