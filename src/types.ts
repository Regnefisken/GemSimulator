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

// Bronze er en LEGERING — den kan eksistere som ingot (lavet i AlloyStation)
// og som inklusion i ædelsten, men aldrig som rå malm eller metalklump fra mining.
export const MINEABLE_METALS: MetalName[] = [
  'Tin',
  'Kobber',
  'Jern',
  'Sølv',
  'Guld',
  'Mithril',
  'Runestål',
]
export const ALLOY_ONLY_METALS: MetalName[] = ['Bronze']

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
export type Jewelry = { id: string }
export type SmeltingJob = {
  id: string
  metalName: MetalName
  startedAt: number
  timeMs: number
  source: 'ore' | 'nugget'
  inputUsed: number
}

export type ViewMode = 'map' | 'location'

export type GameState = {
  level: number
  xp: number
  gold: number
  reputation: number

  depth: number
  totalGemsFound: number
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

  jewelry: Jewelry[]

  /** Kort bruger-feedback fra reducer (fx fuldt lager); nulstilles af UI. */
  gameNotice: string | null

  version: number
}

export type Palette = { name: string; colorMap: ColorMap }
export type Template = { shapeName: string; data: string[] }
