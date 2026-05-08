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

/** D47: oprindelse for hub-/mine-udstyr og run-loot. */
export type LootOrigin = 'hub' | 'mine'

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
  /** D47: hub (shop/smed) vs. mine-fund; default hub. */
  origin?: LootOrigin
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
  origin?: LootOrigin
}

/** Fase 5 (D35): rustning — kun 2D-ikon; bonus til hpMax/manaMax mens durability > 0. */
export type ArmourBonuses = {
  hpMax?: number
  manaMax?: number
}

export type Armour = {
  id: string
  tier: number
  name: string
  durability: number
  maxDurability: number
  bonuses: ArmourBonuses
  pixelItem: PixelItem
  origin?: LootOrigin
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
  | 'alkymistvaerkstedet'
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
  fogColor: '#343448',
  fogNear: 7,
  fogFar: 40,
  ambientColor: '#eef2ff',
  ambientIntensity: 0.52,
  floorColor: '#363028',
  ceilingColor: '#242832',
  wallColor: '#353d4c',
  stalactiteRange: [6, 10],
  stalagmiteRange: [4, 7],
  crystalClusterRange: [8, 15],
  depthFogScale: false,
}

export type Area = {
  id: LocationId
  kind: 'mine' | 'smedje' | 'butik' | 'alkymi' | 'smykke'
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

/** Fase 3: stack af mad/potions i hub- og mine-task (D21). */
export type ConsumableStack = { consumableId: string; quantity: number }

/** Fase 2 (D46): fundet mine-loot der ikke er guld/consumables — tabes ved død hvis ikke reddet. */
export type FoundLootEntry =
  | { kind: 'gem'; gem: Gem; origin: LootOrigin }
  | { kind: 'coal'; quantity: number; origin: LootOrigin }
  | { kind: 'ore'; ore: RawOre; origin: LootOrigin }
  | { kind: 'nugget'; nugget: MetalNugget; origin: LootOrigin }
  | { kind: 'rough_stone'; stone: RoughStone; origin: LootOrigin }
  /** D50: quest-genstand i run-beholdning (samme slot-regler som `questItems`). */
  | { kind: 'quest_item'; questItemId: string; origin: 'mine' }
  /** Udstyr i run-beholdning (MINE_EQUIP_FOUND / kiste senere); `origin` følger D47. */
  | { kind: 'pickaxe_gear'; pickaxe: Pickaxe; origin: LootOrigin }
  | { kind: 'sword_gear'; sword: Sword; origin: LootOrigin }
  | { kind: 'armour_gear'; armour: Armour; origin: LootOrigin }

/** Delmængder af `FoundLootEntry` der kan stables med `tryMergeFoundLootEntries`. */
export type CoalFoundLootEntry = Extract<FoundLootEntry, { kind: 'coal' }>
export type OreFoundLootEntry = Extract<FoundLootEntry, { kind: 'ore' }>
export type NuggetFoundLootEntry = Extract<FoundLootEntry, { kind: 'nugget' }>

/** D50: pladsholder til quest-items (udvides når quest-data findes). */
export type QuestItemEntry = { questItemId: string; origin: 'mine' }

/** D52: af-equippet hub-udstyr under run. */
export type StowedHubGearSlot =
  | { kind: 'pickaxe'; item: Pickaxe }
  | { kind: 'sword'; item: Sword }
  | { kind: 'armour'; item: Armour }

/** Fase 2 (D46): run-beholdning; null udenfor aktiv mine. */
export type RunInventory = {
  foundLoot: FoundLootEntry[]
  rescueBag: FoundLootEntry[]
  rescueBagCapacity: number
  questItems: QuestItemEntry[]
  stowedHubGear: StowedHubGearSlot[]
}

/** Fase 2: hub-beholdning — guld/consumables auto-fredet (D46). */
export type HubInventory = {
  gold: number
  consumables: ConsumableStack[]
  /** Forberedt til senere equipment-instanser; tom i v18. */
  equipment: unknown[]
  materials: Partial<Record<string, number>>
}

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
  hubInventory: HubInventory
  reputation: number

  depth: number
  /** Per-mine dybde rekord (D12); bruges til worldTier sammen med `depth`. */
  unlockedDepths: Partial<Record<LocationId, number>>
  /** Aktiv mine-run med ét lag ad gangen (D1); null uden for minen. */
  mineRun: MineRunState | null
  /** Fase 2 (D46): run-beholdning; kun sat under aktiv mineRun. */
  runInventory: RunInventory | null
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
  /** Fase 5 (D35): ejet rustning; én aktiv via `activeArmourId`. */
  armours: Armour[]
  activeArmourId: string | null

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

  /**
   * v10+: Smykke-blueprint-IDs (køb, achievement, kiste-drop).
   * Planen (§3.6 / Fase 3) kalder konceptuelt `unlockedRecipes` — **samme felt i koden**;
   * Fase 4 brew-/blande-opskrifter har eget felt (`unlockedAlchemyRecipes`) jf. §8b.
   */
  unlockedBlueprints: string[]

  /** Fase 4: låste alkymi-opskrifter (`AlchemyRecipeDef.id`); ikke smykke-blueprints. */
  unlockedAlchemyRecipes: string[]

  essences: EssenceStack[]

  /** Værksteds-hylde: antal til salg pr. consumable-id (D39 restock efter run). */
  workshopStock: Partial<Record<string, number>>
  /** D48: max pladser i redningspose (persist mellem runs; synk. med `runInventory.rescueBagCapacity` i minen). */
  rescueBagCapacity: number
  /** D64: in-game dag (avancerer ved valid run-exit). */
  day: number
  /** D65: sidste dag værksted fik default-restok. */
  lastRestockDay: number
  /** Fase 3 (D33): hurtigtaster 1–3 binder consumable-id pr. slot. */
  consumableQuickSlots: [string | null, string | null, string | null]

  /** Fase 1.5 survival (D15, D38): HP/mana i minen; regen uden for aktiv mine-run (D16). */
  playerHp: number
  playerHpMax: number
  playerMana: number
  /** Afledt af neutral baseline eller aktiv brew (D38); holdes synk. via `clampPlayerSurvival` / brew-skift. */
  playerManaMax: number
  /** Fase 4 (D36): aktiv brew i minen; hub-regen nulstiller til `null`. */
  activeBrewId: string | null

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
