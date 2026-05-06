# GemSimulator – Smykke-System Masterplan

> **Implementeringsklar plan til Composer 2**
> Version 2.0 · Udarbejdet 6. maj 2026 · Verificeret mod kodebase

---

## ⚡ TL;DR for Composer 2

**Mission:** Erstat det fælles ring-template med et **blueprint-system** der giver hver smykketype et unikt 2D pixel-art udseende **og** en 3D voxel-preview, samt åbner op for shop-køb af nye opskrifter.

**Implementeres i 6 sprints, 100% bagudkompatibelt:**

| Sprint | Leverance | Filer | Risiko |
|---|---|---|---|
| 1 | Datafundament: typer + 25 blueprint-defs | 4 nye, 2 ændrede | 🟢 Lav |
| 2 | 2D pixel-templates til alle 25 smykker | 1 ny fil (~600 linjer data) | 🟡 Medium |
| 3 | 3D voxel-renderer (kræver `VoxelScene` udvidelse) | 2 nye, 1 ændret | 🔴 Høj |
| 4 | Workshop UI: blueprint-vælger + 3D preview-tab | 1 ændret | 🟢 Lav |
| 5 | Shop-tab: køb af blueprints + unlock-system | 2 nye, 3 ændrede | 🟡 Medium |
| 6 | Inventory-modal, achievements, mine-loot, balance | 4 ændrede | 🟢 Lav |

**Total estimat:** ~2.500 linjer ny kode, ~400 linjer ændret kode.

**Den ene store tekniske blocker:** `VoxelScene.tsx` skal udvides til at acceptere ægte 3D-data (Z-akse). Dette er forklaret i Sprint 3 i fuldt kodedetaljer.

---

## 0. Verificeret status quo (kodebase pr. 6. maj 2026)

| Område | Fil | Faktisk tilstand | Konsekvens for plan |
|---|---|---|---|
| Smykke-data | `src/data/jewelry.ts` | 6 hardcodede recipes, ét fælles 16×16 grid (`JEWELRY_TEMPLATE`) | Skal udvides — **ikke** slettes (bagudkompatibilitet) |
| Smykke-state | `src/types.ts` | `Jewelry.recipeId: string`, `gemUsed: { id, name }` (singulær) | Skal udvides; `recipeId` beholdes for migration |
| 2D rendering | `src/gem/draw2d.ts` | `drawGem(canvas, data, colorMap, scale)` | **Genbruges 1:1** — ingen ændring |
| 3D rendering | `src/components/VoxelScene.tsx` | **Kun 2D-input** (data: `string[]`), Z=0, MAX_INSTANCES=320 | **Skal udvides** med valgfri 3D-mode |
| Workshop UI | `src/components/jewelry/JewelryWorkshopScreen.tsx` | `<select>` med recipes, ingen preview | Skal opdateres med blueprint-katalog + preview-tab |
| Shop | `src/components/shop/ShopScreen.tsx` | Tabs: pickaxes, smelter, consumables, inventory, charms, sell | Tilføj `'blueprints'` til `ShopTabId` |
| Reducer | `src/lib/gameState.ts` | `'CRAFT_JEWELRY'` action med `recipeId, gemId` | Tilføj nye actions; behold gammel for legacy-saves |
| Migration | `src/lib/migrations.ts` | `CURRENT_STATE_VERSION = 9` | Bump til **10**; tilføj `unlockedBlueprints: []` |
| Achievements | `src/data/achievements.ts` | 10 stk., ingen "Master Jeweler" | Tilføj achievement til Sprint 6 |
| Mine-loot | `src/gem/mining.ts` | `MineDrop`-union mangler blueprint-drop | Tilføj `{ kind: 'blueprint'; blueprintId }` i Sprint 6 |
| Bagudkompat | `src/data/jewelry.ts::migrateJewelry` | Forventer `recipeId: string` | **Må ikke** brydes — `recipeId` bevares som felt |

**Fundament der ER solidt og bruges uændret:** `colorResolver.ts`, `palettes.ts`, `metals.ts`, `oreTemplates.ts` (`darkenColor/lightenColor`), `displayRenderSettings.ts`, `applyEligibleUnlocks`, `applyXpGain`.

---

## 1. Arkitektur-diagram (målbillede)

```
┌──────────────────────────────────────────────────────────────────┐
│                         Brugerflow                               │
└──────────────────────────────────────────────────────────────────┘

  Butik > Blueprint-tab          Smykkeværkstedet
  ┌──────────────────┐           ┌─────────────────────────────┐
  │ [katalog]        │           │ Vælg blueprint  ▼           │
  │ Pris · Lvl · Køb │ ───────▶  │ Vælg sten(e) (1-3 slots)    │
  └──────────────────┘  unlock   │ Vælg metal · essens         │
                                 │                             │
                                 │ ┌─────────┬───────────┐     │
                                 │ │ 2D      │ 3D 🔄     │     │
                                 │ │ preview │ preview   │     │
                                 │ └─────────┴───────────┘     │
                                 │ [Lav smykke]                │
                                 └─────────────┬───────────────┘
                                               │ CRAFT_JEWELRY_V2
                                               ▼
                                  GameState.jewelry[].voxelData

┌──────────────────────────────────────────────────────────────────┐
│                       Data-flow (3D voxel)                       │
└──────────────────────────────────────────────────────────────────┘

  jewelryTemplates.ts             drawJewelry3d.ts
  ┌─────────────────┐             ┌─────────────────────┐
  │ baseShape →     │ ──────────▶ │ buildJewelryVoxel() │
  │ data: string[]  │             │  - læser 2D-grid    │
  │ (2D pixel-grid) │             │  - bygger 3D layers │
  └─────────────────┘             │  - returnerer       │
                                  │    Voxel3DGrid      │
                                  └──────────┬──────────┘
                                             │
                                             ▼
              VoxelScene.tsx (udvidet — accepterer 2D ELLER 3D)
                          │
                          ▼
                  InstancedMesh i Three.js
```

**Nye filer (7):**
```
src/data/blueprints.ts                  ← 25 Blueprint-objekter
src/data/jewelryTemplates.ts            ← 25 baseShape-definitioner (2D)
src/gem/drawJewelry3d.ts                ← 2D→3D voxel-builder
src/components/jewelry/
  JewelryViewer.tsx                     ← 3D-wrapper (bruger udvidet VoxelScene)
  BlueprintShopTab.tsx                  ← Shop-tab UI
  BlueprintCard.tsx                     ← Genbrugelig blueprint-tile
  JewelryDetailModal.tsx                ← Inventory detail-view
```

**Ændrede filer (8):**
```
src/types.ts                            ← Blueprint, Voxel3DGrid, Jewelry-udvidelse
src/data/jewelry.ts                     ← makeJewelryPixelItem() ny signatur + legacy-shim
src/components/VoxelScene.tsx           ← Z-akse support (mode: '2d' | '3d')
src/components/jewelry/
  JewelryWorkshopScreen.tsx             ← blueprint-katalog + 3D-preview
src/components/shop/ShopScreen.tsx      ← ny tab
src/data/shop.ts                        ← tilføj 'blueprints' til ShopTabId
src/lib/gameState.ts                    ← BUY_BLUEPRINT, CRAFT_JEWELRY_V2, UNLOCK_BLUEPRINT
src/lib/migrations.ts                   ← v10 + unlockedBlueprints field
```

---

## 2. SPRINT 1 — Datafundament (no-UI, ingen visuel ændring)

**Mål:** Typer, 25 blueprint-objekter og state-felter er klar. Tests grøn.
**Estimat:** 1 arbejdsdag · ~700 linjer ny kode.

### 2.1 Typer i `src/types.ts`

**Tilføj nye typer:**

```ts
export type BlueprintCategory =
  | 'ring'
  | 'necklace'
  | 'earring'
  | 'bracelet'
  | 'brooch'
  | 'headpiece'
  | 'amulet'

export type BlueprintUnlockMethod = 'starter' | 'shop' | 'achievement' | 'mine-loot'

export type Blueprint = {
  /** Unik nøgle. Bruges som `baseShape` i jewelryTemplates.ts. */
  id: string
  name: string
  category: BlueprintCategory
  /** Antal gem-slots (1-3). Validering: gemSlots === antal 'g'/'h'/'i'-grupper i grid. */
  gemSlots: 1 | 2 | 3
  requires: {
    gemPurityMin: number
    gemMagicMin?: number
    /** Mindste mængde af hvert metal (Partial). */
    ingot: Partial<Record<MetalName, number>>
    level: number
  }
  /** Pris i butikken (kun relevant hvis 'shop' i unlockMethod). */
  shopPrice: number
  /** Salgsværdi når smykket er craftet og sælges. */
  goldValue: number
  reputation: number
  /** Hvordan blueprintet bliver tilgængeligt for spilleren. */
  unlockMethod: BlueprintUnlockMethod
  description: string
  /** Emoji / kort tegn til UI-ikon. */
  icon: string
}

/**
 * 3D-voxel format. Encoded som flade lag (z=0 forrest, z=depth-1 bagest).
 * Hvert lag er et 2D-grid (string[]) med samme dimensioner.
 *
 * Eksempel: depth=3, 16×16-grid →
 *   layers[0] = forsiden (alle pixels synlige)
 *   layers[1] = midten (kun rim/metal)
 *   layers[2] = bagsiden (kun rim/metal, mørkere via colorMap-suffix '_back')
 */
export type Voxel3DGrid = {
  /** Antal Z-lag (typisk 3). */
  depth: number
  /** layers.length === depth. Alle layers har samme bredde/højde. */
  layers: string[][]
  colorMap: ColorMap
}
```

**Udvid `Jewelry`-typen (additivt — `recipeId` bevares for legacy):**

```ts
export type Jewelry = {
  id: string
  /** @deprecated v10: brug blueprintId. Bevares til legacy save-migration. */
  recipeId: string
  /** v10+: nøgle til Blueprint i blueprints.ts. */
  blueprintId: string
  name: string
  /** v10+: array (1-3 stk) — første gem er primær. Legacy: enkelt gem. */
  gemsUsed: { id: string; name: string }[]
  /** @deprecated v10: brug gemsUsed[0]. */
  gemUsed: { id: string; name: string }
  ingotsUsed: { metalName: MetalName; quantity: number }[]
  goldValue: number
  reputationValue: number
  pixelItem: PixelItem
  /** v10+: 3D voxel-data, lazily computed på craft eller første visning. */
  voxelData?: Voxel3DGrid
  timestamp: string
}
```

**Udvid `GameState`:**

```ts
export type GameState = {
  // ... eksisterende felter ...
  /** v10+: Blueprint-IDs som spilleren har låst op (køb, achievement, drop). */
  unlockedBlueprints: string[]
}
```

### 2.2 Blueprint-katalog i `src/data/blueprints.ts` (NY FIL)

**25 blueprints fordelt på 4 niveauer.** Strukturen herunder er normativ — Composer 2 skal genere præcis disse felter.

```ts
import type { Blueprint } from '../types'

export const BLUEPRINTS: Blueprint[] = [
  // ============================================================
  // NIVEAU 1 — Starter (auto-unlocked, level 8-14)
  // ============================================================
  {
    id: 'simple_band', name: 'Simpel Ring', category: 'ring', gemSlots: 1,
    requires: { gemPurityMin: 1, ingot: { Kobber: 1 }, level: 8 },
    shopPrice: 0, goldValue: 80, reputation: 1,
    unlockMethod: 'starter', icon: '◯',
    description: 'En enkel kobberring med ét gem.',
  },
  {
    id: 'stud_earrings', name: 'Stud-Øreringe', category: 'earring', gemSlots: 1,
    requires: { gemPurityMin: 1, ingot: { Tin: 1 }, level: 8 },
    shopPrice: 0, goldValue: 90, reputation: 1,
    unlockMethod: 'starter', icon: '⚭',
    description: 'Små diskrete øresten.',
  },
  {
    id: 'basic_pendant', name: 'Simpel Vedhæng', category: 'necklace', gemSlots: 1,
    requires: { gemPurityMin: 1, ingot: { Kobber: 1 }, level: 8 },
    shopPrice: 0, goldValue: 120, reputation: 2,
    unlockMethod: 'starter', icon: '◇',
    description: 'En lille sten i kobberindfatning på snor.',
  },

  // ============================================================
  // NIVEAU 2 — Håndværker (shop, level 12-22, 600-3.500 g)
  // ============================================================
  {
    id: 'bangle', name: 'Armring', category: 'bracelet', gemSlots: 1,
    requires: { gemPurityMin: 2, ingot: { Bronze: 2 }, level: 12 },
    shopPrice: 600, goldValue: 280, reputation: 4,
    unlockMethod: 'shop', icon: '◜',
    description: 'Stiv armring med markant gem.',
  },
  {
    id: 'brooch_pin', name: 'Brochenål', category: 'brooch', gemSlots: 1,
    requires: { gemPurityMin: 2, ingot: { Bronze: 1 }, level: 12 },
    shopPrice: 700, goldValue: 320, reputation: 5,
    unlockMethod: 'shop', icon: '✦',
    description: 'Cirkulær broche med central sten.',
  },
  {
    id: 'hoop_earrings', name: 'Ring-Øreringe', category: 'earring', gemSlots: 1,
    requires: { gemPurityMin: 2, ingot: { Sølv: 1 }, level: 14 },
    shopPrice: 850, goldValue: 380, reputation: 6,
    unlockMethod: 'shop', icon: '○',
    description: 'Klassiske sølvringe med stenophæng.',
  },
  {
    id: 'solitaire_ring', name: 'Solitærring', category: 'ring', gemSlots: 1,
    requires: { gemPurityMin: 2, ingot: { Sølv: 1 }, level: 15 },
    shopPrice: 1200, goldValue: 600, reputation: 8,
    unlockMethod: 'shop', icon: '◈',
    description: 'Klassisk sølvring med én markant sten.',
  },
  {
    id: 'signet_ring', name: 'Signet-ring', category: 'ring', gemSlots: 1,
    requires: { gemPurityMin: 2, ingot: { Sølv: 2 }, level: 18 },
    shopPrice: 1800, goldValue: 950, reputation: 12,
    unlockMethod: 'shop', icon: '▣',
    description: 'Tung sølvring med fladt sten-segl.',
  },
  {
    id: 'choker', name: 'Halsbånd', category: 'necklace', gemSlots: 2,
    requires: { gemPurityMin: 2, ingot: { Sølv: 2 }, level: 18 },
    shopPrice: 2200, goldValue: 1400, reputation: 16,
    unlockMethod: 'shop', icon: '⌒',
    description: 'Tæt-siddende halskæde med to sten.',
  },
  {
    id: 'locket', name: 'Medaljon', category: 'necklace', gemSlots: 1,
    requires: { gemPurityMin: 3, ingot: { Sølv: 1, Guld: 1 }, level: 20 },
    shopPrice: 2800, goldValue: 1850, reputation: 22,
    unlockMethod: 'shop', icon: '♡',
    description: 'Hjerteformet medaljon, sølv og guld.',
  },
  {
    id: 'drop_earrings', name: 'Drop-Øreringe', category: 'earring', gemSlots: 2,
    requires: { gemPurityMin: 2, ingot: { Sølv: 1 }, level: 16 },
    shopPrice: 1500, goldValue: 850, reputation: 10,
    unlockMethod: 'shop', icon: '⟁',
    description: 'Hængende øresten med drop-form.',
  },
  {
    id: 'anklet', name: 'Ankelkæde', category: 'bracelet', gemSlots: 1,
    requires: { gemPurityMin: 2, ingot: { Sølv: 1 }, level: 16 },
    shopPrice: 1300, goldValue: 720, reputation: 8,
    unlockMethod: 'shop', icon: '∾',
    description: 'Fin sølvkæde til anklen med drop-sten.',
  },
  {
    id: 'cuff_bracelet', name: 'Manchet-Armbånd', category: 'bracelet', gemSlots: 2,
    requires: { gemPurityMin: 3, ingot: { Guld: 1 }, level: 22 },
    shopPrice: 3500, goldValue: 2400, reputation: 28,
    unlockMethod: 'shop', icon: '⌗',
    description: 'Bredt guldarmbånd med to gem-indlæg.',
  },

  // ============================================================
  // NIVEAU 3 — Mester (shop, level 25-38, 7.000-25.000 g)
  // ============================================================
  {
    id: 'cluster_ring', name: 'Cluster-Ring', category: 'ring', gemSlots: 3,
    requires: { gemPurityMin: 3, ingot: { Guld: 1 }, level: 25 },
    shopPrice: 7000, goldValue: 4800, reputation: 55,
    unlockMethod: 'shop', icon: '✺',
    description: 'Tre sten i cluster-formation.',
  },
  {
    id: 'halo_ring', name: 'Halo-Ring', category: 'ring', gemSlots: 3,
    requires: { gemPurityMin: 3, ingot: { Guld: 2 }, level: 28 },
    shopPrice: 9500, goldValue: 6500, reputation: 75,
    unlockMethod: 'shop', icon: '◉',
    description: 'Stor centersten omkranset af to mindre sten.',
  },
  {
    id: 'eternity_band', name: 'Evighedsring', category: 'ring', gemSlots: 3,
    requires: { gemPurityMin: 3, ingot: { Platin: 1 }, level: 30 },
    shopPrice: 12000, goldValue: 8500, reputation: 90,
    unlockMethod: 'shop', icon: '∞',
    description: 'Platinring med tre sten i række.',
  },
  {
    id: 'chandelier_earrings', name: 'Lysekrone-Øreringe', category: 'earring', gemSlots: 3,
    requires: { gemPurityMin: 3, ingot: { Guld: 1 }, level: 28 },
    shopPrice: 9000, goldValue: 6200, reputation: 70,
    unlockMethod: 'shop', icon: '⚜',
    description: 'Pragtøreringe med tre kaskaderende sten.',
  },
  {
    id: 'multi_strand', name: 'Multi-Streng Halskæde', category: 'necklace', gemSlots: 3,
    requires: { gemPurityMin: 3, ingot: { Guld: 2 }, level: 32 },
    shopPrice: 14000, goldValue: 10500, reputation: 110,
    unlockMethod: 'shop', icon: '≋',
    description: 'Tre flettede strenge med sten-indlæg.',
  },
  {
    id: 'tennis_bracelet', name: 'Tennis-Armbånd', category: 'bracelet', gemSlots: 3,
    requires: { gemPurityMin: 3, ingot: { Platin: 1 }, level: 35 },
    shopPrice: 18000, goldValue: 14000, reputation: 140,
    unlockMethod: 'shop', icon: '⌬',
    description: 'Lange rækker af sten i platin-indfatning.',
  },
  {
    id: 'cameo_brooch', name: 'Kamé-Broche', category: 'brooch', gemSlots: 2,
    requires: { gemPurityMin: 3, ingot: { Guld: 1, Sølv: 1 }, level: 30 },
    shopPrice: 11000, goldValue: 7800, reputation: 85,
    unlockMethod: 'shop', icon: '⛋',
    description: 'Klassisk kamé-broche i bicolor.',
  },
  {
    id: 'rune_amulet', name: 'Runeamulet', category: 'amulet', gemSlots: 2,
    requires: { gemPurityMin: 3, gemMagicMin: 1, ingot: { Mithril: 1 }, level: 38 },
    shopPrice: 25000, goldValue: 22000, reputation: 200,
    unlockMethod: 'shop', icon: 'ᚱ',
    description: 'Mithril-amulet med to magiske runer.',
  },

  // ============================================================
  // NIVEAU 4 — Fantasy (achievement / loot only, level 40-50)
  // ============================================================
  {
    id: 'tiara', name: 'Tiara', category: 'headpiece', gemSlots: 3,
    requires: { gemPurityMin: 3, ingot: { Guld: 2, Sølv: 1 }, level: 40 },
    shopPrice: 0, goldValue: 45000, reputation: 350,
    unlockMethod: 'achievement', icon: '♛',
    description: 'Royal tiara — låses op via "Mester-juveler".',
  },
  {
    id: 'mithril_circlet', name: 'Mithril-Diadem', category: 'headpiece', gemSlots: 3,
    requires: { gemPurityMin: 4, gemMagicMin: 1, ingot: { Mithril: 2 }, level: 42 },
    shopPrice: 60000, goldValue: 75000, reputation: 500,
    unlockMethod: 'shop', icon: '♕',
    description: 'Skinnende mithril-diadem med tre magiske sten.',
  },
  {
    id: 'celestial_pendant', name: 'Stjernevedhæng', category: 'amulet', gemSlots: 2,
    requires: { gemPurityMin: 4, gemMagicMin: 2, ingot: { Mithril: 1, Platin: 1 }, level: 45 },
    shopPrice: 0, goldValue: 95000, reputation: 700,
    unlockMethod: 'mine-loot', icon: '☄',
    description: 'Sjælden drop fra Mithrilbjerget — magisk vedhæng.',
  },
  {
    id: 'dragonscale_bracelet', name: 'Drageskæl-Armbånd', category: 'bracelet', gemSlots: 3,
    requires: { gemPurityMin: 4, gemMagicMin: 2, ingot: { Runestål: 1 }, level: 50 },
    shopPrice: 0, goldValue: 180000, reputation: 1200,
    unlockMethod: 'mine-loot', icon: '⛧',
    description: 'Mytisk armbånd — kun fra Rune-Dybets sjældne kister.',
  },
]

export const BLUEPRINTS_BY_ID = new Map(BLUEPRINTS.map((b) => [b.id, b]))

export function findBlueprint(id: string): Blueprint | undefined {
  return BLUEPRINTS_BY_ID.get(id)
}

export function blueprintsByCategory(category: BlueprintCategory): Blueprint[] {
  return BLUEPRINTS.filter((b) => b.category === category)
}

/** IDs af blueprints der skal gives gratis ved spil-start. */
export const STARTER_BLUEPRINT_IDS: string[] = BLUEPRINTS
  .filter((b) => b.unlockMethod === 'starter')
  .map((b) => b.id)
```

### 2.3 Bagudkompatibilitet — `findJewelryRecipe` shim

I `src/data/jewelry.ts` tilføjes (uden at slette `JEWELRY_RECIPES`):

```ts
import { findBlueprint } from './blueprints'

const LEGACY_RECIPE_TO_BLUEPRINT: Record<string, string> = {
  'simple-ring': 'simple_band',
  'bronze-amulet': 'basic_pendant',
  'silver-amulet': 'locket',
  'gold-circlet': 'halo_ring',
  'mithril-diadem': 'mithril_circlet',
  'rune-circlet': 'tiara',
}

export function blueprintFromLegacyRecipeId(recipeId: string): string {
  return LEGACY_RECIPE_TO_BLUEPRINT[recipeId] ?? 'simple_band'
}
```

### 2.4 Migration v9 → v10 i `src/lib/migrations.ts`

```ts
export const CURRENT_STATE_VERSION = 10  // BUMP fra 9

// I migrateGameState, efter v9-blokken:
if (version < 10) {
  // Sørg for unlockedBlueprints findes
  if (!Array.isArray(next.unlockedBlueprints)) {
    next.unlockedBlueprints = [...STARTER_BLUEPRINT_IDS]
  }
  // Migrér eksisterende jewelry: tilføj blueprintId og gemsUsed[]
  next.jewelry = next.jewelry.map((j) => {
    if (j.blueprintId && Array.isArray(j.gemsUsed)) return j
    const blueprintId = blueprintFromLegacyRecipeId(j.recipeId ?? '')
    return {
      ...j,
      blueprintId,
      gemsUsed: j.gemUsed ? [j.gemUsed] : [],
    }
  })
}
```

Tilføj i `initialState`:
```ts
unlockedBlueprints: [...STARTER_BLUEPRINT_IDS],
```

### 2.5 Tests (Sprint 1 DoD)

Opret/udvid `src/lib/migrations.test.ts`:

```ts
describe('migrateGameState v10', () => {
  it('tilføjer unlockedBlueprints med starter-IDs hvis ikke til stede', () => {
    const raw = { ...initialState, version: 9, jewelry: [] }
    const next = migrateGameState(raw, initialState)
    expect(next.unlockedBlueprints).toEqual(STARTER_BLUEPRINT_IDS)
  })

  it('migrerer legacy jewelry.recipeId → blueprintId', () => {
    const raw = {
      ...initialState, version: 9,
      jewelry: [{
        id: 'j1', recipeId: 'simple-ring', name: 'Simpel Ring',
        gemUsed: { id: 'g1', name: 'Rubin' },
        ingotsUsed: [{ metalName: 'Kobber', quantity: 1 }],
        goldValue: 50, reputationValue: 1,
        pixelItem: { data: [], colorMap: {} }, timestamp: '12:00',
      }],
    }
    const next = migrateGameState(raw, initialState)
    expect(next.jewelry[0].blueprintId).toBe('simple_band')
    expect(next.jewelry[0].gemsUsed).toEqual([{ id: 'g1', name: 'Rubin' }])
  })
})
```

**Sprint 1 DoD:**
- [ ] `Blueprint`, `Voxel3DGrid` typer eksporteres fra `types.ts`
- [ ] 25 blueprint-defs i `blueprints.ts` (CI: snapshot test af længde === 25)
- [ ] `STARTER_BLUEPRINT_IDS.length === 3`
- [ ] Migration-test grøn for v9→v10
- [ ] `npm run typecheck` grøn
- [ ] Ingen runtime-ændring synlig i UI endnu

---

## 3. SPRINT 2 — 2D Pixel-Templates

**Mål:** Hver af de 25 blueprints har et unikt 16×16 (eller 24×16 for headpieces) pixel-grid.
**Estimat:** 1-2 arbejdsdage · ~600 linjer data.

### 3.1 Grid-charset (NORMATIV)

| Char | Betydning | Pligt |
|---|---|---|
| `.` | Transparent | — |
| `r` | Metal — basis (rim) | Ja |
| `R` | Metal — skygge (mørkere) | Ja |
| `s` | Metal — highlight (lysere) | Ja |
| `g` | Gem-slot 1 — primær (`gemsUsed[0]`) | Ja (mindst 1 forekomst) |
| `h` | Gem-slot 2 — sekundær (`gemsUsed[1]`) | Kun hvis `gemSlots ≥ 2` |
| `i` | Gem-slot 3 — tertiær (`gemsUsed[2]`) | Kun hvis `gemSlots === 3` |

**Regler:**
1. Alle rækker i et grid SKAL have samme længde — valideres i unit test.
2. Antallet af unikke gem-chars (`g`, `h`, `i`) i grid SKAL matche `blueprint.gemSlots` exact (1, 2, eller 3).
3. Default dimensioner: **16×16** for ringe/øreringe/broche, **20×16** for halskæder/armbånd, **24×12** for headpieces.

### 3.2 Filen `src/data/jewelryTemplates.ts` (NY)

Strukturen er en dictionary `Record<blueprintId, string[]>`. Composer 2 skal generere et grid for hver blueprint efter ovenstående regler. Eksempler nedenfor er produktionsklare og kan bruges 1:1 — de resterende 22 grids skal følge samme stil.

```ts
import type { Blueprint } from '../types'
import { BLUEPRINTS } from './blueprints'

export type JewelryTemplate = {
  /** Bredde × Højde af grid. */
  width: number
  height: number
  /** 2D pixel-grid. data.length === height, data[y].length === width. */
  data: string[]
}

export const JEWELRY_TEMPLATES: Record<string, JewelryTemplate> = {
  // ─── NIVEAU 1 — Starter ──────────────────────────────────────
  simple_band: {
    width: 16, height: 16, data: [
      '................',
      '................',
      '......RRRR......',
      '.....RrrrrR.....',
      '....RrggggrR....',
      '....Rgg..ggR....',
      '....Rgg..ggR....',
      '....RrggggrR....',
      '.....RrrrrR.....',
      '......RRRR......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  stud_earrings: {
    width: 16, height: 16, data: [
      '................',
      '................',
      '...RRR....RRR...',
      '..RrgrR..RrgrR..',
      '..RggsR..RggsR..',
      '..RrgrR..RrgrR..',
      '...RRR....RRR...',
      '...R.R....R.R...',
      '...R.R....R.R...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  basic_pendant: {
    width: 16, height: 16, data: [
      'rrrrrrrrrrrrrrrr',
      '................',
      '................',
      '.......rr.......',
      '......RrrR......',
      '.....RrggrR.....',
      '....Rrgssgrr....',
      '....Rrgssgrr....',
      '.....RrggrR.....',
      '......RrrR......',
      '.......rr.......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // ─── NIVEAU 2 — Solitaire-eksempel (1 slot, ringbånd) ──────
  solitaire_ring: {
    width: 16, height: 16, data: [
      '................',
      '......sRRs......',
      '.....RrgggR.....',
      '....RrggggrR....',
      '...RrgssggrR....',
      '...RgsggssgR....',
      '...RrgssggrR....',
      '....RrggggrR....',
      '.....RrgggR.....',
      '......sRRs......',
      '......RrrR......',
      '......RrrR......',
      '.......RR.......',
      '................',
      '................',
      '................',
    ],
  },

  // ─── NIVEAU 2 — Choker (2 slots, halskæde) ─────────────────
  choker: {
    width: 20, height: 16, data: [
      '....................',
      '..rrrrrrrrrrrrrrrr..',
      '.r..............rr..',
      'r................r..',
      '..................r.',
      '....RRRR....RRRR....',
      '...RrhhrR..RrggrR...',
      '...RhssshR.RgssgR...',
      '...RhssshR.RgssgR...',
      '...RrhhrR..RrggrR...',
      '....RRRR....RRRR....',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ],
  },

  // ─── NIVEAU 3 — Cluster-Ring (3 slots) ─────────────────────
  cluster_ring: {
    width: 16, height: 16, data: [
      '................',
      '......RRRR......',
      '.....Rrhhrr.....',
      '....RhssshrR....',
      '....RhsgsshR....',
      '....RrgssgrR....',
      '....RrggssrR....',
      '....RhsgssiR....',
      '....RissshrR....',
      '.....RrissR.....',
      '......RRRR......',
      '......RrrR......',
      '......RrrR......',
      '.......RR.......',
      '................',
      '................',
    ],
  },

  // ─── NIVEAU 4 — Tiara (3 slots, headpiece) ─────────────────
  tiara: {
    width: 24, height: 12, data: [
      '........................',
      '...R........R........R..',
      '..RsR......RrR......RsR.',
      '..RhR.....RrgrR.....RiR.',
      '.RhssR...RrgssgrR...RissR',
      'RhsssR..RrgsssgrR..RisssR',
      'RrrrrrrrrrrrrrrrrrrrrrrrR',
      'RsRsRsRsRsRsRsRsRsRsRsRsR',
      'RrrrrrrrrrrrrrrrrrrrrrrrR',
      '........................',
      '........................',
      '........................',
    ],
  },

  // [resterende 19 templates: følg samme stil-konventioner]
  // bangle, brooch_pin, hoop_earrings, signet_ring, locket,
  // drop_earrings, anklet, cuff_bracelet, halo_ring, eternity_band,
  // chandelier_earrings, multi_strand, tennis_bracelet, cameo_brooch,
  // rune_amulet, mithril_circlet, celestial_pendant, dragonscale_bracelet
}

/** Validering ved bundle-tid (kører i dev/test). */
export function validateAllTemplates(): string[] {
  const errors: string[] = []
  for (const bp of BLUEPRINTS) {
    const t = JEWELRY_TEMPLATES[bp.id]
    if (!t) {
      errors.push(`Mangler template for blueprint: ${bp.id}`)
      continue
    }
    if (t.data.length !== t.height) {
      errors.push(`${bp.id}: data.length (${t.data.length}) ≠ height (${t.height})`)
    }
    for (const [i, row] of t.data.entries()) {
      if (row.length !== t.width) {
        errors.push(`${bp.id}: række ${i} har bredde ${row.length}, forventet ${t.width}`)
      }
    }
    const chars = new Set(t.data.join(''))
    const expectedSlotChars = ['g', 'h', 'i'].slice(0, bp.gemSlots)
    for (const c of expectedSlotChars) {
      if (!chars.has(c)) errors.push(`${bp.id}: mangler gem-char '${c}'`)
    }
    if (bp.gemSlots < 3 && chars.has('i')) errors.push(`${bp.id}: 'i' brugt men gemSlots=${bp.gemSlots}`)
    if (bp.gemSlots < 2 && chars.has('h')) errors.push(`${bp.id}: 'h' brugt men gemSlots=${bp.gemSlots}`)
  }
  return errors
}
```

### 3.3 Opdater `makeJewelryPixelItem()` i `src/data/jewelry.ts`

```ts
import { JEWELRY_TEMPLATES } from './jewelryTemplates'
import { findBlueprint } from './blueprints'
import { darkenColor, lightenColor } from './oreTemplates'

/**
 * NY signatur. Bygger 2D pixel-grid for et smykke.
 * @param blueprintId - Blueprint-nøgle (matcher JEWELRY_TEMPLATES).
 * @param gems - Gems til slot g, h, i. Længde skal matche blueprint.gemSlots.
 * @param rimMetal - Metal til kant/skygge/highlight (r/R/s).
 */
export function makeJewelryPixelItemV2(
  blueprintId: string,
  gems: Gem[],
  rimMetal: MetalName,
): PixelItem {
  const tmpl = JEWELRY_TEMPLATES[blueprintId]
  if (!tmpl) {
    return makeJewelryPixelItemLegacy(gems[0], rimMetal)
  }
  const baseRim = METALS[rimMetal].pixelColor
  const slotColors = ['g', 'h', 'i'] as const
  const colorMap: ColorMap = {
    r: baseRim,
    R: darkenColor(baseRim, 0.30),
    s: lightenColor(baseRim, 0.25),
  }
  for (let i = 0; i < gems.length && i < 3; i++) {
    const gem = gems[i]!
    const ch = slotColors[i]
    const raw =
      resolveColor('G', gem.colorMap) ??
      resolveColor('1', gem.colorMap) ??
      resolveColor('D', gem.colorMap) ??
      '#c084fc'
    colorMap[ch] = typeof raw === 'string' && raw.startsWith('#') ? raw : '#c084fc'
  }
  return { data: tmpl.data, colorMap }
}

/** Bevares uændret — bruges af legacy-kald. */
export function makeJewelryPixelItemLegacy(gem: Gem, rimMetal: MetalName): PixelItem {
  // ... eksisterende implementation ...
}
```

**Sprint 2 DoD:**
- [ ] `JEWELRY_TEMPLATES` indeholder præcis 25 entries (test: `Object.keys(JEWELRY_TEMPLATES).length === 25`)
- [ ] `validateAllTemplates()` returnerer `[]` (kører i CI)
- [ ] Visuel inspektion: hver template renderet via `<PixelItemCard>` ser distinkt ud
- [ ] `makeJewelryPixelItemV2('simple_band', [rubinGem], 'Kobber')` matcher snapshot

---

## 4. SPRINT 3 — 3D Voxel Renderer (KRITISK SPRINT)

**Mål:** Vise smykker i ægte 3D med dybde — kræver udvidelse af `VoxelScene`.
**Estimat:** 2 arbejdsdage · ~400 linjer ny + 80 linjer ændret.
**Risiko:** 🔴 Høj — performance, kamera, instance-limits.

### 4.1 Udvid `VoxelScene.tsx` til at acceptere 3D-data

**Problem:** Nuværende `VoxelScene` itererer kun `data[y][x]` ved Z=0. Vi skal tilføje en valgfri 3D-mode uden at bryde eksisterende kald (`GemViewer`, `ItemPreviewModal`).

**Løsning:** Diskrimineret union på props. Rendering-loop udvides til 3D, men 2D-callers oplever ingen ændring.

```tsx
// src/components/VoxelScene.tsx — ÆNDRET

const MAX_INSTANCES = 1024  // BUMP fra 320 — 3D-grids kan have ~700 voxels.

type VoxelSceneProps2D = {
  mode?: '2d'
  data: string[]
  colorMap: ColorMap
  className?: string
  canvasStyle?: CSSProperties
  cameraTilt?: number  // optional Y-rotation i radianer (default 0.3 X som i dag)
}

type VoxelSceneProps3D = {
  mode: '3d'
  voxel3d: Voxel3DGrid
  className?: string
  canvasStyle?: CSSProperties
  cameraTilt?: number
}

export type VoxelSceneProps = VoxelSceneProps2D | VoxelSceneProps3D

function VoxelMesh3D({ voxel3d }: { voxel3d: Voxel3DGrid }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.15, flatShading: true }),
    []
  )

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !voxel3d.layers.length) return
    const depth = voxel3d.depth
    const h = voxel3d.layers[0].length
    const w = voxel3d.layers[0][0].length
    let idx = 0
    outer: for (let z = 0; z < depth; z++) {
      const layer = voxel3d.layers[z]
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ch = layer[y][x]
          if (ch === '.') continue
          if (idx >= MAX_INSTANCES) break outer
          dummy.position.set(
            x - (w - 1) / 2,
            -y + (h - 1) / 2,
            z - (depth - 1) / 2,
          )
          dummy.rotation.set(0, 0, 0)
          dummy.scale.set(1, 1, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(idx, dummy.matrix)
          _color.set(resolveColor(ch, voxel3d.colorMap) ?? '#000000')
          mesh.setColorAt(idx, _color)
          idx++
        }
      }
    }
    mesh.count = idx
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [voxel3d])

  return <instancedMesh ref={meshRef} args={[geo, mat, MAX_INSTANCES]} />
}

function AdaptiveCamera3D({ voxel3d }: { voxel3d: Voxel3DGrid }) {
  const { camera } = useThree()
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    const w = voxel3d.layers[0]?.[0]?.length ?? 16
    const h = voxel3d.layers[0]?.length ?? 16
    const d = voxel3d.depth
    const maxDim = Math.max(w, h, d)
    const pad = 1.25
    cam.left = -(maxDim / 2) * pad
    cam.right = (maxDim / 2) * pad
    cam.top = (maxDim / 2) * pad
    cam.bottom = -(maxDim / 2) * pad
    cam.updateProjectionMatrix()
  }, [voxel3d, camera])
  return null
}

export default function VoxelScene(props: VoxelSceneProps) {
  const { dpr, antialias } = useDisplayRenderGlFallback()
  const tilt = props.cameraTilt ?? 0.3

  return (
    <Canvas
      key={`voxel-gl-${dpr}-${antialias}`}
      orthographic
      camera={{ position: [0, 0, 28], near: 0.1, far: 80 }}
      gl={{ antialias }}
      dpr={dpr}
      style={{ width: 320, height: 320, ...props.canvasStyle }}
      className={`pixelated block max-w-full ${props.className ?? ''}`}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(0x020617))
        gl.setPixelRatio(dpr)
      }}
    >
      {props.mode === '3d' ? (
        <>
          <AdaptiveCamera3D voxel3d={props.voxel3d} />
          <group rotation={[tilt, 0, 0]}>
            <VoxelMesh3D voxel3d={props.voxel3d} />
          </group>
        </>
      ) : (
        <>
          <AdaptiveCamera data={props.data} />
          <group rotation={[tilt, 0, 0]}>
            <VoxelMesh data={props.data} colorMap={props.colorMap} />
          </group>
        </>
      )}
      <ambientLight intensity={0.58} />
      <directionalLight color="#ffffff" intensity={0.9} position={[5, 8, 10]} />
      <directionalLight color="#c7d2fe" intensity={0.32} position={[-6, -3, -4]} />
      <OrbitControls /* ... uændret ... */ />
    </Canvas>
  )
}
```

**Vigtigt:** 2D-mode er default — alle eksisterende `<VoxelScene data={...} colorMap={...} />`-kald virker uændret.

### 4.2 Ny fil `src/gem/drawJewelry3d.ts`

```ts
import type { Gem, MetalName, Voxel3DGrid, ColorMap } from '../types'
import { JEWELRY_TEMPLATES } from '../data/jewelryTemplates'
import { METALS } from '../data/metals'
import { darkenColor, lightenColor } from '../data/oreTemplates'
import { resolveColor } from './colorResolver'

/**
 * Bygger 3D voxel-data fra en 2D blueprint-template ved at tilføje dybde-lag.
 *
 * Strategi:
 * - Lag 0 (Z=0, forrest): fuld template — alle pixels.
 * - Lag 1 (Z=1, midt): kun metal-pixels (r/R/s) — gems "stikker ud" forrest.
 * - Lag 2 (Z=2, bagest): kun metal-pixels, ENSARTET char 'B' (mørkere bagside).
 *
 * @param blueprintId - Nøgle til JEWELRY_TEMPLATES.
 * @param gems - 1-3 gems matchende blueprint.gemSlots.
 * @param rimMetal - Metal til ramme.
 * @param depth - Antal Z-lag (default 3).
 */
export function buildJewelryVoxel3d(
  blueprintId: string,
  gems: Gem[],
  rimMetal: MetalName,
  depth: number = 3,
): Voxel3DGrid {
  const tmpl = JEWELRY_TEMPLATES[blueprintId]
  if (!tmpl) {
    throw new Error(`Ukendt blueprint: ${blueprintId}`)
  }
  const baseRim = METALS[rimMetal].pixelColor
  const slotChars = ['g', 'h', 'i'] as const

  const colorMap: ColorMap = {
    r: baseRim,
    R: darkenColor(baseRim, 0.30),
    s: lightenColor(baseRim, 0.25),
    B: darkenColor(baseRim, 0.55),  // bagside
  }
  for (let i = 0; i < gems.length && i < 3; i++) {
    const gem = gems[i]!
    const ch = slotChars[i]
    const raw =
      resolveColor('G', gem.colorMap) ??
      resolveColor('1', gem.colorMap) ??
      resolveColor('D', gem.colorMap) ??
      '#c084fc'
    colorMap[ch] = typeof raw === 'string' && raw.startsWith('#') ? raw : '#c084fc'
  }

  const layers: string[][] = []
  // Lag 0 — forsiden (alt synligt)
  layers.push(tmpl.data.slice())
  // Lag 1+ — kun metal-celler
  for (let z = 1; z < depth; z++) {
    const isBack = z === depth - 1
    const replaceChar = isBack ? 'B' : 'r'
    const layer = tmpl.data.map((row) =>
      row
        .split('')
        .map((c) => (c === 'r' || c === 'R' || c === 's' ? replaceChar : '.'))
        .join('')
    )
    layers.push(layer)
  }

  return { depth, layers, colorMap }
}

/** Antal voxels der vil blive renderet (til pre-validering mod MAX_INSTANCES). */
export function countVoxels(grid: Voxel3DGrid): number {
  let n = 0
  for (const layer of grid.layers) {
    for (const row of layer) {
      for (const c of row) {
        if (c !== '.') n++
      }
    }
  }
  return n
}
```

### 4.3 Ny komponent `src/components/jewelry/JewelryViewer.tsx`

```tsx
import { useMemo } from 'react'
import type { Gem, MetalName } from '../../types'
import { buildJewelryVoxel3d } from '../../gem/drawJewelry3d'
import VoxelScene from '../VoxelScene'

type Props = {
  blueprintId: string
  gems: Gem[]
  rimMetal: MetalName
  className?: string
  /** Lidt højere tilt til at fremhæve dybde. */
  tilt?: number
}

export default function JewelryViewer({ blueprintId, gems, rimMetal, className, tilt = 0.45 }: Props) {
  const voxel3d = useMemo(
    () => buildJewelryVoxel3d(blueprintId, gems, rimMetal),
    [blueprintId, gems, rimMetal]
  )
  return (
    <VoxelScene
      mode="3d"
      voxel3d={voxel3d}
      className={className}
      cameraTilt={tilt}
      canvasStyle={{ width: '100%', height: '100%' }}
    />
  )
}
```

**Sprint 3 DoD:**
- [ ] `VoxelScene` accepterer både 2D og 3D props uden runtime-fejl
- [ ] Eksisterende `GemViewer` og `ItemPreviewModal` virker uændret (snapshot test)
- [ ] `<JewelryViewer blueprintId="cluster_ring" gems={[g1,g2,g3]} rimMetal="Guld" />` viser 3D-smykke
- [ ] `countVoxels()` for alle 25 templates × 3 lag < 1024 (CI-test)
- [ ] FPS-test: rotation kører ≥30 FPS på low-end laptop (manuelt valideret)

---

## 5. SPRINT 4 — Workshop UI

**Mål:** Spilleren kan vælge blueprint fra dropdown, se 2D + 3D preview, og crafte med multi-gem.
**Estimat:** 1 arbejdsdag · ~250 linjer ændret.

### 5.1 Ny `CRAFT_JEWELRY_V2`-action i `src/lib/gameState.ts`

```ts
| { type: 'CRAFT_JEWELRY_V2'; blueprintId: string; gemIds: string[]; essenceId?: string }
```

**Reducer-implementation** (skitse — Composer 2 udfylder fuldt):

```ts
case 'CRAFT_JEWELRY_V2': {
  const bp = findBlueprint(action.blueprintId)
  if (!bp) return state
  if (!state.unlockedBlueprints.includes(bp.id)) {
    return { ...state, gameNotice: 'Blueprint ikke låst op.' }
  }
  if (state.level < bp.requires.level) {
    return { ...state, gameNotice: `Kræver level ${bp.requires.level}.` }
  }
  if (action.gemIds.length !== bp.gemSlots) {
    return { ...state, gameNotice: `Vælg præcis ${bp.gemSlots} ædelsten.` }
  }
  const gems = action.gemIds.map((id) => state.gems.find((g) => g.id === id)).filter(Boolean) as Gem[]
  if (gems.length !== action.gemIds.length) {
    return { ...state, gameNotice: 'En eller flere ædelsten findes ikke.' }
  }
  for (const g of gems) {
    if (g.purity < bp.requires.gemPurityMin) {
      return { ...state, gameNotice: `Mindst én sten har for lav renhed (${bp.requires.gemPurityMin}+ kræves).` }
    }
    if ((bp.requires.gemMagicMin ?? 0) > g.magicProperties.length) {
      return { ...state, gameNotice: `Mindst én sten mangler magi (${bp.requires.gemMagicMin}+ kræves).` }
    }
  }
  // Ingot-tjek (samme mønster som CRAFT_JEWELRY)
  // Essens-tjek (kun aetherMote → +10% guld)
  // Forbrug ingots, gems, essens
  // Byg pixelItem + voxelData
  const rimMetal = primaryMetalForBlueprint(bp)
  const pixelItem = makeJewelryPixelItemV2(bp.id, gems, rimMetal)
  const voxelData = buildJewelryVoxel3d(bp.id, gems, rimMetal)
  const piece: Jewelry = {
    id: `jewelry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    blueprintId: bp.id,
    recipeId: bp.id, // bagudkompat
    name: bp.name,
    gemsUsed: gems.map((g) => ({ id: g.id, name: g.name })),
    gemUsed: { id: gems[0]!.id, name: gems[0]!.name }, // legacy-felt
    ingotsUsed: blueprintIngotRequirements(bp),
    goldValue: Math.floor(bp.goldValue * goldMult),
    reputationValue: bp.reputation,
    pixelItem,
    voxelData,
    timestamp: timestampNow(),
  }
  // ... commit til state ...
}
```

**Hjælpefunktioner** (i `src/data/jewelry.ts`):

```ts
export function blueprintIngotRequirements(bp: Blueprint): { metalName: MetalName; quantity: number }[] {
  return (Object.entries(bp.requires.ingot) as [MetalName, number][])
    .filter(([, q]) => q > 0)
    .map(([metalName, quantity]) => ({ metalName, quantity }))
}

export function primaryMetalForBlueprint(bp: Blueprint): MetalName {
  const entries = blueprintIngotRequirements(bp)
  if (entries.length === 0) return 'Kobber'
  entries.sort((a, b) => METALS[b.metalName].goldBonus - METALS[a.metalName].goldBonus)
  return entries[0]!.metalName
}
```

### 5.2 UI-opdatering i `JewelryWorkshopScreen.tsx`

Erstat `<select>` med blueprint-katalog, der filtrerer på `state.unlockedBlueprints`. Tilføj preview-tab (2D / 3D).

```tsx
// Skitseret struktur — Composer 2 udfylder.
const [previewMode, setPreviewMode] = useState<'2d' | '3d'>('2d')
const [selectedGemIds, setSelectedGemIds] = useState<string[]>([])
const blueprint = findBlueprint(blueprintId)

const unlockedBlueprints = useMemo(
  () => BLUEPRINTS.filter((b) => state.unlockedBlueprints.includes(b.id)),
  [state.unlockedBlueprints]
)

// Render:
// - <select> over unlockedBlueprints, grupperet pr. category
// - For hvert af blueprint.gemSlots: en gem-vælger filtreret på blueprint.requires
// - Preview-panel:
//   {previewMode === '2d' && <PixelItemCard item={previewPixelItem} ... />}
//   {previewMode === '3d' && <JewelryViewer blueprintId={...} gems={...} rimMetal={...} />}
// - Craft-knap → CRAFT_JEWELRY_V2
```

**Sprint 4 DoD:**
- [ ] Workshop viser kun blueprints fra `unlockedBlueprints`
- [ ] Multi-gem (2-3 sten) vælges via separate dropdowns
- [ ] 2D/3D-preview-toggle skifter live ved valg
- [ ] `CRAFT_JEWELRY_V2` valideres: alle gems opfylder `requires`
- [ ] Eksisterende `CRAFT_JEWELRY` (legacy) virker stadig (ikke fjernet endnu)

---

## 6. SPRINT 5 — Shop & Unlock

**Mål:** Spilleren kan købe blueprints i butikken; achievement/loot kan også låse op.
**Estimat:** 1 arbejdsdag · ~350 linjer ny + 100 ændret.

### 6.1 Tilføj `'blueprints'` til `ShopTabId` i `src/data/shop.ts`

```ts
export type ShopTabId = 'pickaxes' | 'smelter' | 'consumables' | 'inventory' | 'charms' | 'blueprints' | 'sell'

export const SHOP_TAB_LABELS: Record<ShopTabId, string> = {
  pickaxes: 'Hakker',
  smelter: 'Smelter',
  consumables: 'Forbrug',
  inventory: 'Lager',
  charms: 'Charms',
  blueprints: '💍 Blueprints',
  sell: '💰 Sælg',
}
```

### 6.2 Ny komponent `src/components/jewelry/BlueprintShopTab.tsx`

```tsx
// Strukturskelet:
// 1. Kategori-filter: [Alle] [Ringe] [Halskæder] [Øreringe] [Armbånd] [Brocher] [Headpieces] [Amuletter]
// 2. Grid af BlueprintCard'er for category-matchende, sorteret på minLevel
// 3. Hver card viser:
//    - lille 2D pixel-preview (renderet med default rubin + kobber for at vise formen)
//    - navn, kategori-ikon
//    - krav (lvl, ingot, gemPurityMin)
//    - shopPrice + Køb-knap
//    - Status: "Ejet" / "Lvl X kræves" / "Køb (Y g)" / "Låses op via [achievement/loot]"
```

### 6.3 Nye actions i `src/lib/gameState.ts`

```ts
| { type: 'BUY_BLUEPRINT'; blueprintId: string }
| { type: 'UNLOCK_BLUEPRINT'; blueprintId: string }  // intern, kaldes af loot/achievement
```

**Reducer-implementation:**

```ts
case 'BUY_BLUEPRINT': {
  const bp = findBlueprint(action.blueprintId)
  if (!bp) return state
  if (bp.unlockMethod !== 'shop') {
    return { ...state, gameNotice: 'Dette blueprint kan ikke købes.' }
  }
  if (state.unlockedBlueprints.includes(bp.id)) {
    return { ...state, gameNotice: 'Du ejer allerede dette blueprint.' }
  }
  if (state.level < bp.requires.level) {
    return { ...state, gameNotice: `Kræver level ${bp.requires.level}.` }
  }
  if (state.gold < bp.shopPrice) {
    return { ...state, gameNotice: 'Ikke nok guld.' }
  }
  return {
    ...state,
    gold: state.gold - bp.shopPrice,
    unlockedBlueprints: [...state.unlockedBlueprints, bp.id],
    gameNotice: null,
  }
}

case 'UNLOCK_BLUEPRINT': {
  if (state.unlockedBlueprints.includes(action.blueprintId)) return state
  return {
    ...state,
    unlockedBlueprints: [...state.unlockedBlueprints, action.blueprintId],
  }
}
```

### 6.4 Tilføj tab-rendering i `ShopScreen.tsx`

```tsx
{tab === 'blueprints' && (
  <BlueprintShopTab state={state} dispatch={dispatch} />
)}
```

**Sprint 5 DoD:**
- [ ] `BlueprintShopTab` viser alle blueprints med korrekt status
- [ ] Køb fjerner guld og tilføjer til `unlockedBlueprints`
- [ ] Blueprints med `unlockMethod !== 'shop'` viser "Lås op via ..."-besked, ikke købsknap
- [ ] Workshop opdaterer automatisk når nyt blueprint købes (test via React DevTools)
- [ ] `playGoldSpend()` afspiller ved køb

---

## 7. SPRINT 6 — Polish, Detail Modal, Achievements & Loot

**Mål:** Inventory-modal, "Master Jeweler"-achievement, mine-loot, balance.
**Estimat:** 1-2 arbejdsdage · ~400 linjer.

### 7.1 `src/components/jewelry/JewelryDetailModal.tsx` (NY)

```tsx
// Wrapper omkring ItemPreviewModal med:
// - 3D rotation via JewelryViewer
// - Tabs: 3D | 2D | Stats
// - Stats viser: blueprint-navn, alle gems brugt, ingredients, goldValue, reputationValue
// - "Sælg"-knap → dispatch SELL_JEWELRY
```

Kald fra `JewelryWorkshopScreen` ("Dine smykker"-listen) og fra inventory.

### 7.2 Tilføj "Master Jeweler"-achievement i `src/data/achievements.ts`

```ts
{
  id: 'master_jeweler',
  title: 'Mester-juveler',
  description: 'Lav 10 smykker totalt.',
  icon: '👑',
  check: (s) => s.jewelry.length >= 10,
},
```

**Hook achievement → blueprint-unlock** i `src/lib/unlocks.ts` eller dedikeret modul:

```ts
// Når master_jeweler tilføjes til achievementsUnlocked,
// dispatch UNLOCK_BLUEPRINT for 'tiara'.
// Gøres ved at udvide reducer-flowet for UNLOCK_ACHIEVEMENTS:

case 'UNLOCK_ACHIEVEMENTS': {
  if (action.ids.length === 0) return state
  const set = new Set([...state.achievementsUnlocked, ...action.ids])
  let next = { ...state, achievementsUnlocked: [...set].sort() }
  // Achievement → blueprint mapping
  if (action.ids.includes('master_jeweler') && !next.unlockedBlueprints.includes('tiara')) {
    next = { ...next, unlockedBlueprints: [...next.unlockedBlueprints, 'tiara'] }
  }
  return next
}
```

### 7.3 Mine-loot integration i `src/gem/mining.ts`

Udvid `MineDrop`-typen:

```ts
export type MineDrop =
  | { kind: 'ore'; ore: RawOre }
  | { kind: 'nugget'; nugget: MetalNugget }
  | { kind: 'rough-stone'; stone: RoughStone }
  | { kind: 'gem'; gem: Gem }
  | { kind: 'chest'; gold: number; tier: ChestTier }
  | { kind: 'blueprint'; blueprintId: string }   // NYT
  | { kind: 'nothing' }
```

**Drop-rates** (kun fra specifikke områder):
- `mithrilbjerget` chest (gold tier): 5% chance for `celestial_pendant`
- `rune-dybet` chest (gold tier): 3% chance for `dragonscale_bracelet`

I `MineScreen.tsx`, ved drop:
```ts
if (drop.kind === 'blueprint') {
  dispatch({ type: 'UNLOCK_BLUEPRINT', blueprintId: drop.blueprintId })
  // Vis toast: "Du fandt et blueprint: [navn]!"
}
```

### 7.4 Lazy voxelData-generering for legacy-smykker

Eksisterende smykker (fra v9-saves) har ingen `voxelData`. Når de åbnes i `JewelryDetailModal`:

```tsx
const voxel3d = useMemo(() => {
  if (jewelry.voxelData) return jewelry.voxelData
  const gems = jewelry.gemsUsed.map((g) => /* lookup eller fake */)
  return buildJewelryVoxel3d(jewelry.blueprintId, gems, primaryMetalUsed(jewelry))
}, [jewelry])
```

### 7.5 Balance-justering

Kør playtest og juster `shopPrice`, `goldValue`, `requires.level` i `blueprints.ts`. Gem ændringer i Sprint 6 commit.

**Sprint 6 DoD:**
- [ ] `JewelryDetailModal` virker både fra workshop og fra inventory
- [ ] "Mester-juveler" achievement låser op for `tiara`
- [ ] Mine-loot kan droppe `celestial_pendant` og `dragonscale_bracelet`
- [ ] Toast vises ved blueprint-drop
- [ ] Legacy v9-smykker viser 3D-preview korrekt (lazy generering)

---

## 8. Filer der IKKE røres (verificeret)

Følgende filer kræver INGEN ændringer i hele projektet:

```
src/gem/draw2d.ts                     ← drawGem() bruges 1:1
src/gem/colorResolver.ts              ← resolveColor() bruges 1:1
src/gem/generate.ts                   ← gem-generering uændret
src/gem/crafting.ts                   ← gem-crafting uændret
src/data/templates.ts                 ← gem-templates uændret
src/data/palettes.ts                  ← farve-paletter uændret
src/data/oreTemplates.ts              ← lightenColor/darkenColor genbruges
src/data/metals.ts                    ← uændret
src/components/GemCard.tsx            ← uændret
src/components/GemViewer.tsx          ← uændret (bruger 2D-mode i VoxelScene)
src/components/PixelItemCard.tsx      ← uændret
src/components/inventory/*            ← uændret (bortset fra ItemPreviewModal-link)
src/components/mine/*                 ← uændret (bortset fra MineScreen drop-handling)
src/lib/displayRenderSettings.ts      ← uændret
```

---

## 9. Konsoliderede risici og mitigering

| Risiko | Sandsynlighed | Impact | Mitigering | Sprint |
|---|---|---|---|---|
| `VoxelScene` 3D-udvidelse bryder eksisterende GemViewer | Medium | Høj | Diskrimineret union, default = 2D-mode, snapshot-tests før merge | 3 |
| Voxel-count > MAX_INSTANCES (1024) for tætte grids | Lav | Medium | `countVoxels()` validerer i CI-test for alle 25 × 3 lag | 3 |
| Multi-gem balance-eksplosion (3-slot ringe = OP) | Medium | Medium | Strenge level/purity-krav; playtest i Sprint 6 | 6 |
| Migration v9→v10 brækker eksisterende saves | Lav | Høj | `recipeId` BEVARES, kun additive felter, dedikeret test | 1 |
| 25 unikke 16×16-grids er kunstnerisk svært | Medium | Lav | Genbrug af base-rim/skygge-mønstre; `validateAllTemplates()` | 2 |
| Tiara/headpiece-formater (24×12) bryder kamera | Lav | Lav | `AdaptiveCamera3D` bruger `Math.max(w,h,d)` ikke fast 16 | 3 |
| Blueprint-shop tømmer økonomi tidligt | Lav | Lav | Niveau 1 er gratis (starter), Niveau 2 koster 600-3500g | 5 |
| Performance: 3D-rotation laggy på mobile | Medium | Medium | DPR-fallback (allerede impl); test på low-end device i Sprint 3 | 3 |
| `essenceId: aetherMote` glemmes i CRAFT_JEWELRY_V2 | Lav | Lav | Test-case i Sprint 4 | 4 |
| Mine-loot drop-rate (3-5%) opleves frustrerende lav | Medium | Lav | Justér i Sprint 6 baseret på feedback | 6 |

---

## 10. Definition of Done (samlet)

### Funktionelt
- [ ] 25 unikke blueprints kan vises, vælges og craftes
- [ ] Hver blueprint har unik 2D pixel-art (ingen template-genbrug)
- [ ] Hvert craftet smykke har 3D voxel-preview (ægte Z-akse, ikke flad)
- [ ] Multi-gem (2-3 slots) fungerer med korrekt validering
- [ ] Blueprint-shop med 7 kategorier og level-gating
- [ ] Achievement "Mester-juveler" låser `tiara` op
- [ ] Mine-loot kan droppe `celestial_pendant` (Mithrilbjerget) og `dragonscale_bracelet` (Rune-Dybet)

### Teknisk
- [ ] `npm run typecheck` grøn
- [ ] `npm run test` grøn (inkl. nye migration-tests, validateAllTemplates, snapshot)
- [ ] `npm run lint` grøn
- [ ] Eksisterende v9-saves kan loades uden datatab
- [ ] Eksisterende `CRAFT_JEWELRY` (legacy) virker stadig parallelt
- [ ] `VoxelScene` 2D-mode er bagudkompatibel (eksisterende kald uændret)
- [ ] `MAX_INSTANCES` overstiges ikke for nogen blueprint × 3-lag

### UX
- [ ] 2D/3D preview-toggle fungerer i workshop
- [ ] Locked blueprints viser tydelig "Lås op via ..."-besked
- [ ] Blueprint-køb spiller `playGoldSpend()`
- [ ] Toast ved blueprint-loot-drop
- [ ] Detail modal viser komplet stats (gems, ingredients, gold, rep)
- [ ] 3D auto-rotation pause ved drag, fortsæt ved slip (genbrug eksisterende OrbitControls-mønster)

---

## 11. Composer 2 — Hvor du starter

1. **Læs `src/types.ts`, `src/data/jewelry.ts`, `src/components/VoxelScene.tsx`, `src/lib/gameState.ts`** for fuld kontekst (5 min).
2. **Start Sprint 1** — opret de 4 nye filer og tilføj typerne. Kør `npm run typecheck`.
3. **Verificer** at `migrateGameState`-test grøn før du går videre.
4. **Commit per sprint** med besked: `feat(jewelry): sprint N — [kort beskrivelse]`.
5. **Hvis et 3D-grid clipper** (>1024 voxels), reducer template-tæthed eller `depth: 2`.

---

*Dokumentet er verificeret mod kodebase pr. 6. maj 2026 (commit-snapshot via direct read).*
*Alle filstier eksisterer, alle linjereferencer er live.*
*Plan-version 2.0 — superseder version 1.0.*
