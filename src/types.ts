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

export type Area = {
  id: LocationId
  kind: 'mine' | 'smedje' | 'butik' | 'smykke'
  name: string
  icon: string
  description: string
  unlockedByDefault: boolean
  metalPool?: { metal: MetalName; weight: number }[]
  depthMultiplier: number
  rarityBonus: number
  requirement?: {
    level?: number
    reputation?: number
    gold?: number
  }
}

export type ActiveEffect = { id: string; expiresAt?: number; chargesLeft?: number }

export type EssenceStack = { essenceId: string; quantity: number }

export type Jewelry = {
  id: string
  recipeId: string
  name: string
  gemUsed: { id: string; name: string }
  ingotsUsed: { metalName: MetalName; quantity: number }[]
  goldValue: number
  reputationValue: number
  pixelItem: PixelItem
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

export type RockType = 'normal' | 'hard' | 'rich' | 'crystal' | 'chest'

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
  /** Antal ædelsten fundet eller skåret i alt. */
  totalGemsFound: number
  /** Livsvarigt antal essenser modtaget (mined, smelt, køb). */
  totalEssencesCollected: number
  /** Låste præstation-id'er (persist). */
  achievementsUnlocked: string[]
  activePickaxeId: string
  pickaxes: Pickaxe[]

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

  essences: EssenceStack[]

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
