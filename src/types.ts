import type { MineRunState } from './lib/mineTypes'

/**
 * Grid-tegn til ædelsten-pixeldata (ColorMap nøgler):
 * | Char | Betydning              | Pligtig | Fallback hvis mangler i palette |
 * |------|------------------------|---------|----------------------------------|
 * | .    | Tom (transparent)      | —       | —                                |
 * | O    | Outer rim (silhuet)    | Ja      | —                                |
 * | D    | Dark (skyggefacet)     | Ja      | —                                |
 * | G    | Gem base               | Ja      | —                                |
 * | L    | Light (lysfacet)       | Ja      | —                                |
 * | W    | White / sparkle        | Ja      | —                                |
 * | 1–3  | Metal-inklusion slot   | Kun metal | Skip celle                     |
 * | X    | Guld-inklusion         | Kun guld  | Skip celle                     |
 * | P    | Pattern / sekundær base| Nej     | G                                |
 * | V    | Vein / åre             | Nej     | L                                |
 * | S    | Star / asterism        | Nej     | W                                |
 * | C    | Crack / fraktur        | Nej     | O                                |
 */
export type ColorMap = Record<string, string>

export type MagicProperty = {
  name: string
  icon: string
  color: string
  glow: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
}

export type MetalName =
  | 'Tin'
  | 'Kobber'
  | 'Jern'
  | 'Bronze'
  | 'Sølv'
  | 'Guld'
  | 'Mithril'
  | 'Runestål'
  | 'Titanium'
  | 'Platin'
  | 'Orichalcum'
  | 'Elektrum'

export const MINEABLE_METALS: MetalName[] = [
  'Tin',
  'Kobber',
  'Jern',
  'Sølv',
  'Titanium',
  'Guld',
  'Platin',
  'Mithril',
  'Runestål',
]

export const ALLOY_ONLY_METALS: MetalName[] = ['Bronze', 'Orichalcum', 'Elektrum']

export type MetalInclusion = {
  name: MetalName
  icon: string
  pixelColor: string
  goldBonus: number
  effect: string
}

export type Gem = {
  id: string
  name: string
  shapeName: string
  paletteName: string
  purity: number
  karat: number | null
  data: string[]
  colorMap: ColorMap
  timestamp: string
  isGodTier: boolean
  metalInclusions: MetalInclusion[]
  magicProperties: MagicProperty[]
  goldValue: number
}

export type PixelItem = {
  data: string[]
  colorMap: ColorMap
}

export type RawOre = {
  metalName: MetalName
  quantity: number
  pixelItem: PixelItem
}

export type MetalNugget = {
  metalName: MetalName
  quantity: number
  pixelItem: PixelItem
}

export type MetalIngot = {
  metalName: MetalName
  quantity: number
  pixelItem: PixelItem
}

export type RoughStone = {
  id: string
  paletteName: string
  quality: 'crude' | 'fine' | 'pristine'
  pixelItem: PixelItem
}

export type Pickaxe = {
  id: string
  tier: number
  name: string
  damage: number
  durability: number
  maxDurability: number
  pixelItem: PixelItem
}

/** Fase 2: sværd til mob-combat (D27); separat tier-ladder fra hakke. */
export type Sword = {
  id: string
  tier: number
  name: string
  damage: number
  durability: number
  maxDurability: number
  pixelItem: PixelItem
}

export type EquippedWeaponKind = 'pickaxe' | 'sword'

export type LocationId =
  | 'kobbermine'
  | 'jernkloeften'
  | 'soelvhulen'
  | 'guldgrotten'
  | 'mithrilbjerget'
  | 'rune-dybet'
  | 'smedjen'
  | 'butikken'
  | 'smykkevaerkstedet'

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

/** Fallback for miner uden `caveConfig` — matcher legacy statisk grotte. */
export const DEFAULT_CAVE_CONFIG: CaveConfig = {
  oreSlots: [
    [5, 0.48, -2],
    [-4.2, 0.48, 4.5],
    [1.2, 0.48, -6.5],
    [-6.2, 0.48, -3],
    [6.5, 0.48, 5],
  ],
  bounds: 9,
  fogColor: '#222230',
  fogNear: 6,
  fogFar: 34,
  ambientColor: '#e8ecff',
  ambientIntensity: 0.3,
  floorColor: '#2a241c',
  ceilingColor: '#181c26',
  wallColor: '#252b36',
  stalactiteRange: [6, 10],
  stalagmiteRange: [4, 7],
  crystalClusterRange: [8, 15],
  depthFogScale: false,
}

export type Area = {
  id: LocationId
  kind: 'mine' | 'smedje' | 'butik' | 'smykke'
  name: string
  icon: string
  image?: string
  description: string
  unlockedByDefault: boolean
  metalPool?: { metal: MetalName; weight: number }[]
  depthMultiplier: number
  rarityBonus: number
  caveConfig?: CaveConfig
  requirement?: {
    level?: number
    reputation?: number
    gold?: number
  }
}

export function getCaveConfig(area: Area): CaveConfig {
  return area.caveConfig ?? DEFAULT_CAVE_CONFIG
}

export type ActiveEffect = { id: string; expiresAt?: number; chargesLeft?: number }

export type EssenceStack = { essenceId: string; quantity: number }

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
 */
export type Voxel3DGrid = {
  /** Antal Z-lag (typisk 3). */
  depth: number
  /** layers.length === depth. Alle layers har samme bredde/højde. */
  layers: string[][]
  colorMap: ColorMap
}

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

export type SmeltingJob = {
  id: string
  metalName: MetalName
  startedAt: number
  timeMs: number
  source: 'ore' | 'nugget'
  inputUsed: number
}

export type ViewMode = 'map' | 'location'

export type RockType = 'normal' | 'hard' | 'rich' | 'crystal' | 'chest' | 'mob'

export type ChestTier = 'wood' | 'silver' | 'gold'

export type RockEvent = {
  type: RockType
  /** HP-multiplikator ift. normal rockHpForDepth(). Chest = 0 (ingen HP). */
  hpMultiplier: number
  /** Kun når `type === 'chest'`. */
  chestTier?: ChestTier
}

export type GameState = {
  level: number
  xp: number
  gold: number
  reputation: number

  depth: number
  /** Per-mine dybde rekord (D12); bruges til worldTier sammen med `depth`. */
  unlockedDepths: Partial<Record<LocationId, number>>
  /** Aktiv mine-run med ét lag ad gangen (D1); null uden for minen. */
  mineRun: MineRunState | null
  /** Kul fra klippe-mining (Fase 1); senere smedje-repair. */
  coal: number
  /** Livsvarigt antal ryddede klippe-felter (præstationer). */
  totalRockSlotsCleared: number
  /** Antal ædelsten fundet eller skåret i alt. */
  totalGemsFound: number
  /** Livsvarigt antal smykker smedet (V1 + V2). Bruges til præstationer. */
  totalJewelryCrafted: number
  /** Livsvarigt antal essenser modtaget (mined, smelt, køb). */
  totalEssencesCollected: number
  /** Låste præstation-id'er (persist). */
  achievementsUnlocked: string[]
  activePickaxeId: string
  pickaxes: Pickaxe[]
  /** Fase 2 (D23, D27): aktivt våben i minen — hakke til klipper, sværd til mobs. */
  equippedWeapon: EquippedWeaponKind
  activeSwordId: string | null
  swords: Sword[]

  gems: Gem[]
  roughStones: RoughStone[]
  rawOre: RawOre[]
  metalNuggets: MetalNugget[]
  metalIngots: MetalIngot[]

  inventoryCapacity: { gems: number; materials: number; tools: number }

  smelterTier: number
  smeltingJobs: SmeltingJob[]

  viewMode: ViewMode
  currentArea: LocationId
  unlockedLocations: LocationId[]

  activeCharms: string[]
  activeEffects: ActiveEffect[]

  /** Næste klippe i minen knuses i ét hug (Dynamit). */
  instantBreakNextRock: boolean
  /** Lægges oven i renhed ved næste slibning fra rå klippe (Slibesten). */
  roughCraftPurityBonus: number

  jewelry: Jewelry[]

  /** v10+: Blueprint-IDs som spilleren har låst op (køb, achievement, drop). */
  unlockedBlueprints: string[]

  essences: EssenceStack[]

  /** Fase 1.5 survival (D15, D38): HP/mana i minen; regen uden for aktiv mine-run (D16). */
  playerHp: number
  playerHpMax: number
  playerMana: number
  /** I MVP = `NEUTRAL_MANA_MAX`; senere brew (D38). */
  playerManaMax: number

  /** Kort bruger-feedback fra reducer (fx fuldt lager); nulstilles af UI. */
  gameNotice: string | null

  version: number
}

export type PaletteCategory = 'classic' | 'neon' | 'pastel' | 'gradient' | 'metallic'
export type PaletteEffectTag =
  | 'iridescent'
  | 'opalescent'
  | 'starry'
  | 'banded'
  | 'veined'
  | 'cracked'
  | 'chatoyant'

export type Palette = {
  name: string
  category: PaletteCategory
  colorMap: ColorMap
  effectTags?: PaletteEffectTag[]
}

export type Template = { shapeName: string; data: string[] }
