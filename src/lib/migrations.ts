import type { GameState, Gem, MagicProperty, MetalInclusion, Pickaxe, LocationId } from '../types'
import { makePickaxe } from '../data/pickaxes'
import { blueprintFromLegacyRecipeId, migrateJewelry } from '../data/jewelry'
import { STARTER_BLUEPRINT_IDS } from '../data/blueprints'
import { METALS } from '../data/metals'
import { PALETTES } from '../data/palettes'
import { computeGoldValue } from '../gem/generate'
import { deriveGemName } from '../gem/naming'
import { computeWorldTier } from './worldTier'

export const CURRENT_STATE_VERSION = 12

const MINE_LOCATION_IDS: LocationId[] = [
  'kobbermine',
  'jernkloeften',
  'soelvhulen',
  'guldgrotten',
  'mithrilbjerget',
  'rune-dybet',
]

/** @deprecated Brug METALS.Guld — bevares for ældre saves der refererer til feltet. */
export const GOLD_DEFAULT_INCLUSION: MetalInclusion = { ...METALS.Guld, icon: '✦', effect: 'Guldåre' }

const PALETTE_NAME_SET = new Set(PALETTES.map((p) => p.name))

const LEGACY_MAGIC_PREFIXES = [
  'Naturens ',
  'Flamme-',
  'Frost-',
  'Lyn-',
  'Gift-',
  'Liv-',
  'Sjæle-',
  'Tids-',
  'Aske-',
].sort((a, b) => b.length - a.length)

function inferLegacyShapePalette(
  name: string,
  storedShape?: unknown,
  storedPalette?: unknown,
): { shapeName: string; paletteName: string } {
  if (typeof storedShape === 'string' && storedShape && typeof storedPalette === 'string' && storedPalette) {
    return { shapeName: storedShape, paletteName: storedPalette }
  }
  const head = name.split(' med ')[0]?.trim() ?? name
  let s = head.replace(/^Guddommelig\s+/, '').replace(/^(Klar|Uplettet)\s+/, '')
  s = s.replace(/^\d+K-/, '')
  for (const p of LEGACY_MAGIC_PREFIXES) {
    if (s.startsWith(p)) {
      s = s.slice(p.length)
      break
    }
  }
  s = s.trim()
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    const last = words[words.length - 1]!
    if (PALETTE_NAME_SET.has(last)) {
      return { shapeName: words.slice(0, -1).join(' '), paletteName: last }
    }
  }
  if (words.length === 1 && PALETTE_NAME_SET.has(words[0]!)) {
    return { shapeName: 'Brilliant', paletteName: words[0]! }
  }
  const last = words[words.length - 1] ?? 'Rubin'
  const pal = PALETTE_NAME_SET.has(last) ? last : 'Rubin'
  const shape =
    words.length > 1 && pal === last ? words.slice(0, -1).join(' ') : words.filter((w) => w !== pal).join(' ')
  return { shapeName: shape || 'Brilliant', paletteName: pal }
}

export function migrateGem(raw: unknown): Gem {
  if (!raw || typeof raw !== 'object') {
    throw new Error('migrateGem: invalid raw gem')
  }
  const r = raw as Record<string, unknown>
  const {
    hasGoldInclusions,
    magicProperty,
    metalInclusions: mi,
    magicProperties: mp,
    goldValue: gv,
    ...rest
  } = r

  const hasGold = Boolean(hasGoldInclusions)
  const oldMagic = magicProperty as MagicProperty | null | undefined

  const base = rest as Partial<Gem>

  const colorMap = base.colorMap && typeof base.colorMap === 'object' ? (base.colorMap as Gem['colorMap']) : {}

  let metalInclusions: MetalInclusion[] = Array.isArray(mi)
    ? (mi as MetalInclusion[]).map((inc) => {
        const def = METALS[inc.name]
        if (!def) return inc
        return {
          ...def,
          ...inc,
          goldBonus: def.goldBonus,
          pixelColor: inc.pixelColor || def.pixelColor,
        }
      })
    : hasGold
      ? [{ ...METALS.Guld, pixelColor: (colorMap.X as string) || METALS.Guld.pixelColor }]
      : []

  const rawName = String(base.name ?? 'Ædelsten')
  const taxonomy = inferLegacyShapePalette(rawName, base.shapeName, base.paletteName)

  const gem: Gem = {
    id: String(base.id ?? `${Date.now()}-migrated`),
    name: rawName,
    shapeName: taxonomy.shapeName,
    paletteName: taxonomy.paletteName,
    purity: typeof base.purity === 'number' ? base.purity : 2,
    karat: base.karat === null || typeof base.karat === 'number' ? base.karat : null,
    data: Array.isArray(base.data) ? (base.data as string[]) : [],
    colorMap,
    timestamp: String(base.timestamp ?? ''),
    isGodTier: Boolean(base.isGodTier),
    metalInclusions,
    magicProperties: Array.isArray(mp)
      ? (mp as MagicProperty[])
      : oldMagic
        ? [oldMagic]
        : [],
    goldValue: typeof gv === 'number' ? gv : 0,
  }

  gem.name = deriveGemName(gem)

  if (!gem.goldValue || gem.goldValue < 1) {
    gem.goldValue = computeGoldValue(gem, 0)
  }

  return gem
}

function migratePickaxe(raw: unknown, fallback: Pickaxe): Pickaxe {
  if (!raw || typeof raw !== 'object') return fallback
  const p = raw as Pickaxe
  return {
    id: typeof p.id === 'string' ? p.id : fallback.id,
    tier: typeof p.tier === 'number' ? p.tier : fallback.tier,
    name: typeof p.name === 'string' ? p.name : fallback.name,
    damage: typeof p.damage === 'number' ? p.damage : fallback.damage,
    durability: typeof p.durability === 'number' ? p.durability : fallback.durability,
    maxDurability: typeof p.maxDurability === 'number' ? p.maxDurability : fallback.maxDurability,
    pixelItem:
      p.pixelItem &&
      Array.isArray((p.pixelItem as PixelItemLike).data) &&
      (p.pixelItem as PixelItemLike).data.length > 0 &&
      (p.pixelItem as PixelItemLike).colorMap &&
      typeof (p.pixelItem as PixelItemLike).colorMap === 'object'
        ? p.pixelItem
        : fallback.pixelItem,
  }
}

type PixelItemLike = { data: string[]; colorMap: Record<string, string> }

export function migrateGameState(raw: unknown, base: GameState): GameState {
  if (!raw || typeof raw !== 'object') {
    return { ...base }
  }

  const r = raw as Record<string, unknown>
  const version = typeof r.version === 'number' ? r.version : 0

  const pickaxesRaw = r.pickaxes
  const pickaxes = Array.isArray(pickaxesRaw)
    ? pickaxesRaw.map((p, i) => migratePickaxe(p, base.pickaxes[i] ?? base.pickaxes[0]))
    : base.pickaxes

  const gemsRaw = r.gems
  const gems = Array.isArray(gemsRaw) ? gemsRaw.map(migrateGem) : base.gems

  const jewelryRaw = r.jewelry
  const jewelry = Array.isArray(jewelryRaw) ? jewelryRaw.map(migrateJewelry) : base.jewelry

  const next: GameState = {
    ...base,
    ...r,
    level: typeof r.level === 'number' ? r.level : base.level,
    xp: typeof r.xp === 'number' ? r.xp : base.xp,
    gold: typeof r.gold === 'number' ? r.gold : base.gold,
    reputation: typeof r.reputation === 'number' ? r.reputation : base.reputation,
    depth: typeof r.depth === 'number' ? r.depth : base.depth,
    unlockedDepths:
      r.unlockedDepths &&
      typeof r.unlockedDepths === 'object' &&
      !Array.isArray(r.unlockedDepths)
        ? { ...(r.unlockedDepths as GameState['unlockedDepths']) }
        : base.unlockedDepths,
    mineRun:
      r.mineRun && typeof r.mineRun === 'object'
        ? (r.mineRun as GameState['mineRun'])
        : base.mineRun,
    coal: typeof r.coal === 'number' ? r.coal : base.coal,
    totalRockSlotsCleared:
      typeof r.totalRockSlotsCleared === 'number' ? r.totalRockSlotsCleared : base.totalRockSlotsCleared,
    totalGemsFound: typeof r.totalGemsFound === 'number' ? r.totalGemsFound : base.totalGemsFound,
    totalJewelryCrafted:
      typeof r.totalJewelryCrafted === 'number' ? r.totalJewelryCrafted : base.totalJewelryCrafted,
    totalEssencesCollected:
      typeof r.totalEssencesCollected === 'number' ? r.totalEssencesCollected : base.totalEssencesCollected,
    achievementsUnlocked: Array.isArray(r.achievementsUnlocked)
      ? (r.achievementsUnlocked as unknown[]).filter((x): x is string => typeof x === 'string')
      : base.achievementsUnlocked,
    activePickaxeId: typeof r.activePickaxeId === 'string' ? r.activePickaxeId : base.activePickaxeId,
    pickaxes: pickaxes.length > 0 ? pickaxes : base.pickaxes,
    gems,
    roughStones: Array.isArray(r.roughStones) ? (r.roughStones as GameState['roughStones']) : base.roughStones,
    rawOre: Array.isArray(r.rawOre) ? (r.rawOre as GameState['rawOre']) : base.rawOre,
    metalNuggets: Array.isArray(r.metalNuggets)
      ? (r.metalNuggets as GameState['metalNuggets'])
      : base.metalNuggets,
    metalIngots: Array.isArray(r.metalIngots)
      ? (r.metalIngots as GameState['metalIngots'])
      : base.metalIngots,
    inventoryCapacity:
      r.inventoryCapacity &&
      typeof r.inventoryCapacity === 'object' &&
      r.inventoryCapacity !== null
        ? {
            gems:
              typeof (r.inventoryCapacity as Record<string, unknown>).gems === 'number'
                ? ((r.inventoryCapacity as Record<string, unknown>).gems as number)
                : base.inventoryCapacity.gems,
            materials:
              typeof (r.inventoryCapacity as Record<string, unknown>).materials === 'number'
                ? ((r.inventoryCapacity as Record<string, unknown>).materials as number)
                : base.inventoryCapacity.materials,
            tools:
              typeof (r.inventoryCapacity as Record<string, unknown>).tools === 'number'
                ? ((r.inventoryCapacity as Record<string, unknown>).tools as number)
                : base.inventoryCapacity.tools,
          }
        : base.inventoryCapacity,
    smelterTier: typeof r.smelterTier === 'number' ? r.smelterTier : base.smelterTier,
    smeltingJobs: Array.isArray(r.smeltingJobs)
      ? (r.smeltingJobs as GameState['smeltingJobs'])
      : base.smeltingJobs,
    viewMode: r.viewMode === 'map' || r.viewMode === 'location' ? r.viewMode : base.viewMode,
    currentArea: typeof r.currentArea === 'string' ? (r.currentArea as GameState['currentArea']) : base.currentArea,
    unlockedLocations: Array.isArray(r.unlockedLocations)
      ? (r.unlockedLocations as GameState['unlockedLocations'])
      : base.unlockedLocations,
    activeCharms: Array.isArray(r.activeCharms) ? (r.activeCharms as string[]) : base.activeCharms,
    activeEffects: Array.isArray(r.activeEffects)
      ? (r.activeEffects as GameState['activeEffects'])
      : base.activeEffects,
    jewelry,
    unlockedBlueprints: Array.isArray(r.unlockedBlueprints)
      ? (r.unlockedBlueprints as unknown[]).filter((x): x is string => typeof x === 'string')
      : base.unlockedBlueprints,
    essences: Array.isArray(r.essences)
      ? (r.essences as GameState['essences']).filter(
          (e) =>
            e &&
            typeof e.essenceId === 'string' &&
            typeof e.quantity === 'number' &&
            e.quantity > 0,
        )
      : base.essences,
    instantBreakNextRock:
      typeof r.instantBreakNextRock === 'boolean' ? r.instantBreakNextRock : base.instantBreakNextRock,
    roughCraftPurityBonus:
      typeof r.roughCraftPurityBonus === 'number' ? r.roughCraftPurityBonus : base.roughCraftPurityBonus,
    gameNotice: typeof r.gameNotice === 'string' ? r.gameNotice : null,
    version: CURRENT_STATE_VERSION,
  }

  if (version < 7) {
    if (
      (typeof r.totalEssencesCollected !== 'number' || next.totalEssencesCollected === 0) &&
      next.essences.length > 0
    ) {
      next.totalEssencesCollected = next.essences.reduce((s, e) => s + e.quantity, 0)
    }
  }

  if (!next.pickaxes.some((p) => p.id === next.activePickaxeId) && next.pickaxes[0]) {
    next.activePickaxeId = next.pickaxes[0].id
  }

  next.pickaxes = next.pickaxes.map((p) => {
    const d = p.pixelItem?.data
    if (Array.isArray(d) && d.length > 0) return p
    const f = makePickaxe(Math.max(0, Math.min(4, p.tier)))
    return {
      ...f,
      id: p.id,
      durability: p.durability,
      maxDurability: p.maxDurability,
      name: p.name || f.name,
    }
  })

  if (version < 8) {
    const byTier = new Map<number, Pickaxe>()
    for (const p of next.pickaxes) {
      const cur = byTier.get(p.tier)
      if (!cur || p.durability > cur.durability) byTier.set(p.tier, p)
    }
    const deduped = [...byTier.values()].sort((a, b) => a.tier - b.tier)

    if (deduped.length !== next.pickaxes.length) {
      next.pickaxes = deduped
      if (!deduped.some((p) => p.id === next.activePickaxeId)) {
        const newest = deduped[deduped.length - 1] ?? deduped[0]
        if (newest) next.activePickaxeId = newest.id
      }
    }
  }

  if (!next.pickaxes.some((p) => p.id === next.activePickaxeId) && next.pickaxes[0]) {
    next.activePickaxeId = next.pickaxes[0].id
  }

  if (version < 9) {
    console.warn(
      '[GemSimulator] Save migrated to v9: gems, rough stones, and total gems found were reset for compatibility.',
    )
    next.gems = []
    next.roughStones = []
    next.totalGemsFound = 0
  }

  if (version < 10) {
    if (!Array.isArray(next.unlockedBlueprints)) {
      next.unlockedBlueprints = [...STARTER_BLUEPRINT_IDS]
    }
    next.jewelry = next.jewelry.map((j) => {
      if (j.blueprintId && Array.isArray(j.gemsUsed) && j.gemsUsed.length > 0) return j
      const blueprintId = blueprintFromLegacyRecipeId(j.recipeId ?? '')
      return {
        ...j,
        blueprintId,
        gemsUsed: j.gemUsed ? [j.gemUsed] : [],
      }
    })
  }

  if (version < 11) {
    if (typeof next.totalJewelryCrafted !== 'number' || next.totalJewelryCrafted === 0) {
      next.totalJewelryCrafted = next.jewelry.length
    }
  }

  if (version < 12) {
    const legacyDepth = typeof r.depth === 'number' ? r.depth : next.depth
    const ud: GameState['unlockedDepths'] = { ...next.unlockedDepths }
    for (const mid of MINE_LOCATION_IDS) {
      ud[mid] = Math.max(ud[mid] ?? 0, legacyDepth)
    }
    next.unlockedDepths = ud
    next.mineRun = null
    if (!next.totalRockSlotsCleared && legacyDepth > 0) {
      next.totalRockSlotsCleared = legacyDepth
    }
    if (typeof next.coal !== 'number') next.coal = 0
    next.depth = computeWorldTier(next)
  }

  return next
}
