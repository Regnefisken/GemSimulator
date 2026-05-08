import type {
  GameState,
  Gem,
  HubInventory,
  MagicProperty,
  MetalInclusion,
  Pickaxe,
  Sword,
  Armour,
  LocationId,
  RunInventory,
  ConsumableStack,
  LootOrigin,
} from '../types'
import { makePickaxe } from '../data/pickaxes'
import { makeSword } from '../data/swords'
import { blueprintFromLegacyRecipeId, migrateJewelry } from '../data/jewelry'
import { STARTER_BLUEPRINT_IDS } from '../data/blueprints'
import { METALS } from '../data/metals'
import { PALETTES } from '../data/palettes'
import { computeGoldValue } from '../gem/generate'
import { deriveGemName } from '../gem/naming'
import { computeWorldTier, MINE_LOCATION_IDS } from './worldTier'
import { clampPlayerSurvival, DEFAULT_PLAYER_HP_MAX, NEUTRAL_MANA_MAX } from './survival'
import { WORKSHOP_DEFAULT_STOCK } from '../data/consumables'
import { STARTER_UNLOCKED_ALCHEMY_RECIPES } from '../data/alchemyRecipes'
import { normalizeStackableFoundLoot } from './foundLootStack'

export const CURRENT_STATE_VERSION = 21

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

function parseLootOrigin(v: unknown): LootOrigin | undefined {
  return v === 'mine' || v === 'hub' ? v : undefined
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
    origin: parseLootOrigin((raw as Pickaxe).origin) ?? 'hub',
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

function migrateSword(raw: unknown, fallback: Sword): Sword {
  if (!raw || typeof raw !== 'object') return fallback
  const p = raw as Sword
  return {
    id: typeof p.id === 'string' ? p.id : fallback.id,
    tier: typeof p.tier === 'number' ? p.tier : fallback.tier,
    name: typeof p.name === 'string' ? p.name : fallback.name,
    damage: typeof p.damage === 'number' ? p.damage : fallback.damage,
    durability: typeof p.durability === 'number' ? p.durability : fallback.durability,
    maxDurability: typeof p.maxDurability === 'number' ? p.maxDurability : fallback.maxDurability,
    origin: parseLootOrigin((raw as Sword).origin) ?? 'hub',
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

function isConsumableStack(x: unknown): x is ConsumableStack {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as ConsumableStack).consumableId === 'string' &&
    typeof (x as ConsumableStack).quantity === 'number' &&
    (x as ConsumableStack).quantity > 0
  )
}

function mergeHubInventory(r: Record<string, unknown>, base: GameState, fromVersion: number): HubInventory {
  let parsed: HubInventory | null = null
  const hb = r.hubInventory
  if (hb && typeof hb === 'object' && !Array.isArray(hb)) {
    const rec = hb as Record<string, unknown>
    const gold = typeof rec.gold === 'number' ? rec.gold : base.hubInventory.gold
    const consumables = Array.isArray(rec.consumables)
      ? (rec.consumables as unknown[]).filter(isConsumableStack)
      : base.hubInventory.consumables
    const equipment = Array.isArray(rec.equipment) ? (rec.equipment as unknown[]) : base.hubInventory.equipment
    const materials =
      rec.materials && typeof rec.materials === 'object' && !Array.isArray(rec.materials)
        ? (rec.materials as HubInventory['materials'])
        : base.hubInventory.materials
    parsed = { gold, consumables, equipment, materials }
  }

  if (fromVersion < 18) {
    const gold = typeof r.gold === 'number' ? r.gold : (parsed?.gold ?? base.hubInventory.gold)
    const consumables = Array.isArray(r.consumables)
      ? (r.consumables as unknown[]).filter(isConsumableStack)
      : (parsed?.consumables ?? base.hubInventory.consumables)
    return {
      gold,
      consumables,
      equipment: parsed?.equipment ?? base.hubInventory.equipment,
      materials: parsed?.materials ?? base.hubInventory.materials,
    }
  }

  if (parsed) return parsed
  return {
    gold: base.hubInventory.gold,
    consumables: base.hubInventory.consumables,
    equipment: base.hubInventory.equipment,
    materials: base.hubInventory.materials,
  }
}

function parseRunInventory(r: Record<string, unknown>, base: GameState): RunInventory | null {
  const ri = r.runInventory
  if (ri === undefined) return base.runInventory
  if (ri === null) return null
  if (typeof ri !== 'object' || Array.isArray(ri)) return null
  const o = ri as Record<string, unknown>
  if (!Array.isArray(o.foundLoot) || !Array.isArray(o.rescueBag)) return null
  return {
    foundLoot: normalizeStackableFoundLoot(o.foundLoot as RunInventory['foundLoot']),
    rescueBag: normalizeStackableFoundLoot(o.rescueBag as RunInventory['foundLoot']),
    rescueBagCapacity: typeof o.rescueBagCapacity === 'number' ? o.rescueBagCapacity : 3,
    questItems: Array.isArray(o.questItems) ? (o.questItems as RunInventory['questItems']) : [],
    stowedHubGear: Array.isArray(o.stowedHubGear) ? (o.stowedHubGear as RunInventory['stowedHubGear']) : [],
  }
}

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

  const swordsRaw = r.swords
  const swords = Array.isArray(swordsRaw)
    ? swordsRaw.map((s, i) => migrateSword(s, base.swords[i] ?? base.swords[0]))
    : base.swords

  const gemsRaw = r.gems
  const gems = Array.isArray(gemsRaw) ? gemsRaw.map(migrateGem) : base.gems

  const jewelryRaw = r.jewelry
  const jewelry = Array.isArray(jewelryRaw) ? jewelryRaw.map(migrateJewelry) : base.jewelry

  const next: GameState = {
    ...base,
    ...r,
    level: typeof r.level === 'number' ? r.level : base.level,
    xp: typeof r.xp === 'number' ? r.xp : base.xp,
    hubInventory: mergeHubInventory(r, base, version),
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
    runInventory: parseRunInventory(r, base),
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
    equippedWeapon:
      r.equippedWeapon === 'pickaxe' || r.equippedWeapon === 'sword' ? r.equippedWeapon : base.equippedWeapon,
    activeSwordId: typeof r.activeSwordId === 'string' ? r.activeSwordId : base.activeSwordId,
    swords: swords.length > 0 ? swords : base.swords,
    armours: Array.isArray(r.armours)
      ? (r.armours as Armour[]).filter(
          (a) =>
            a &&
            typeof a === 'object' &&
            typeof a.id === 'string' &&
            typeof a.durability === 'number' &&
            typeof a.maxDurability === 'number',
        )
      : base.armours,
    activeArmourId:
      typeof r.activeArmourId === 'string'
        ? r.activeArmourId
        : r.activeArmourId === null
          ? null
          : base.activeArmourId,
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
    unlockedAlchemyRecipes: Array.isArray(r.unlockedAlchemyRecipes)
      ? (r.unlockedAlchemyRecipes as unknown[]).filter((x): x is string => typeof x === 'string')
      : base.unlockedAlchemyRecipes,
    essences: Array.isArray(r.essences)
      ? (r.essences as GameState['essences']).filter(
          (e) =>
            e &&
            typeof e.essenceId === 'string' &&
            typeof e.quantity === 'number' &&
            e.quantity > 0,
        )
      : base.essences,
    workshopStock:
      r.workshopStock && typeof r.workshopStock === 'object' && !Array.isArray(r.workshopStock)
        ? { ...(r.workshopStock as GameState['workshopStock']) }
        : base.workshopStock,
    rescueBagCapacity: typeof r.rescueBagCapacity === 'number' ? r.rescueBagCapacity : base.rescueBagCapacity,
    day: typeof r.day === 'number' ? r.day : base.day,
    lastRestockDay: typeof r.lastRestockDay === 'number' ? r.lastRestockDay : base.lastRestockDay,
    consumableQuickSlots:
      Array.isArray(r.consumableQuickSlots) && r.consumableQuickSlots.length >= 3
        ? ([
            typeof r.consumableQuickSlots[0] === 'string' ? r.consumableQuickSlots[0] : null,
            typeof r.consumableQuickSlots[1] === 'string' ? r.consumableQuickSlots[1] : null,
            typeof r.consumableQuickSlots[2] === 'string' ? r.consumableQuickSlots[2] : null,
          ] as GameState['consumableQuickSlots'])
        : base.consumableQuickSlots,
    instantBreakNextRock:
      typeof r.instantBreakNextRock === 'boolean' ? r.instantBreakNextRock : base.instantBreakNextRock,
    roughCraftPurityBonus:
      typeof r.roughCraftPurityBonus === 'number' ? r.roughCraftPurityBonus : base.roughCraftPurityBonus,
    playerHp: typeof r.playerHp === 'number' ? r.playerHp : base.playerHp,
    playerHpMax: typeof r.playerHpMax === 'number' ? r.playerHpMax : base.playerHpMax,
    playerMana: typeof r.playerMana === 'number' ? r.playerMana : base.playerMana,
    playerManaMax: typeof r.playerManaMax === 'number' ? r.playerManaMax : base.playerManaMax,
    activeBrewId:
      typeof r.activeBrewId === 'string'
        ? r.activeBrewId
        : r.activeBrewId === null
          ? null
          : base.activeBrewId,
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

  next.swords = next.swords.map((s) => {
    const d = s.pixelItem?.data
    if (Array.isArray(d) && d.length > 0) return s
    const f = makeSword(Math.max(0, Math.min(4, s.tier)))
    return {
      ...f,
      id: s.id,
      durability: s.durability,
      maxDurability: s.maxDurability,
      name: s.name || f.name,
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

  if (!next.swords.some((s) => s.id === next.activeSwordId) && next.swords[0]) {
    next.activeSwordId = next.swords[0].id
  }

  if (next.activeArmourId && !next.armours.some((a) => a.id === next.activeArmourId)) {
    next.activeArmourId = null
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

  if (version < 13) {
    if (typeof next.playerHpMax !== 'number' || next.playerHpMax < 1) next.playerHpMax = DEFAULT_PLAYER_HP_MAX
    if (typeof next.playerManaMax !== 'number' || next.playerManaMax < 1) {
      next.playerManaMax = NEUTRAL_MANA_MAX
    }
    if (typeof next.playerHp !== 'number') next.playerHp = next.playerHpMax
    if (typeof next.playerMana !== 'number') next.playerMana = next.playerManaMax
  }

  if (version < 14) {
    if (next.equippedWeapon !== 'pickaxe' && next.equippedWeapon !== 'sword') {
      next.equippedWeapon = 'pickaxe'
    }
    if (!Array.isArray(next.swords) || next.swords.length === 0) {
      const s = makeSword(0)
      next.swords = [s]
      next.activeSwordId = s.id
    } else if (!next.swords.some((sw) => sw.id === next.activeSwordId)) {
      next.activeSwordId = next.swords[0]!.id
    }
  }

  if (version < 15) {
    if (!Array.isArray(next.hubInventory.consumables)) {
      next.hubInventory = { ...next.hubInventory, consumables: [] }
    }
    if (!next.workshopStock || typeof next.workshopStock !== 'object' || Array.isArray(next.workshopStock)) {
      next.workshopStock = { ...WORKSHOP_DEFAULT_STOCK }
    }
    if (!Array.isArray(next.consumableQuickSlots) || next.consumableQuickSlots.length !== 3) {
      next.consumableQuickSlots = [null, null, null]
    }
    const ul = next.unlockedLocations.filter((id): id is LocationId => typeof id === 'string')
    if (!ul.includes('alkymistvaerkstedet')) {
      next.unlockedLocations = [...ul, 'alkymistvaerkstedet']
    }
  }

  if (version < 16) {
    if (!Array.isArray(next.unlockedAlchemyRecipes)) {
      next.unlockedAlchemyRecipes = [...STARTER_UNLOCKED_ALCHEMY_RECIPES]
    }
    if (typeof next.activeBrewId !== 'string' && next.activeBrewId !== null) {
      next.activeBrewId = null
    }
  }

  if (version < 17) {
    if (!Array.isArray(next.armours)) next.armours = []
    if (typeof next.activeArmourId !== 'string' && next.activeArmourId !== null) {
      next.activeArmourId = null
    }
  }

  if (version < 18) {
    if (next.mineRun) {
      next.mineRun = null
      if (next.gameNotice == null) {
        next.gameNotice = 'Aktiv mine-run blev nulstillet ved opdatering (v18 hub/run-inventar).'
      }
    }
    next.runInventory = null
  }

  if (version < 19) {
    next.pickaxes = next.pickaxes.map((p) => ({ ...p, origin: p.origin === 'mine' ? 'mine' : 'hub' }))
    next.swords = next.swords.map((s) => ({ ...s, origin: s.origin === 'mine' ? 'mine' : 'hub' }))
    next.armours = next.armours.map((a) => ({ ...a, origin: a.origin === 'mine' ? 'mine' : 'hub' }))
    if (next.runInventory) {
      const ri = next.runInventory
      const stowedHubGear = ri.stowedHubGear.map((slot) => {
        const o: LootOrigin = slot.item.origin === 'mine' ? 'mine' : 'hub'
        if (slot.kind === 'pickaxe') {
          return {
            ...slot,
            item: { ...slot.item, origin: o },
          }
        }
        if (slot.kind === 'sword') {
          return {
            ...slot,
            item: { ...slot.item, origin: o },
          }
        }
        return {
          ...slot,
          item: { ...slot.item, origin: o },
        }
      })
      next.runInventory = { ...ri, stowedHubGear }
    }
  }

  if (version < 20) {
    const top =
      typeof next.rescueBagCapacity === 'number' && next.rescueBagCapacity >= 3 ? next.rescueBagCapacity : 3
    const fromRun =
      next.runInventory &&
      typeof next.runInventory.rescueBagCapacity === 'number' &&
      next.runInventory.rescueBagCapacity >= 3
        ? next.runInventory.rescueBagCapacity
        : 3
    next.rescueBagCapacity = Math.max(top, fromRun)
    if (typeof next.day !== 'number' || next.day < 1) next.day = 1
    if (typeof next.lastRestockDay !== 'number' || next.lastRestockDay < 1) {
      next.lastRestockDay = next.day
    }
  }

  if (version < 21) {
    const ur = Array.isArray(next.unlockedAlchemyRecipes) ? [...next.unlockedAlchemyRecipes] : []
    if (!ur.includes('recipe_lunar_draught')) {
      ur.push('recipe_lunar_draught')
      next.unlockedAlchemyRecipes = ur.sort()
    }
  }

  if (next.mineRun && typeof next.mineRun === 'object') {
    const mr = next.mineRun
    const rock =
      typeof mr.rockSlotsClearedThisRun === 'number' && !Number.isNaN(mr.rockSlotsClearedThisRun)
        ? mr.rockSlotsClearedThisRun
        : 0
    if (rock !== mr.rockSlotsClearedThisRun) {
      next.mineRun = { ...mr, rockSlotsClearedThisRun: rock }
    }
  }

  delete (next as unknown as Record<string, unknown>).gold
  delete (next as unknown as Record<string, unknown>).consumables

  return clampPlayerSurvival(next)
}
