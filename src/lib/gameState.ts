import type {
  GameState,
  FoundLootEntry,
  Gem,
  HubInventory,
  Jewelry,
  LocationId,
  LootOrigin,
  MetalName,
  MetalNugget,
  MetalIngot,
  QuestItemEntry,
  RawOre,
  RoughStone,
  RunInventory,
  SmeltingJob,
  StowedHubGearSlot,
  ViewMode,
} from '../types'
import { AREAS } from '../data/areas'
import { makePickaxe } from '../data/pickaxes'
import { makeArmour } from '../data/armour'
import { makeSword } from '../data/swords'
import { findAlchemyRecipe, STARTER_UNLOCKED_ALCHEMY_RECIPES } from '../data/alchemyRecipes'
import { findBrew } from '../data/brews'
import { findConsumableDef, WORKSHOP_DEFAULT_STOCK } from '../data/consumables'
import { makeIngotPixelItem } from '../data/oreTemplates'
import { CURRENT_STATE_VERSION } from './migrations'
import { applyXpGain } from './leveling'
import { applyEligibleUnlocks } from './unlocks'
import { XP_REWARDS } from './leveling'
import { startSmeltingJob } from '../gem/smelting'
import { craftAlloy, craftGemFromRoughStone } from '../gem/crafting'
import { createRandomGem } from '../gem/generate'
import { buildJewelryVoxel3d } from '../gem/drawJewelry3d'
import { canDescendFromLayer, createInitialMineRun, generateLayerState } from '../gem/mineLayer'
import type { ChestLootResult } from '../gem/mining'
import { isDevMineGearProtectEnabled } from '../dev/devMineGearProtect'
import { ENABLE_DEV_CHEATS } from '../dev/featureFlags'
import { logTelemetry } from '../telemetry/localLogger'
import { computeWorldTier } from './worldTier'
import {
  applySafeZoneRegen,
  applyDamageToPlayer,
  clampPlayerSurvival,
  DEFAULT_PLAYER_HP_MAX,
  effectiveTotalHpMax,
  effectiveTotalManaMax,
  NEUTRAL_MANA_MAX,
  isInActiveMineRun,
} from './survival'
import {
  blueprintFromLegacyRecipeId,
  blueprintIngotRequirements,
  findJewelryRecipe,
  gemMatchesBlueprint,
  gemMatchesRecipe,
  makeJewelryPixelItemV2,
  primaryMetalForBlueprint,
  primaryMetalForRecipe,
  recipeIngotRequirements,
} from '../data/jewelry'
import { findBlueprint, STARTER_BLUEPRINT_IDS } from '../data/blueprints'
import {
  CHARM_IDS,
  findCharm,
  findConsumable,
  findInventoryPack,
  findPickaxeOffer,
  findSwordOffer,
  findArmourOffer,
  SHOP_CONSUMABLE_IDS,
  smelterNextUpgradeCost,
} from '../data/shop'
import { getNextRescueBagUpgrade } from '../data/rescueBagUpgrades'
import { mergeFoundLootEntryIntoList } from './foundLootStack'
import { NUGGET_SELL_PRICES, ORE_SELL_PRICES } from '../data/market'
import {
  ESSENCE_IDS,
  getEssenceDef,
  isValidEssenceMarketOffer,
  MOON_TEAR_EFFECT_ID,
  rollEssenceFromSmelt,
} from '../data/essences'

export type Action =
  | { type: 'GAIN_XP'; amount: number }
  | { type: 'GAIN_REPUTATION'; amount: number }
  | { type: 'EARN_GOLD'; amount: number }
  | { type: 'SPEND_GOLD'; amount: number }
  | { type: 'CHANGE_LOCATION'; location: LocationId }
  | { type: 'SET_VIEW_MODE'; viewMode: ViewMode }
  | { type: 'UNLOCK_LOCATION'; location: LocationId }
  | { type: 'ADD_GEM'; gem: Gem }
  | { type: 'CLEAR_GEMS' }
  | { type: 'ADD_ORE'; ore: RawOre }
  | { type: 'ADD_NUGGET'; nugget: MetalNugget }
  | { type: 'ADD_ROUGH_STONE'; stone: RoughStone }
  | { type: 'SET_ACTIVE_PICKAXE'; id: string }
  | { type: 'DAMAGE_PICKAXE'; amount: number }
  | { type: 'SET_EQUIPPED_WEAPON'; weapon: 'pickaxe' | 'sword' }
  | { type: 'SET_ACTIVE_SWORD'; id: string }
  | { type: 'DAMAGE_SWORD'; amount: number }
  | { type: 'PLAYER_TAKE_DAMAGE'; amount: number; source?: string }
  | { type: 'BUY_SWORD'; tier: number }
  | { type: 'BUY_ARMOUR'; tier: number }
  | { type: 'SET_ACTIVE_ARMOUR'; id: string | null }
  | { type: 'REPAIR_TOOL_WITH_COAL'; tool: 'pickaxe' | 'sword' | 'armour'; id: string }
  | { type: 'INCREMENT_DEPTH' }
  | { type: 'MINE_RUN_ENTER'; mineId: LocationId }
  | { type: 'MINE_RUN_EXIT' }
  /** D7/D46: død i mine — tab `foundLoot`, behold rescueBag + questItems + stowedHubGear (+ equipped). */
  | { type: 'MINE_PLAYER_DEATH' }
  /** §2.5: quest-item fra mine — ingen kapacitets-check (D50). */
  | { type: 'MINE_PICKUP_QUEST_ITEM'; questItemId: string }
  | { type: 'MINE_MOVE_TO_RESCUE_BAG'; foundIndex: number }
  | { type: 'MINE_MOVE_FROM_RESCUE_BAG'; rescueIndex: number }
  /** §2.5 D49/D52: equip gear fra fund/redningspose; hub-slot → stowed, mine-slot → foundLoot. */
  | { type: 'MINE_EQUIP_FOUND'; source: 'found' | 'rescue'; index: number }
  /** §2.5: hub → stowedHubGear, mine → foundLoot (mister equipped-beskyttelse). */
  | { type: 'MINE_UNEQUIP'; slot: 'pickaxe' | 'sword' | 'armour' }
  /** Verdens-loot: append gear til `runInventory.foundLoot` (fra MineDrop loot_*). */
  | { type: 'RUN_APPEND_FOUND_LOOT'; entry: FoundLootEntry }
  | { type: 'RESCUE_BAG_UPGRADE' }
  | { type: 'MINE_SET_TARGET_SLOT'; index: number }
  | { type: 'MINE_DEAL_DAMAGE'; slotIndex: number; damage: number }
  | { type: 'MINE_DESCEND_LAYER' }
  | { type: 'MINE_UPDATE_CHEST_SLOT'; slotIndex: number; loot: ChestLootResult; opened?: boolean }
  | { type: 'ADD_COAL'; amount: number }
  | { type: 'ADD_CONSUMABLE'; consumableId: string; quantity: number }
  | { type: 'BUY_WORKSHOP_CONSUMABLE'; consumableId: string; quantity?: number }
  | { type: 'SET_CONSUMABLE_QUICK_SLOT'; slotIndex: number; consumableId: string | null }
  | { type: 'USE_CONSUMABLE_QUICK_SLOT'; slotIndex: number }
  | { type: 'CRAFT_ALCHEMY_RECIPE'; recipeId: string }
  | { type: 'UNLOCK_ALCHEMY_RECIPE'; recipeId: string }
  | { type: 'OPEN_CHEST'; gold: number }
  | { type: 'CONSUME_ORE'; metalName: MetalName; quantity: number }
  | { type: 'CONSUME_NUGGET'; metalName: MetalName; quantity: number }
  | { type: 'CONSUME_ROUGH_STONE'; id: string }
  | { type: 'CONSUME_INGOT'; metalName: MetalName; quantity: number }
  | { type: 'ADD_INGOT'; ingot: MetalIngot }
  | { type: 'START_SMELTING'; metalName: MetalName; source: 'ore' | 'nugget' }
  | { type: 'TICK_SMELTING' }
  | { type: 'CRAFT_ALLOY'; a: MetalName; b: MetalName }
  | { type: 'CRAFT_GEM_FROM_ROUGH'; stoneId: string; ingotSelection: MetalName[]; essenceId?: string }
  | { type: 'BUY_PICKAXE'; tier: number }
  | { type: 'REPAIR_PICKAXE'; amount: number }
  | { type: 'UPGRADE_SMELTER' }
  | { type: 'BUY_CONSUMABLE'; id: string }
  | { type: 'EXPAND_INVENTORY'; packId: string }
  | { type: 'BUY_CHARM'; charmId: string }
  | { type: 'BUY_BLUEPRINT'; blueprintId: string }
  | { type: 'UNLOCK_BLUEPRINT'; blueprintId: string }
  | { type: 'CONSUME_DYNAMITE' }
  | { type: 'CRAFT_JEWELRY'; recipeId: string; gemId: string; essenceId?: string }
  | { type: 'CRAFT_JEWELRY_V2'; blueprintId: string; gemIds: string[]; essenceId?: string }
  | { type: 'SELL_JEWELRY'; id: string }
  | { type: 'SELL_GEM'; id: string }
  | { type: 'SELL_GEMS_BULK'; ids: string[] }
  | { type: 'SELL_RAW_ORE'; metalName: MetalName; quantity: number }
  | { type: 'SELL_NUGGET'; metalName: MetalName; quantity: number }
  | { type: 'ADD_ESSENCE'; essenceId: string; quantity?: number }
  | { type: 'USE_ESSENCE_MINE'; essenceId: string }
  | { type: 'USE_ESSENCE_CHAMBER'; essenceId: string }
  | { type: 'BUY_ESSENCE_MARKET'; essenceId: string; price: number }
  | { type: 'PRUNE_EXPIRED_EFFECTS' }
  | { type: 'UNLOCK_ACHIEVEMENTS'; ids: string[] }
  | { type: 'CLEAR_GAME_NOTICE' }
  /** Dev: tilføj tilfældige gems uden XP/præmier (FPS/stres-test). Kun når dev-cheats er slået til. */
  | { type: 'DEV_BULK_RANDOM_GEMS'; count: number }

function addEssence(state: GameState, essenceId: string, quantity: number): GameState {
  if (quantity <= 0) return state
  const idx = state.essences.findIndex((e) => e.essenceId === essenceId)
  const essences =
    idx >= 0
      ? state.essences.map((e, i) => (i === idx ? { ...e, quantity: e.quantity + quantity } : e))
      : [...state.essences, { essenceId, quantity }]
  return {
    ...state,
    essences,
    totalEssencesCollected: state.totalEssencesCollected + quantity,
    gameNotice: null,
  }
}

function consumeEssence(state: GameState, essenceId: string, quantity = 1): GameState | null {
  const idx = state.essences.findIndex((e) => e.essenceId === essenceId)
  if (idx < 0) return null
  const row = state.essences[idx]
  if (row.quantity < quantity) return null
  const essences =
    row.quantity === quantity
      ? state.essences.filter((_, i) => i !== idx)
      : state.essences.map((e, i) => (i === idx ? { ...e, quantity: e.quantity - quantity } : e))
  return { ...state, essences }
}

export function materialsCount(state: GameState): number {
  return (
    state.roughStones.length +
    state.rawOre.reduce((s, o) => s + o.quantity, 0) +
    state.metalNuggets.reduce((s, n) => s + n.quantity, 0) +
    state.metalIngots.reduce((s, i) => s + i.quantity, 0) +
    state.coal
  )
}

function materialsFullNotice(state: GameState): string {
  const used = materialsCount(state)
  const cap = state.inventoryCapacity.materials
  return `Lager fuldt: Råvarer (${used}/${cap}). Sælg i Butik > Sælg-fanen eller brug Smedjen.`
}

function addGemWithRewards(state: GameState, gem: Gem): GameState {
  const cap = state.inventoryCapacity.gems
  const atCap = state.gems.length >= cap
  const gems = [gem, ...state.gems].slice(0, cap)
  const next: GameState = {
    ...state,
    gems,
    totalGemsFound: state.totalGemsFound + 1,
    gameNotice: atCap ? 'Ædelsten: maks. plads — ældste fjernet.' : null,
  }
  return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.gemCrafted))
}

function addIngot(state: GameState, ingot: MetalIngot): GameState {
  const idx = state.metalIngots.findIndex((i) => i.metalName === ingot.metalName)
  let metalIngots: MetalIngot[]
  if (idx >= 0) {
    metalIngots = [...state.metalIngots]
    metalIngots[idx] = {
      ...metalIngots[idx],
      quantity: metalIngots[idx].quantity + ingot.quantity,
    }
  } else {
    metalIngots = [...state.metalIngots, ingot]
  }
  const next = { ...state, metalIngots, gameNotice: null as string | null }
  if (materialsCount(next) > state.inventoryCapacity.materials) {
    return { ...state, gameNotice: materialsFullNotice(state) }
  }
  return next
}

function consumeOre(state: GameState, metalName: MetalName, quantity: number): GameState | null {
  const idx = state.rawOre.findIndex((o) => o.metalName === metalName)
  if (idx < 0) return null
  const row = state.rawOre[idx]
  if (row.quantity < quantity) return null
  const rawOre = [...state.rawOre]
  if (row.quantity === quantity) rawOre.splice(idx, 1)
  else rawOre[idx] = { ...row, quantity: row.quantity - quantity }
  return { ...state, rawOre }
}

function consumeNugget(state: GameState, metalName: MetalName, quantity: number): GameState | null {
  const idx = state.metalNuggets.findIndex((n) => n.metalName === metalName)
  if (idx < 0) return null
  const row = state.metalNuggets[idx]
  if (row.quantity < quantity) return null
  const metalNuggets = [...state.metalNuggets]
  if (row.quantity === quantity) metalNuggets.splice(idx, 1)
  else metalNuggets[idx] = { ...row, quantity: row.quantity - quantity }
  return { ...state, metalNuggets }
}

function consumeIngot(state: GameState, metalName: MetalName, quantity: number): GameState | null {
  const idx = state.metalIngots.findIndex((i) => i.metalName === metalName)
  if (idx < 0) return null
  const row = state.metalIngots[idx]
  if (row.quantity < quantity) return null
  const metalIngots = [...state.metalIngots]
  if (row.quantity === quantity) metalIngots.splice(idx, 1)
  else metalIngots[idx] = { ...row, quantity: row.quantity - quantity }
  return { ...state, metalIngots }
}

export const CONSUMABLE_BAG_MAX = 36
const CONSUMABLE_STACK_MAX = 99

export function totalConsumableQty(state: GameState): number {
  return state.hubInventory.consumables.reduce((s, c) => s + c.quantity, 0)
}

export function canAddConsumableUnits(state: GameState, qty: number): boolean {
  return qty > 0 && totalConsumableQty(state) + qty <= CONSUMABLE_BAG_MAX
}

function restockWorkshopShelf(state: GameState): GameState {
  return { ...state, workshopStock: { ...WORKSHOP_DEFAULT_STOCK } }
}

/** D64/D65: dag-tick + restock kun efter “rigtigt” minebesøg. */
function isMineRunEligibleForDayTick(mineRun: NonNullable<GameState['mineRun']>): boolean {
  return mineRun.rockSlotsClearedThisRun > 0 || mineRun.currentDepth > 1
}

function addConsumableToState(state: GameState, consumableId: string, qty: number): GameState {
  const def = findConsumableDef(consumableId)
  if (!def || qty <= 0) return state
  if (totalConsumableQty(state) + qty > CONSUMABLE_BAG_MAX) {
    return { ...state, gameNotice: `Forbrugs-lager fuldt (${CONSUMABLE_BAG_MAX} stk. max).` }
  }
  const idx = state.hubInventory.consumables.findIndex((c) => c.consumableId === consumableId)
  if (idx < 0) {
    return {
      ...state,
      hubInventory: {
        ...state.hubInventory,
        consumables: [...state.hubInventory.consumables, { consumableId, quantity: Math.min(qty, CONSUMABLE_STACK_MAX) }],
      },
      gameNotice: null,
    }
  }
  const row = state.hubInventory.consumables[idx]!
  const nq = Math.min(CONSUMABLE_STACK_MAX, row.quantity + qty)
  const consumables = state.hubInventory.consumables.map((c, i) => (i === idx ? { ...c, quantity: nq } : c))
  return {
    ...state,
    hubInventory: { ...state.hubInventory, consumables },
    gameNotice: null,
  }
}

function pruneConsumableQuickSlots(state: GameState): GameState {
  const qs = [...state.consumableQuickSlots] as [string | null, string | null, string | null]
  let dirty = false
  for (let i = 0; i < 3; i++) {
    const id = qs[i]
    if (!id) continue
    const ok = state.hubInventory.consumables.some((c) => c.consumableId === id && c.quantity > 0)
    if (!ok) {
      qs[i] = null
      dirty = true
    }
  }
  return dirty ? { ...state, consumableQuickSlots: qs } : state
}

function subtractConsumableStacks(
  state: GameState,
  ingredients: Partial<Record<string, number>>,
): GameState | null {
  let consumables = [...state.hubInventory.consumables]
  for (const [id, need] of Object.entries(ingredients)) {
    const n = need ?? 0
    if (n <= 0) continue
    const idx = consumables.findIndex((c) => c.consumableId === id)
    if (idx < 0) return null
    const row = consumables[idx]!
    if (row.quantity < n) return null
    const left = row.quantity - n
    if (left <= 0) consumables = consumables.filter((_, i) => i !== idx)
    else consumables[idx] = { ...row, quantity: left }
  }
  return pruneConsumableQuickSlots(patchHubInventory(state, { consumables }))
}

function applyBrewToState(state: GameState, brewId: string): GameState {
  if (!findBrew(brewId)) return state
  return clampPlayerSurvival({
    ...state,
    activeBrewId: brewId,
  })
}

function applyConsumableDefToState(
  state: GameState,
  def: NonNullable<ReturnType<typeof findConsumableDef>>,
): GameState {
  if (def.effect === 'heal_hp') {
    const add = Math.max(0, def.value)
    const cap = effectiveTotalHpMax(state)
    return { ...state, playerHp: Math.min(cap, state.playerHp + add) }
  }
  if (def.effect === 'heal_mana') {
    const add = Math.max(0, def.value)
    const cap = effectiveTotalManaMax(state)
    return { ...state, playerMana: Math.min(cap, state.playerMana + add) }
  }
  if (def.effect === 'apply_brew') {
    return applyBrewToState(state, def.brewId)
  }
  return state
}

const starter = makePickaxe(0)
const starterSword = makeSword(0)

function patchHubInventory(state: GameState, patch: Partial<HubInventory>): GameState {
  return { ...state, hubInventory: { ...state.hubInventory, ...patch } }
}

function addHubGold(state: GameState, delta: number): GameState {
  return patchHubInventory(state, { gold: state.hubInventory.gold + delta })
}

export const initialState: GameState = {
  level: 1,
  xp: 0,
  hubInventory: {
    gold: 0,
    consumables: [],
    equipment: [],
    materials: {},
  },
  reputation: 0,
  depth: 0,
  unlockedDepths: {},
  mineRun: null,
  runInventory: null,
  coal: 0,
  totalRockSlotsCleared: 0,
  totalGemsFound: 0,
  totalJewelryCrafted: 0,
  totalEssencesCollected: 0,
  achievementsUnlocked: [],
  activePickaxeId: starter.id,
  pickaxes: [starter],
  equippedWeapon: 'pickaxe',
  activeSwordId: starterSword.id,
  swords: [starterSword],
  armours: [],
  activeArmourId: null,
  gems: [],
  roughStones: [],
  rawOre: [],
  metalNuggets: [],
  metalIngots: [],
  inventoryCapacity: { gems: 40, materials: 200, tools: 10 },
  smelterTier: 1,
  smeltingJobs: [],
  viewMode: 'map',
  currentArea: 'kobbermine',
  unlockedLocations: ['kobbermine', 'smedjen', 'butikken', 'alkymistvaerkstedet'],
  activeCharms: [],
  activeEffects: [],
  instantBreakNextRock: false,
  roughCraftPurityBonus: 0,
  jewelry: [],
  unlockedBlueprints: [...STARTER_BLUEPRINT_IDS],
  unlockedAlchemyRecipes: [...STARTER_UNLOCKED_ALCHEMY_RECIPES],
  essences: [],
  workshopStock: { ...WORKSHOP_DEFAULT_STOCK },
  rescueBagCapacity: 3,
  day: 1,
  lastRestockDay: 1,
  consumableQuickSlots: [null, null, null],
  playerHp: DEFAULT_PLAYER_HP_MAX,
  playerHpMax: DEFAULT_PLAYER_HP_MAX,
  playerMana: NEUTRAL_MANA_MAX,
  playerManaMax: NEUTRAL_MANA_MAX,
  activeBrewId: null,
  gameNotice: null,
  version: CURRENT_STATE_VERSION,
}

/** Frisk spiltilstand til migrationstests og fixtures (Fase 0 / implementation-guide §0.2). */
export function defaultGameState(): GameState {
  return structuredClone(initialState)
}

function addOre(state: GameState, ore: RawOre): GameState {
  const idx = state.rawOre.findIndex((o) => o.metalName === ore.metalName)
  let rawOre: RawOre[]
  if (idx >= 0) {
    rawOre = [...state.rawOre]
    rawOre[idx] = { ...rawOre[idx], quantity: rawOre[idx].quantity + ore.quantity }
  } else {
    rawOre = [...state.rawOre, ore]
  }
  const next = { ...state, rawOre, gameNotice: null as string | null }
  if (materialsCount(next) > state.inventoryCapacity.materials) {
    return { ...state, gameNotice: materialsFullNotice(state) }
  }
  return next
}

function addNugget(state: GameState, nugget: MetalNugget): GameState {
  const idx = state.metalNuggets.findIndex((n) => n.metalName === nugget.metalName)
  let metalNuggets: MetalNugget[]
  if (idx >= 0) {
    metalNuggets = [...state.metalNuggets]
    metalNuggets[idx] = {
      ...metalNuggets[idx],
      quantity: metalNuggets[idx].quantity + nugget.quantity,
    }
  } else {
    metalNuggets = [...state.metalNuggets, nugget]
  }
  const next = { ...state, metalNuggets, gameNotice: null as string | null }
  if (materialsCount(next) > state.inventoryCapacity.materials) {
    return { ...state, gameNotice: materialsFullNotice(state) }
  }
  return next
}

function emptyRunInventory(rescueBagCapacity: number): RunInventory {
  return {
    foundLoot: [],
    rescueBag: [],
    rescueBagCapacity,
    questItems: [],
    stowedHubGear: [],
  }
}

function appendFoundLoot(state: GameState, entry: FoundLootEntry): GameState {
  if (!state.runInventory) return state
  if (entry.kind === 'quest_item') {
    const questItemId = entry.questItemId.trim()
    if (!questItemId) return state
    const ri = state.runInventory
    if (ri.questItems.some((q) => q.questItemId === questItemId)) return state
    return {
      ...state,
      runInventory: {
        ...ri,
        questItems: [...ri.questItems, { questItemId, origin: 'mine' as const }],
      },
      gameNotice: null,
    }
  }
  return {
    ...state,
    runInventory: {
      ...state.runInventory,
      foundLoot: mergeFoundLootEntryIntoList(state.runInventory.foundLoot, entry),
    },
  }
}

function applyFoundLootEntryToHub(state: GameState, entry: FoundLootEntry): GameState {
  switch (entry.kind) {
    case 'gem':
      return addGemWithRewards(state, entry.gem)
    case 'coal':
      return { ...state, coal: state.coal + entry.quantity, gameNotice: null }
    case 'ore':
      return addOre(state, entry.ore)
    case 'nugget':
      return addNugget(state, entry.nugget)
    case 'rough_stone': {
      const n = {
        ...state,
        roughStones: [...state.roughStones, entry.stone],
        gameNotice: null as string | null,
      }
      if (materialsCount(n) > state.inventoryCapacity.materials) {
        return { ...state, gameNotice: materialsFullNotice(state) }
      }
      return n
    }
    case 'quest_item': {
      const id = entry.questItemId.trim()
      if (!id) return state
      return {
        ...state,
        hubInventory: {
          ...state.hubInventory,
          equipment: [...state.hubInventory.equipment, { questItemId: id, origin: 'hub' as const }],
        },
        gameNotice: null,
      }
    }
    case 'pickaxe_gear': {
      let pickaxes = [...state.pickaxes]
      const p = entry.pickaxe
      const i = pickaxes.findIndex((x) => x.id === p.id)
      if (i < 0) pickaxes.push(p)
      else pickaxes[i] = p
      return { ...state, pickaxes, gameNotice: null }
    }
    case 'sword_gear': {
      let swords = [...state.swords]
      const s = entry.sword
      const i = swords.findIndex((x) => x.id === s.id)
      if (i < 0) swords.push(s)
      else swords[i] = s
      return { ...state, swords, gameNotice: null }
    }
    case 'armour_gear': {
      let armours = [...state.armours]
      const a = entry.armour
      const i = armours.findIndex((x) => x.id === a.id)
      if (i < 0) armours.push(a)
      else armours[i] = a
      return clampPlayerSurvival({ ...state, armours, gameNotice: null })
    }
  }
}

function mergeQuestItemsIntoHub(state: GameState): GameState {
  const qi = state.runInventory?.questItems
  if (!qi?.length) return state
  return {
    ...state,
    hubInventory: {
      ...state.hubInventory,
      equipment: [...state.hubInventory.equipment, ...qi.map((q) => ({ questItemId: q.questItemId, origin: 'hub' as const }))],
    },
  }
}

function restoreStowedHubGear(state: GameState): GameState {
  const st = state.runInventory?.stowedHubGear ?? []
  if (st.length === 0) return state
  let pickaxes = [...state.pickaxes]
  let swords = [...state.swords]
  let armours = [...state.armours]
  for (const slot of st) {
    if (slot.kind === 'pickaxe') {
      const i = pickaxes.findIndex((p) => p.id === slot.item.id)
      if (i < 0) pickaxes = [...pickaxes, slot.item]
      else pickaxes[i] = slot.item
    } else if (slot.kind === 'sword') {
      const i = swords.findIndex((s) => s.id === slot.item.id)
      if (i < 0) swords = [...swords, slot.item]
      else swords[i] = slot.item
    } else {
      const i = armours.findIndex((a) => a.id === slot.item.id)
      if (i < 0) armours = [...armours, slot.item]
      else armours[i] = slot.item
    }
  }
  return clampPlayerSurvival({ ...state, pickaxes, swords, armours })
}

/** Safe ascend (D8): hele run-beholdningen inkl. `foundLoot` til hub. */
function mergeSafeExitRunLootIntoHub(state: GameState): GameState {
  const ri = state.runInventory
  if (!ri) return state
  let next = state
  for (const entry of [...ri.foundLoot, ...ri.rescueBag]) {
    next = applyFoundLootEntryToHub(next, entry)
  }
  next = mergeQuestItemsIntoHub(next)
  next = restoreStowedHubGear(next)
  return next
}

function questItemEntriesFromFoundLoot(foundLoot: FoundLootEntry[]): QuestItemEntry[] {
  const out: QuestItemEntry[] = []
  const seen = new Set<string>()
  for (const e of foundLoot) {
    if (e.kind !== 'quest_item') continue
    const id = e.questItemId.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({ questItemId: id, origin: 'mine' })
  }
  return out
}

/** Død (D7/D46): kun rescueBag + quest + stowed — `foundLoot` kasseres (D58 soul-bound senere). */
function mergeDeathSurvivorsIntoHub(state: GameState): GameState {
  const ri = state.runInventory
  if (!ri) return state
  const extraQuest = questItemEntriesFromFoundLoot(ri.foundLoot)
  const seen = new Set(ri.questItems.map((q) => q.questItemId))
  const mergedQuest = [...ri.questItems]
  for (const q of extraQuest) {
    if (!seen.has(q.questItemId)) {
      seen.add(q.questItemId)
      mergedQuest.push(q)
    }
  }
  let next: GameState = { ...state, runInventory: { ...ri, questItems: mergedQuest } }
  for (const entry of ri.rescueBag) {
    next = applyFoundLootEntryToHub(next, entry)
  }
  next = mergeQuestItemsIntoHub(next)
  next = restoreStowedHubGear(next)
  return next
}

/** D47 / implementation-guide §2.4 (a): efter run-end er alt persisteret udstyr hub-origin for næste run. */
function normalizeSurvivorEquipmentOriginToHub(state: GameState): GameState {
  return {
    ...state,
    pickaxes: state.pickaxes.map((p) => ({ ...p, origin: 'hub' as const })),
    swords: state.swords.map((s) => ({ ...s, origin: 'hub' as const })),
    armours: state.armours.map((a) => ({ ...a, origin: 'hub' as const })),
  }
}

function finalizeMineRunEnd(
  state: GameState,
  outcome: 'safe_exit' | 'death',
  mineId: string | null,
): GameState {
  const mr = state.mineRun
  const validForDay = mr != null && isMineRunEligibleForDayTick(mr)

  const merged = outcome === 'safe_exit' ? mergeSafeExitRunLootIntoHub(state) : mergeDeathSurvivorsIntoHub(state)
  const mergedOrigin = normalizeSurvivorEquipmentOriginToHub(merged)
  const notice =
    outcome === 'death'
      ? 'Du faldt i minen. Run-loot uden for redningspose er tabt; redningspose, quest-genstande og af-equippet hub-udstyr er gemt.'
      : null
  const cap = state.runInventory?.rescueBagCapacity ?? state.rescueBagCapacity

  let core: GameState = applySafeZoneRegen({
    ...mergedOrigin,
    mineRun: null,
    runInventory: null,
    viewMode: 'map',
    gameNotice: notice,
    rescueBagCapacity: cap,
  })

  if (validForDay) {
    const nextDay = core.day + 1
    core = restockWorkshopShelf({ ...core, day: nextDay, lastRestockDay: nextDay })
  }

  logTelemetry('mine_run_end', { outcome, mineId: mineId ?? 'unknown' })
  return core
}

function moveFoundLootToRescueBag(state: GameState, foundIndex: number): GameState {
  if (!isInActiveMineRun(state) || !state.runInventory) return state
  const ri = state.runInventory
  if (foundIndex < 0 || foundIndex >= ri.foundLoot.length) return state
  if (ri.rescueBag.length >= ri.rescueBagCapacity) {
    return { ...state, gameNotice: 'Redningsposen er fuld.' }
  }
  const entry = ri.foundLoot[foundIndex]!
  const foundLoot = ri.foundLoot.filter((_, i) => i !== foundIndex)
  const rescueBag = mergeFoundLootEntryIntoList(ri.rescueBag, entry)
  return {
    ...state,
    runInventory: { ...ri, foundLoot, rescueBag },
    gameNotice: null,
  }
}

function moveRescueBagToFoundLoot(state: GameState, rescueIndex: number): GameState {
  if (!isInActiveMineRun(state) || !state.runInventory) return state
  const ri = state.runInventory
  if (rescueIndex < 0 || rescueIndex >= ri.rescueBag.length) return state
  const entry = ri.rescueBag[rescueIndex]!
  const rescueBag = ri.rescueBag.filter((_, i) => i !== rescueIndex)
  const foundLoot = mergeFoundLootEntryIntoList(ri.foundLoot, entry)
  return {
    ...state,
    runInventory: { ...ri, foundLoot, rescueBag },
    gameNotice: null,
  }
}

function effectiveGearOrigin(item: { origin?: LootOrigin }): LootOrigin {
  return item.origin === 'mine' ? 'mine' : 'hub'
}

function promoteFirstStowedPickaxe(state: GameState): GameState {
  if (!state.runInventory) return state
  const si = state.runInventory.stowedHubGear.findIndex((s) => s.kind === 'pickaxe')
  if (si < 0) return state
  const slot = state.runInventory.stowedHubGear[si]
  if (!slot || slot.kind !== 'pickaxe') return state
  const stowedHubGear = state.runInventory.stowedHubGear.filter((_, i) => i !== si)
  const pickaxes = [...state.pickaxes, slot.item]
  return {
    ...state,
    pickaxes,
    activePickaxeId: slot.item.id,
    runInventory: { ...state.runInventory, stowedHubGear },
  }
}

function ensureActivePickaxe(state: GameState): GameState {
  if (state.pickaxes.some((p) => p.id === state.activePickaxeId)) {
    return clampPlayerSurvival(state)
  }
  if (state.pickaxes.length > 0) {
    return clampPlayerSurvival({ ...state, activePickaxeId: state.pickaxes[0]!.id })
  }
  const promoted = promoteFirstStowedPickaxe(state)
  if (promoted.pickaxes.length > 0 && promoted.pickaxes.some((x) => x.id === promoted.activePickaxeId)) {
    return clampPlayerSurvival(promoted)
  }
  return { ...state, gameNotice: 'Ingen hakke tilbage.' }
}

function mineEquipFound(state: GameState, source: 'found' | 'rescue', index: number): GameState {
  if (!isInActiveMineRun(state) || !state.runInventory) {
    return { ...state, gameNotice: 'Kan kun equipes under aktiv mine.' }
  }
  const ri = state.runInventory
  const list = source === 'found' ? ri.foundLoot : ri.rescueBag
  if (index < 0 || index >= list.length) return state
  const entry = list[index]!
  if (entry.kind !== 'pickaxe_gear' && entry.kind !== 'sword_gear' && entry.kind !== 'armour_gear') {
    return { ...state, gameNotice: 'Kun udstyr (hakke, sværd, rustning) kan equipes herfra.' }
  }

  const nextList = list.filter((_, i) => i !== index)
  let foundLoot = source === 'found' ? nextList : ri.foundLoot
  let rescueBag = source === 'rescue' ? nextList : ri.rescueBag
  let stowedHubGear = [...ri.stowedHubGear]
  let pickaxes = [...state.pickaxes]
  let swords = [...state.swords]
  let armours = [...state.armours]
  let activePickaxeId = state.activePickaxeId
  let activeSwordId = state.activeSwordId
  let activeArmourId = state.activeArmourId
  let equippedWeapon = state.equippedWeapon

  const pushMineToFound = (e: FoundLootEntry) => {
    foundLoot = mergeFoundLootEntryIntoList(foundLoot, e)
  }
  const pushHubToStowed = (slot: StowedHubGearSlot) => {
    stowedHubGear = [...stowedHubGear, slot]
  }

  if (entry.kind === 'pickaxe_gear') {
    const tool = { ...entry.pickaxe, origin: entry.origin }
    const old = pickaxes.find((p) => p.id === activePickaxeId)
    if (old && old.id !== tool.id) {
      pickaxes = pickaxes.filter((p) => p.id !== old.id)
      if (effectiveGearOrigin(old) === 'mine') {
        pushMineToFound({ kind: 'pickaxe_gear', pickaxe: old, origin: 'mine' })
      } else {
        pushHubToStowed({ kind: 'pickaxe', item: old })
      }
    }
    if (!pickaxes.some((p) => p.id === tool.id)) pickaxes = [...pickaxes, tool]
    else pickaxes = pickaxes.map((p) => (p.id === tool.id ? tool : p))
    activePickaxeId = tool.id
    equippedWeapon = 'pickaxe'
  } else if (entry.kind === 'sword_gear') {
    const tool = { ...entry.sword, origin: entry.origin }
    const oldId = activeSwordId
    const old = oldId ? swords.find((s) => s.id === oldId) : undefined
    if (old && old.id !== tool.id) {
      swords = swords.filter((s) => s.id !== old.id)
      if (effectiveGearOrigin(old) === 'mine') {
        pushMineToFound({ kind: 'sword_gear', sword: old, origin: 'mine' })
      } else {
        pushHubToStowed({ kind: 'sword', item: old })
      }
    }
    if (!swords.some((s) => s.id === tool.id)) swords = [...swords, tool]
    else swords = swords.map((s) => (s.id === tool.id ? tool : s))
    activeSwordId = tool.id
    equippedWeapon = 'sword'
  } else {
    const tool = { ...entry.armour, origin: entry.origin }
    const cur = activeArmourId ? armours.find((a) => a.id === activeArmourId) : undefined
    if (cur && cur.id !== tool.id) {
      armours = armours.filter((a) => a.id !== cur.id)
      if (effectiveGearOrigin(cur) === 'mine') {
        pushMineToFound({ kind: 'armour_gear', armour: cur, origin: 'mine' })
      } else {
        pushHubToStowed({ kind: 'armour', item: cur })
      }
    }
    if (!armours.some((a) => a.id === tool.id)) armours = [...armours, tool]
    else armours = armours.map((a) => (a.id === tool.id ? tool : a))
    activeArmourId = tool.id
  }

  return clampPlayerSurvival({
    ...state,
    pickaxes,
    swords,
    armours,
    activePickaxeId,
    activeSwordId,
    activeArmourId,
    equippedWeapon,
    runInventory: { ...ri, foundLoot, rescueBag, stowedHubGear },
    gameNotice: null,
  })
}

function mineUnequip(state: GameState, slot: 'pickaxe' | 'sword' | 'armour'): GameState {
  if (!isInActiveMineRun(state) || !state.runInventory) {
    return { ...state, gameNotice: 'Kan kun af-equipes under aktiv mine.' }
  }
  const ri = state.runInventory
  let foundLoot = [...ri.foundLoot]
  let stowedHubGear = [...ri.stowedHubGear]

  if (slot === 'pickaxe') {
    const cur = state.pickaxes.find((p) => p.id === state.activePickaxeId)
    if (!cur) return { ...state, gameNotice: 'Ingen aktiv hakke.' }
    const pickaxes = state.pickaxes.filter((p) => p.id !== cur.id)
    if (effectiveGearOrigin(cur) === 'mine') {
      foundLoot = mergeFoundLootEntryIntoList(foundLoot, { kind: 'pickaxe_gear', pickaxe: cur, origin: 'mine' })
    } else {
      stowedHubGear = [...stowedHubGear, { kind: 'pickaxe', item: cur }]
    }
    const mid: GameState = {
      ...state,
      pickaxes,
      runInventory: { ...ri, foundLoot, rescueBag: ri.rescueBag, stowedHubGear },
      gameNotice: null,
    }
    return ensureActivePickaxe(mid)
  }

  if (slot === 'sword') {
    const sid = state.activeSwordId
    if (!sid) return { ...state, gameNotice: 'Intet aktivt sværd.' }
    const cur = state.swords.find((s) => s.id === sid)
    if (!cur) return state
    const swords = state.swords.filter((s) => s.id !== cur.id)
    if (effectiveGearOrigin(cur) === 'mine') {
      foundLoot = mergeFoundLootEntryIntoList(foundLoot, { kind: 'sword_gear', sword: cur, origin: 'mine' })
    } else {
      stowedHubGear = [...stowedHubGear, { kind: 'sword', item: cur }]
    }
    const nextS = swords.find((s) => s.durability > 0) ?? swords[0] ?? null
    const activeSwordId = nextS?.id ?? null
    let equippedWeapon: 'pickaxe' | 'sword' = state.equippedWeapon
    if (state.equippedWeapon === 'sword' && sid === cur.id) {
      equippedWeapon = activeSwordId ? 'sword' : 'pickaxe'
    }
    return {
      ...state,
      swords,
      activeSwordId,
      equippedWeapon,
      runInventory: { ...ri, foundLoot, rescueBag: ri.rescueBag, stowedHubGear },
      gameNotice: null,
    }
  }

  const aid = state.activeArmourId
  if (!aid) return { ...state, gameNotice: 'Du bærer ikke rustning.' }
  const cur = state.armours.find((a) => a.id === aid)
  if (!cur) return state
  const armours = state.armours.filter((a) => a.id !== cur.id)
  if (effectiveGearOrigin(cur) === 'mine') {
    foundLoot = mergeFoundLootEntryIntoList(foundLoot, { kind: 'armour_gear', armour: cur, origin: 'mine' })
  } else {
    stowedHubGear = [...stowedHubGear, { kind: 'armour', item: cur }]
  }
  return clampPlayerSurvival({
    ...state,
    armours,
    activeArmourId: null,
    runInventory: { ...ri, foundLoot, rescueBag: ri.rescueBag, stowedHubGear },
    gameNotice: null,
  })
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'GAIN_XP':
      return applyEligibleUnlocks(applyXpGain(state, action.amount))
    case 'GAIN_REPUTATION':
      return applyEligibleUnlocks({ ...state, reputation: state.reputation + action.amount })
    case 'EARN_GOLD':
      return applyEligibleUnlocks(addHubGold(state, action.amount))
    case 'SPEND_GOLD':
      return patchHubInventory(state, { gold: Math.max(0, state.hubInventory.gold - action.amount) })
    case 'PLAYER_TAKE_DAMAGE': {
      const damaged = applyDamageToPlayer(state, action.amount, action.source)
      if (damaged.playerHp <= 0 && damaged.mineRun && isInActiveMineRun(damaged)) {
        return finalizeMineRunEnd(damaged, 'death', damaged.mineRun.mineId)
      }
      return damaged
    }
    case 'SET_EQUIPPED_WEAPON': {
      if (action.weapon === 'pickaxe') {
        return { ...state, equippedWeapon: 'pickaxe', gameNotice: null }
      }
      const usable = state.swords.some((s) => s.durability > 0)
      if (!usable) {
        return { ...state, gameNotice: 'Alle sværd er slidt op — reparér med kul i smedjen.' }
      }
      let activeSwordId = state.activeSwordId
      if (!activeSwordId || !state.swords.some((s) => s.id === activeSwordId && s.durability > 0)) {
        activeSwordId = state.swords.find((s) => s.durability > 0)?.id ?? state.activeSwordId
      }
      return { ...state, equippedWeapon: 'sword', activeSwordId, gameNotice: null }
    }
    case 'SET_ACTIVE_SWORD':
      if (!state.swords.some((s) => s.id === action.id)) return state
      return { ...state, activeSwordId: action.id, gameNotice: null }
    case 'SET_ACTIVE_ARMOUR': {
      if (isInActiveMineRun(state)) {
        return { ...state, gameNotice: 'Rustning kan kun skiftes på overfladen / i hub.' }
      }
      if (action.id === null) {
        return clampPlayerSurvival({ ...state, activeArmourId: null, gameNotice: null })
      }
      if (!state.armours.some((a) => a.id === action.id)) return state
      return clampPlayerSurvival({ ...state, activeArmourId: action.id, gameNotice: null })
    }
    case 'DAMAGE_SWORD': {
      if (isDevMineGearProtectEnabled()) return state
      if (action.amount <= 0) return state
      const swords = state.swords.map((s) =>
        s.id === state.activeSwordId ? { ...s, durability: Math.max(0, s.durability - action.amount) } : s,
      )
      return { ...state, swords }
    }
    case 'CHANGE_LOCATION': {
      const nextArea = AREAS.find((a) => a.id === action.location)
      let next: GameState = { ...state, currentArea: action.location, gameNotice: null }
      if (nextArea?.kind !== 'mine') {
        next = applySafeZoneRegen(next)
      }
      return next
    }
    case 'SET_VIEW_MODE': {
      let next: GameState = { ...state, viewMode: action.viewMode }
      if (action.viewMode === 'map') {
        return applySafeZoneRegen(next)
      }
      if (action.viewMode === 'location') {
        const area = AREAS.find((a) => a.id === next.currentArea)
        if (area && area.kind !== 'mine') {
          return applySafeZoneRegen(next)
        }
      }
      return next
    }
    case 'UNLOCK_LOCATION':
      if (state.unlockedLocations.includes(action.location)) return state
      return { ...state, unlockedLocations: [...state.unlockedLocations, action.location] }
    case 'ADD_GEM':
      if (state.mineRun && state.runInventory) {
        return appendFoundLoot(state, { kind: 'gem', gem: action.gem, origin: 'mine' })
      }
      return addGemWithRewards(state, action.gem)
    case 'CLEAR_GEMS':
      return { ...state, gems: [] }
    case 'ADD_ORE':
      if (state.mineRun && state.runInventory) {
        return appendFoundLoot(state, { kind: 'ore', ore: action.ore, origin: 'mine' })
      }
      return addOre(state, action.ore)
    case 'ADD_NUGGET':
      if (state.mineRun && state.runInventory) {
        return appendFoundLoot(state, { kind: 'nugget', nugget: action.nugget, origin: 'mine' })
      }
      return addNugget(state, action.nugget)
    case 'ADD_ROUGH_STONE': {
      if (state.mineRun && state.runInventory) {
        return appendFoundLoot(state, { kind: 'rough_stone', stone: action.stone, origin: 'mine' })
      }
      const next = {
        ...state,
        roughStones: [...state.roughStones, action.stone],
        gameNotice: null as string | null,
      }
      if (materialsCount(next) > state.inventoryCapacity.materials) {
        return { ...state, gameNotice: materialsFullNotice(state) }
      }
      return next
    }
    case 'INCREMENT_DEPTH':
      return { ...state, depth: state.depth + 1 }
    case 'MINE_RUN_ENTER': {
      if (state.mineRun?.mineId === action.mineId) return state
      const area = AREAS.find((a) => a.id === action.mineId)
      if (!area || area.kind !== 'mine') return state
      const withRun: GameState = {
        ...state,
        mineRun: createInitialMineRun({
          area,
          mineId: action.mineId,
          activeCharms: state.activeCharms,
        }),
        runInventory: emptyRunInventory(state.rescueBagCapacity),
        gameNotice: null,
      }
      const manaCap = effectiveTotalManaMax(withRun)
      const hpCap = effectiveTotalHpMax(withRun)
      const next = clampPlayerSurvival({
        ...withRun,
        playerHp: hpCap,
        playerMana: manaCap,
      })
      logTelemetry('mine_run_start', { mineId: action.mineId })
      return next
    }
    case 'MINE_RUN_EXIT':
      if (!state.mineRun) return state
      return finalizeMineRunEnd({ ...state, gameNotice: null }, 'safe_exit', state.mineRun.mineId)
    case 'MINE_PLAYER_DEATH':
      if (!state.mineRun || !isInActiveMineRun(state)) return state
      return finalizeMineRunEnd(state, 'death', state.mineRun.mineId)
    case 'MINE_PICKUP_QUEST_ITEM': {
      if (!isInActiveMineRun(state) || !state.runInventory) {
        return { ...state, gameNotice: 'Quest-genstande kan kun samles op under aktiv mine.' }
      }
      const questItemId = action.questItemId.trim()
      if (!questItemId) return state
      const ri = state.runInventory
      if (ri.questItems.some((q) => q.questItemId === questItemId)) {
        return { ...state, gameNotice: null }
      }
      return {
        ...state,
        runInventory: {
          ...ri,
          questItems: [...ri.questItems, { questItemId, origin: 'mine' as const }],
        },
        gameNotice: null,
      }
    }
    case 'MINE_MOVE_TO_RESCUE_BAG':
      return moveFoundLootToRescueBag(state, action.foundIndex)
    case 'MINE_MOVE_FROM_RESCUE_BAG':
      return moveRescueBagToFoundLoot(state, action.rescueIndex)
    case 'MINE_EQUIP_FOUND':
      return mineEquipFound(state, action.source, action.index)
    case 'MINE_UNEQUIP':
      return mineUnequip(state, action.slot)
    case 'RUN_APPEND_FOUND_LOOT':
      if (!isInActiveMineRun(state) || !state.runInventory) {
        return { ...state, gameNotice: 'Run-loot kan kun tilføjes under aktiv mine.' }
      }
      return appendFoundLoot(state, action.entry)
    case 'RESCUE_BAG_UPGRADE': {
      const inRun = Boolean(state.mineRun && state.runInventory && isInActiveMineRun(state))
      const cap = inRun ? state.runInventory!.rescueBagCapacity : state.rescueBagCapacity
      const row = getNextRescueBagUpgrade(cap)
      if (!row) {
        return { ...state, gameNotice: 'Redningsposen er allerede opgraderet til maks.' }
      }
      if (state.level < row.minLevel) {
        return { ...state, gameNotice: `Kræver level ${row.minLevel}.` }
      }
      if (state.hubInventory.gold < row.goldCost) {
        return { ...state, gameNotice: 'Ikke nok guld.' }
      }
      const paid = patchHubInventory(state, { gold: state.hubInventory.gold - row.goldCost })
      const nextCap = row.rescueBagCapacity
      if (inRun) {
        return {
          ...paid,
          rescueBagCapacity: nextCap,
          runInventory: {
            ...paid.runInventory!,
            rescueBagCapacity: nextCap,
          },
          gameNotice: null,
        }
      }
      if (state.currentArea === 'smedjen' && !state.mineRun) {
        return { ...paid, rescueBagCapacity: nextCap, gameNotice: null }
      }
      return { ...state, gameNotice: 'Redningspose kan kun opgraderes i smedjen eller under aktiv mine.' }
    }
    case 'MINE_SET_TARGET_SLOT': {
      const r = state.mineRun
      if (!r || r.slots.length === 0) return state
      const n = r.slots.length
      const idx = ((action.index % n) + n) % n
      return { ...state, mineRun: { ...r, targetSlotIndex: idx } }
    }
    case 'MINE_DEAL_DAMAGE': {
      const r = state.mineRun
      if (!r) return state
      const slot = r.slots[action.slotIndex]
      if (!slot || slot.cleared) return state
      if (slot.kind !== 'rock' && slot.kind !== 'mob') return state
      const hp = Math.max(0, slot.currentHp - action.damage)
      const nowCleared = hp <= 0
      const slots = r.slots.map((s, i) =>
        i === action.slotIndex
          ? { ...s, currentHp: nowCleared ? 0 : hp, cleared: nowCleared || s.cleared }
          : s,
      )
      let totalRockSlotsCleared = state.totalRockSlotsCleared
      if (nowCleared && !slot.cleared && slot.kind === 'rock') {
        totalRockSlotsCleared += 1
      }
      let rockSlotsClearedThisRun =
        typeof r.rockSlotsClearedThisRun === 'number' && !Number.isNaN(r.rockSlotsClearedThisRun)
          ? r.rockSlotsClearedThisRun
          : 0
      if (nowCleared && !slot.cleared && slot.kind === 'rock') {
        rockSlotsClearedThisRun += 1
      }
      let nextState: GameState = {
        ...state,
        mineRun: { ...r, slots, rockSlotsClearedThisRun },
        totalRockSlotsCleared,
      }
      if (
        nowCleared &&
        !slot.cleared &&
        slot.kind === 'rock' &&
        !isDevMineGearProtectEnabled()
      ) {
        const pickaxes = nextState.pickaxes.map((p) =>
          p.id === nextState.activePickaxeId
            ? { ...p, durability: Math.max(0, p.durability - 1) }
            : p,
        )
        nextState = { ...nextState, pickaxes }
      }
      return nextState
    }
    case 'MINE_DESCEND_LAYER': {
      const r = state.mineRun
      if (!r || !canDescendFromLayer(r.slots)) return state
      const area = AREAS.find((a) => a.id === r.mineId)
      if (!area || area.kind !== 'mine') return state
      const nextDepth = r.currentDepth + 1
      const slots = generateLayerState({
        area,
        mineId: r.mineId,
        runId: r.runId,
        currentDepth: nextDepth,
        activeCharms: state.activeCharms,
      })
      const unlockedDepths = {
        ...state.unlockedDepths,
        [r.mineId as LocationId]: Math.max(state.unlockedDepths[r.mineId as LocationId] ?? 0, nextDepth),
      }
      const mid: GameState = {
        ...state,
        unlockedDepths,
        mineRun: { ...r, currentDepth: nextDepth, targetSlotIndex: -1, slots },
      }
      return { ...mid, depth: computeWorldTier(mid), gameNotice: null }
    }
    case 'MINE_UPDATE_CHEST_SLOT': {
      const r = state.mineRun
      if (!r) return state
      const empty =
        action.loot.gold <= 0 && action.loot.items.length === 0 && !action.loot.blueprintId
      const slots = r.slots.map((s, i) =>
        i === action.slotIndex && s.kind === 'chest'
          ? {
              ...s,
              chestLoot: action.loot,
              cleared: empty,
              chestOpened: s.chestOpened || Boolean(action.opened),
            }
          : s,
      )
      return { ...state, mineRun: { ...r, slots }, gameNotice: null }
    }
    case 'ADD_COAL': {
      if (action.amount <= 0) return state
      if (state.mineRun && state.runInventory) {
        return appendFoundLoot(state, { kind: 'coal', quantity: action.amount, origin: 'mine' })
      }
      return { ...state, coal: state.coal + action.amount, gameNotice: null }
    }
    case 'ADD_CONSUMABLE': {
      if (action.quantity <= 0) return state
      return addConsumableToState(state, action.consumableId, action.quantity)
    }
    case 'BUY_WORKSHOP_CONSUMABLE': {
      const qty = action.quantity != null && action.quantity > 0 ? action.quantity : 1
      const def = findConsumableDef(action.consumableId)
      if (!def) return state
      const avail = state.workshopStock[action.consumableId] ?? 0
      if (avail < qty) return { ...state, gameNotice: 'Ikke flere på hylden.' }
      const cost = def.price * qty
      if (state.hubInventory.gold < cost) return { ...state, gameNotice: 'Ikke nok guld.' }
      const workshopStock = { ...state.workshopStock, [action.consumableId]: avail - qty }
      const paid = {
        ...patchHubInventory(state, { gold: state.hubInventory.gold - cost }),
        workshopStock,
        gameNotice: null as string | null,
      }
      return addConsumableToState(paid, action.consumableId, qty)
    }
    case 'SET_CONSUMABLE_QUICK_SLOT': {
      const slotIndex = action.slotIndex
      if (slotIndex < 0 || slotIndex > 2) return state
      if (action.consumableId === null) {
        const consumableQuickSlots = [...state.consumableQuickSlots] as [string | null, string | null, string | null]
        consumableQuickSlots[slotIndex] = null
        return { ...state, consumableQuickSlots, gameNotice: null }
      }
      const stack = state.hubInventory.consumables.find((c) => c.consumableId === action.consumableId && c.quantity > 0)
      if (!stack) return { ...state, gameNotice: 'Du har ikke denne vare.' }
      const consumableQuickSlots = [...state.consumableQuickSlots] as [string | null, string | null, string | null]
      consumableQuickSlots[slotIndex] = action.consumableId
      return { ...state, consumableQuickSlots, gameNotice: null }
    }
    case 'USE_CONSUMABLE_QUICK_SLOT': {
      if (!isInActiveMineRun(state)) return { ...state, gameNotice: 'Kun i minen.' }
      const slotIndex = action.slotIndex
      if (slotIndex < 0 || slotIndex > 2) return state
      const consumableId = state.consumableQuickSlots[slotIndex]
      if (!consumableId) return state
      const def = findConsumableDef(consumableId)
      if (!def) return state
      const idx = state.hubInventory.consumables.findIndex((c) => c.consumableId === consumableId)
      if (idx < 0 || state.hubInventory.consumables[idx]!.quantity < 1) return state
      let next = applyConsumableDefToState(state, def)
      const row = next.hubInventory.consumables[idx]!
      const nq = row.quantity - 1
      const consumables =
        nq <= 0
          ? next.hubInventory.consumables.filter((_, i) => i !== idx)
          : next.hubInventory.consumables.map((c, i) => (i === idx ? { ...c, quantity: nq } : c))
      next = patchHubInventory({ ...next, gameNotice: null }, { consumables })
      let consumableQuickSlots = [...next.consumableQuickSlots] as [string | null, string | null, string | null]
      if (nq <= 0 && consumableQuickSlots[slotIndex] === consumableId) consumableQuickSlots[slotIndex] = null
      return { ...next, consumableQuickSlots }
    }
    case 'CRAFT_ALCHEMY_RECIPE': {
      const recipe = findAlchemyRecipe(action.recipeId)
      if (!recipe || !state.unlockedAlchemyRecipes.includes(recipe.id)) return state
      if (computeWorldTier(state) < recipe.requiredWorldTier) {
        return { ...state, gameNotice: `Kræver world tier ${recipe.requiredWorldTier}.` }
      }
      const without = subtractConsumableStacks(state, recipe.ingredients)
      if (!without) return { ...state, gameNotice: 'Mangler ingredienser.' }
      if (!canAddConsumableUnits(without, 1)) {
        return { ...state, gameNotice: `Forbrugs-lager fuldt (${CONSUMABLE_BAG_MAX} stk. max).` }
      }
      const crafted = addConsumableToState(without, recipe.outputConsumableId, 1)
      logTelemetry('alchemy_craft_success', { recipeId: recipe.id, outputConsumableId: recipe.outputConsumableId })
      return crafted
    }
    case 'UNLOCK_ALCHEMY_RECIPE': {
      const recipe = findAlchemyRecipe(action.recipeId)
      if (!recipe) return state
      if (state.unlockedAlchemyRecipes.includes(action.recipeId)) return state
      return {
        ...state,
        unlockedAlchemyRecipes: [...state.unlockedAlchemyRecipes, action.recipeId].sort(),
        gameNotice: null,
      }
    }
    case 'OPEN_CHEST': {
      const withGold = patchHubInventory(state, { gold: state.hubInventory.gold + action.gold })
      const next = applyXpGain({ ...withGold, gameNotice: null }, XP_REWARDS.rockBroken)
      return applyEligibleUnlocks(next)
    }
    case 'DAMAGE_PICKAXE': {
      if (isDevMineGearProtectEnabled()) return state
      const pickaxes = state.pickaxes.map((p) =>
        p.id === state.activePickaxeId
          ? { ...p, durability: Math.max(0, p.durability - action.amount) }
          : p,
      )
      return { ...state, pickaxes }
    }
    case 'REPAIR_PICKAXE': {
      if (action.amount <= 0) return state
      const pickaxes = state.pickaxes.map((p) =>
        p.id === state.activePickaxeId
          ? { ...p, durability: Math.min(p.maxDurability, p.durability + action.amount) }
          : p,
      )
      return { ...state, pickaxes }
    }
    case 'REPAIR_TOOL_WITH_COAL': {
      const tool =
        action.tool === 'pickaxe'
          ? state.pickaxes.find((p) => p.id === action.id)
          : action.tool === 'sword'
            ? state.swords.find((s) => s.id === action.id)
            : state.armours.find((a) => a.id === action.id)
      if (!tool) return { ...state, gameNotice: 'Udstyr ikke fundet.' }
      const missing = tool.maxDurability - tool.durability
      if (missing <= 0) return { ...state, gameNotice: 'Allerede fuld holdbarhed.' }
      const cost = Math.max(1, Math.ceil(missing * (0.1 + tool.tier * 0.055)))
      if (state.coal < cost) {
        return { ...state, gameNotice: `Kræver ${cost} kul (du har ${state.coal}).` }
      }
      if (action.tool === 'pickaxe') {
        const pickaxes = state.pickaxes.map((p) =>
          p.id === action.id ? { ...p, durability: p.maxDurability } : p,
        )
        return { ...state, pickaxes, coal: state.coal - cost, gameNotice: null }
      }
      if (action.tool === 'sword') {
        const swords = state.swords.map((s) => (s.id === action.id ? { ...s, durability: s.maxDurability } : s))
        return { ...state, swords, coal: state.coal - cost, gameNotice: null }
      }
      const armours = state.armours.map((a) => (a.id === action.id ? { ...a, durability: a.maxDurability } : a))
      return clampPlayerSurvival({ ...state, armours, coal: state.coal - cost, gameNotice: null })
    }
    case 'SET_ACTIVE_PICKAXE':
      if (!state.pickaxes.some((p) => p.id === action.id)) return state
      return { ...state, activePickaxeId: action.id }
    case 'CLEAR_GAME_NOTICE':
      return { ...state, gameNotice: null }
    case 'CONSUME_ORE': {
      const next = consumeOre(state, action.metalName, action.quantity)
      return next ?? state
    }
    case 'CONSUME_NUGGET': {
      const next = consumeNugget(state, action.metalName, action.quantity)
      return next ?? state
    }
    case 'CONSUME_INGOT': {
      const next = consumeIngot(state, action.metalName, action.quantity)
      return next ?? state
    }
    case 'CONSUME_ROUGH_STONE': {
      const idx = state.roughStones.findIndex((s) => s.id === action.id)
      if (idx < 0) return state
      const roughStones = [...state.roughStones]
      roughStones.splice(idx, 1)
      return { ...state, roughStones }
    }
    case 'ADD_INGOT':
      return addIngot(state, action.ingot)
    case 'START_SMELTING': {
      const job = startSmeltingJob(action.metalName, action.source, state)
      if (!job) return { ...state, gameNotice: 'Kan ikke starte smeltning.' }
      let next = state
      if (job.source === 'ore') {
        const c = consumeOre(next, job.metalName, job.inputUsed)
        if (!c) return { ...state, gameNotice: 'Kan ikke starte smeltning.' }
        next = c
      } else {
        const c = consumeNugget(next, job.metalName, job.inputUsed)
        if (!c) return { ...state, gameNotice: 'Kan ikke starte smeltning.' }
        next = c
      }
      return { ...next, smeltingJobs: [...next.smeltingJobs, job], gameNotice: null }
    }
    case 'TICK_SMELTING': {
      const now = Date.now()
      let s = state
      const remaining: SmeltingJob[] = []
      for (const job of s.smeltingJobs) {
        if (now - job.startedAt < job.timeMs) {
          remaining.push(job)
          continue
        }
        const ingot: MetalIngot = {
          metalName: job.metalName,
          quantity: 1,
          pixelItem: makeIngotPixelItem(job.metalName),
        }
        const afterIngot = addIngot(s, ingot)
        if (afterIngot.gameNotice === materialsFullNotice(s)) {
          remaining.push(job)
          continue
        }
        s = applyEligibleUnlocks(applyXpGain({ ...afterIngot, gameNotice: null }, XP_REWARDS.oreSmelted))
        const bonusEssence = rollEssenceFromSmelt()
        if (bonusEssence) {
          s = addEssence(s, bonusEssence, 1)
        }
      }
      return { ...s, smeltingJobs: remaining }
    }
    case 'CRAFT_ALLOY': {
      const out = craftAlloy({ a: action.a, b: action.b })
      if (!out) return { ...state, gameNotice: 'Ukendt legering.' }
      const countOf = (m: MetalName) => state.metalIngots.find((i) => i.metalName === m)?.quantity ?? 0
      const needA = 1
      const needB = 1
      if (countOf(action.a) < needA || countOf(action.b) < needB) {
        return { ...state, gameNotice: 'Mangler metalbarer i Lager > Råvarer.' }
      }
      if (action.a === action.b && countOf(action.a) < needA + needB) {
        return { ...state, gameNotice: 'Mangler metalbarer i Lager > Råvarer.' }
      }
      let next = consumeIngot(state, action.a, needA)!
      next = consumeIngot(next, action.b, needB)!
      const after = addIngot(next, {
        metalName: out,
        quantity: 1,
        pixelItem: makeIngotPixelItem(out),
      })
      if (after.gameNotice === materialsFullNotice(state)) {
        return { ...state, gameNotice: materialsFullNotice(state) }
      }
      return { ...after, gameNotice: null }
    }
    case 'CRAFT_GEM_FROM_ROUGH': {
      if (action.ingotSelection.length > 3) return state
      const stone = state.roughStones.find((x) => x.id === action.stoneId)
      if (!stone) return { ...state, gameNotice: 'Rå klippe findes ikke.' }
      let roughEssence: 'dragon_glimmer' | 'rune_dust' | undefined
      const essenceIdToConsume = action.essenceId
      if (essenceIdToConsume) {
        const def = getEssenceDef(essenceIdToConsume)
        const q = state.essences.find((e) => e.essenceId === essenceIdToConsume)?.quantity ?? 0
        if (!def || q < 1) return { ...state, gameNotice: 'Mangler essens.' }
        if (def.id === ESSENCE_IDS.dragonGlimmer && def.useKind === 'rough_craft_fire') {
          roughEssence = 'dragon_glimmer'
        } else if (def.id === ESSENCE_IDS.runeDust && def.useKind === 'rough_craft_rune') {
          roughEssence = 'rune_dust'
        } else {
          return { ...state, gameNotice: 'Denne essens kan ikke bruges ved slibning.' }
        }
      }
      const need = new Map<MetalName, number>()
      for (const m of action.ingotSelection) {
        need.set(m, (need.get(m) ?? 0) + 1)
      }
      for (const [metalName, q] of need) {
        const row = state.metalIngots.find((i) => i.metalName === metalName)
        if (!row || row.quantity < q) return { ...state, gameNotice: 'Ikke nok metalbarer.' }
      }
      let next = state
      for (const [metalName, q] of need) {
        const c = consumeIngot(next, metalName, q)
        if (!c) return { ...state, gameNotice: 'Ikke nok metalbarer.' }
        next = c
      }
      const rs = next.roughStones.findIndex((x) => x.id === action.stoneId)
      if (rs < 0) return state
      const roughStones = [...next.roughStones]
      roughStones.splice(rs, 1)
      next = { ...next, roughStones }
      if (roughEssence && essenceIdToConsume) {
        const c = consumeEssence(next, essenceIdToConsume, 1)
        if (!c) return { ...state, gameNotice: 'Mangler essens.' }
        next = c
      }
      const ingots = [...need.entries()].map(([metalName, quantity]) => ({ metalName, quantity }))
      const purityBonus = state.roughCraftPurityBonus
      const valueCharms = {
        smithEye: state.activeCharms.includes(CHARM_IDS.smithEye),
        deepCalm: state.activeCharms.includes(CHARM_IDS.deepCalm),
      }
      next = { ...next, roughCraftPurityBonus: 0 }
      const gem = craftGemFromRoughStone(
        stone,
        ingots,
        computeWorldTier(next),
        purityBonus,
        valueCharms,
        roughEssence,
      )
      return addGemWithRewards(next, gem)
    }
    case 'BUY_PICKAXE': {
      const offer = findPickaxeOffer(action.tier)
      if (!offer) return state
      if (state.level < offer.minLevel) {
        return { ...state, gameNotice: `Kræver level ${offer.minLevel}.` }
      }
      if (state.hubInventory.gold < offer.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      if (state.pickaxes.some((p) => p.tier === action.tier)) {
        return { ...state, gameNotice: 'Du ejer allerede denne hakke. Reparér den i smedjen.' }
      }
      if (
        state.pickaxes.length + state.swords.length + state.armours.length >=
        state.inventoryCapacity.tools
      ) {
        return { ...state, gameNotice: 'Værktøjslager er fuldt.' }
      }
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const pickaxe = makePickaxe(offer.tier, unique)
      return {
        ...patchHubInventory(state, { gold: state.hubInventory.gold - offer.price }),
        pickaxes: [...state.pickaxes, pickaxe],
        activePickaxeId: pickaxe.id,
        gameNotice: null,
      }
    }
    case 'BUY_SWORD': {
      const offer = findSwordOffer(action.tier)
      if (!offer) return state
      if (state.level < offer.minLevel) {
        return { ...state, gameNotice: `Kræver level ${offer.minLevel}.` }
      }
      if (state.hubInventory.gold < offer.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      if (state.swords.some((s) => s.tier === action.tier)) {
        return { ...state, gameNotice: 'Du ejer allerede dette sværd. Reparér det i smedjen.' }
      }
      if (
        state.pickaxes.length + state.swords.length + state.armours.length >=
        state.inventoryCapacity.tools
      ) {
        return { ...state, gameNotice: 'Værktøjslager er fuldt.' }
      }
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const sword = makeSword(offer.tier, unique)
      return {
        ...patchHubInventory(state, { gold: state.hubInventory.gold - offer.price }),
        swords: [...state.swords, sword],
        activeSwordId: sword.id,
        gameNotice: null,
      }
    }
    case 'BUY_ARMOUR': {
      const offer = findArmourOffer(action.tier)
      if (!offer) return state
      if (state.level < offer.minLevel) {
        return { ...state, gameNotice: `Kræver level ${offer.minLevel}.` }
      }
      if (state.hubInventory.gold < offer.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      if (state.armours.some((a) => a.tier === action.tier)) {
        return { ...state, gameNotice: 'Du ejer allerede denne rustning. Reparér den i smedjen.' }
      }
      if (
        state.pickaxes.length + state.swords.length + state.armours.length >=
        state.inventoryCapacity.tools
      ) {
        return { ...state, gameNotice: 'Værktøjslager er fuldt.' }
      }
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const armour = makeArmour(offer.tier, unique)
      return clampPlayerSurvival({
        ...patchHubInventory(state, { gold: state.hubInventory.gold - offer.price }),
        armours: [...state.armours, armour],
        activeArmourId: armour.id,
        gameNotice: null,
      })
    }
    case 'UPGRADE_SMELTER': {
      const cost = smelterNextUpgradeCost(state.smelterTier)
      if (cost == null) return { ...state, gameNotice: 'Smelter er allerede på maks.' }
      if (state.hubInventory.gold < cost) return { ...state, gameNotice: 'Ikke nok guld.' }
      return {
        ...patchHubInventory(state, { gold: state.hubInventory.gold - cost }),
        smelterTier: state.smelterTier + 1,
        gameNotice: null,
      }
    }
    case 'BUY_CONSUMABLE': {
      const c = findConsumable(action.id)
      if (!c) return state
      if (state.hubInventory.gold < c.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      let next: GameState = {
        ...patchHubInventory(state, { gold: state.hubInventory.gold - c.price }),
        gameNotice: null,
      }
      if (c.id === SHOP_CONSUMABLE_IDS.dynamite) {
        next.instantBreakNextRock = true
      } else if (c.id === SHOP_CONSUMABLE_IDS.whetstone) {
        next.roughCraftPurityBonus = state.roughCraftPurityBonus + 1
      }
      return next
    }
    case 'EXPAND_INVENTORY': {
      const pack = findInventoryPack(action.packId)
      if (!pack) return state
      if (state.hubInventory.gold < pack.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      return {
        ...patchHubInventory(state, { gold: state.hubInventory.gold - pack.price }),
        inventoryCapacity: {
          gems: state.inventoryCapacity.gems + pack.gems,
          materials: state.inventoryCapacity.materials + pack.materials,
          tools: state.inventoryCapacity.tools + pack.tools,
        },
        gameNotice: null,
      }
    }
    case 'BUY_CHARM': {
      const ch = findCharm(action.charmId)
      if (!ch) return state
      if (state.activeCharms.includes(ch.id)) {
        return { ...state, gameNotice: 'Du ejer allerede denne charm.' }
      }
      if (state.level < ch.minLevel) {
        return { ...state, gameNotice: `Kræver level ${ch.minLevel}.` }
      }
      if (state.hubInventory.gold < ch.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      return {
        ...patchHubInventory(state, { gold: state.hubInventory.gold - ch.price }),
        activeCharms: [...state.activeCharms, ch.id],
        gameNotice: null,
      }
    }
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
      if (state.hubInventory.gold < bp.shopPrice) {
        return { ...state, gameNotice: 'Ikke nok guld.' }
      }
      return {
        ...patchHubInventory(state, { gold: state.hubInventory.gold - bp.shopPrice }),
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
    case 'CONSUME_DYNAMITE':
      if (!state.instantBreakNextRock) return state
      return { ...state, instantBreakNextRock: false }
    case 'CRAFT_JEWELRY': {
      const recipe = findJewelryRecipe(action.recipeId)
      if (!recipe) return state
      if (state.level < recipe.level) {
        return { ...state, gameNotice: `Kræver level ${recipe.level}.` }
      }
      const gem = state.gems.find((g) => g.id === action.gemId)
      if (!gem) return { ...state, gameNotice: 'Ædelsten findes ikke.' }
      if (!gemMatchesRecipe(gem, recipe)) {
        return { ...state, gameNotice: 'Ædelsten opfylder ikke opskriftens krav.' }
      }
      const essenceIdToUse = action.essenceId
      let goldMult = 1
      if (essenceIdToUse) {
        const ed = getEssenceDef(essenceIdToUse)
        if (!ed || ed.useKind !== 'jewelry_gold_boost' || ed.id !== ESSENCE_IDS.aetherMote) {
          return { ...state, gameNotice: 'Essensen passer ikke til smykkesmedning.' }
        }
        if ((state.essences.find((e) => e.essenceId === essenceIdToUse)?.quantity ?? 0) < 1) {
          return { ...state, gameNotice: 'Mangler Æterisk kime.' }
        }
        goldMult = 1.1
      }
      const needs = recipeIngotRequirements(recipe)
      for (const { metalName, quantity } of needs) {
        const row = state.metalIngots.find((i) => i.metalName === metalName)
        if (!row || row.quantity < quantity) {
          return { ...state, gameNotice: 'Ikke nok metalbarer til opskriften.' }
        }
      }
      let next = state
      for (const { metalName, quantity } of needs) {
        const c = consumeIngot(next, metalName, quantity)
        if (!c) return { ...state, gameNotice: 'Ikke nok metalbarer til opskriften.' }
        next = c
      }
      if (essenceIdToUse) {
        const c = consumeEssence(next, essenceIdToUse, 1)
        if (!c) return { ...state, gameNotice: 'Mangler Æterisk kime.' }
        next = c
      }
      const gems = next.gems.filter((g) => g.id !== gem.id)
      next = { ...next, gems }
      const rim = primaryMetalForRecipe(recipe.requires.ingot)
      const blueprintId = blueprintFromLegacyRecipeId(recipe.id)
      const timestamp = new Date().toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const gemRef = { id: gem.id, name: gem.name }
      const piece: Jewelry = {
        id: `jewelry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        recipeId: recipe.id,
        blueprintId,
        name: recipe.name,
        gemUsed: gemRef,
        gemsUsed: [gemRef],
        ingotsUsed: needs,
        goldValue: Math.floor(recipe.goldValue * goldMult),
        reputationValue: recipe.reputation,
        pixelItem: makeJewelryPixelItemV2(blueprintId, [gem], rim),
        voxelData: buildJewelryVoxel3d(blueprintId, [gem], rim),
        timestamp,
      }
      next = {
        ...next,
        jewelry: [piece, ...next.jewelry],
        totalJewelryCrafted: next.totalJewelryCrafted + 1,
        gameNotice: null,
      }
      return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.jewelryCrafted))
    }
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
      if (new Set(action.gemIds).size !== action.gemIds.length) {
        return { ...state, gameNotice: 'Samme ædelsten kan ikke bruges flere gange.' }
      }
      const gems = action.gemIds.map((id) => state.gems.find((g) => g.id === id)).filter(Boolean) as Gem[]
      if (gems.length !== action.gemIds.length) {
        return { ...state, gameNotice: 'En eller flere ædelsten findes ikke.' }
      }
      for (const g of gems) {
        if (!gemMatchesBlueprint(g, bp)) {
          return { ...state, gameNotice: 'Mindst én sten opfylder ikke blueprintets krav (renhed/magi).' }
        }
      }
      const essenceIdToUse = action.essenceId
      let goldMult = 1
      if (essenceIdToUse) {
        const ed = getEssenceDef(essenceIdToUse)
        if (!ed || ed.useKind !== 'jewelry_gold_boost' || ed.id !== ESSENCE_IDS.aetherMote) {
          return { ...state, gameNotice: 'Essensen passer ikke til smykkesmedning.' }
        }
        if ((state.essences.find((e) => e.essenceId === essenceIdToUse)?.quantity ?? 0) < 1) {
          return { ...state, gameNotice: 'Mangler Æterisk kime.' }
        }
        goldMult = 1.1
      }
      const needs = blueprintIngotRequirements(bp)
      for (const { metalName, quantity } of needs) {
        const row = state.metalIngots.find((i) => i.metalName === metalName)
        if (!row || row.quantity < quantity) {
          return { ...state, gameNotice: 'Ikke nok metalbarer til opskriften.' }
        }
      }
      let next = state
      for (const { metalName, quantity } of needs) {
        const c = consumeIngot(next, metalName, quantity)
        if (!c) return { ...state, gameNotice: 'Ikke nok metalbarer til opskriften.' }
        next = c
      }
      if (essenceIdToUse) {
        const c = consumeEssence(next, essenceIdToUse, 1)
        if (!c) return { ...state, gameNotice: 'Mangler Æterisk kime.' }
        next = c
      }
      const gemIdSet = new Set(action.gemIds)
      next = { ...next, gems: next.gems.filter((g) => !gemIdSet.has(g.id)) }
      const rim = primaryMetalForBlueprint(bp)
      const timestamp = new Date().toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const gemsUsed = gems.map((g) => ({ id: g.id, name: g.name }))
      const gemUsed = gemsUsed[0]!
      const piece: Jewelry = {
        id: `jewelry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        recipeId: bp.id,
        blueprintId: bp.id,
        name: bp.name,
        gemUsed,
        gemsUsed,
        ingotsUsed: needs,
        goldValue: Math.floor(bp.goldValue * goldMult),
        reputationValue: bp.reputation,
        pixelItem: makeJewelryPixelItemV2(bp.id, gems, rim),
        voxelData: buildJewelryVoxel3d(bp.id, gems, rim),
        timestamp,
      }
      next = {
        ...next,
        jewelry: [piece, ...next.jewelry],
        totalJewelryCrafted: next.totalJewelryCrafted + 1,
        gameNotice: null,
      }
      return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.jewelryCrafted))
    }
    case 'SELL_JEWELRY': {
      const idx = state.jewelry.findIndex((j) => j.id === action.id)
      if (idx < 0) return state
      const item = state.jewelry[idx]
      const jewelry = state.jewelry.filter((j) => j.id !== action.id)
      const next: GameState = {
        ...patchHubInventory(state, { gold: state.hubInventory.gold + item.goldValue }),
        jewelry,
        reputation: state.reputation + item.reputationValue,
        gameNotice: null,
      }
      return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.jewelrySold))
    }
    case 'SELL_GEM': {
      const gem = state.gems.find((g) => g.id === action.id)
      if (!gem) return state
      const next: GameState = {
        ...patchHubInventory(state, { gold: state.hubInventory.gold + gem.goldValue }),
        gems: state.gems.filter((g) => g.id !== action.id),
        gameNotice: null,
      }
      return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.gemSold))
    }
    case 'SELL_GEMS_BULK': {
      if (action.ids.length === 0) return state
      const selling = state.gems.filter((g) => action.ids.includes(g.id))
      const totalGold = selling.reduce((s, g) => s + g.goldValue, 0)
      const totalXp = selling.length * XP_REWARDS.gemSold
      const next: GameState = {
        ...patchHubInventory(state, { gold: state.hubInventory.gold + totalGold }),
        gems: state.gems.filter((g) => !action.ids.includes(g.id)),
        gameNotice: null,
      }
      return applyEligibleUnlocks(applyXpGain(next, totalXp))
    }
    case 'SELL_RAW_ORE': {
      const row = state.rawOre.find((o) => o.metalName === action.metalName)
      if (!row) return state
      const price = ORE_SELL_PRICES[action.metalName] ?? 0
      if (price <= 0) return state
      const qty = Math.max(1, Math.min(action.quantity, row.quantity))
      const newRow = { ...row, quantity: row.quantity - qty }
      const rawOre =
        newRow.quantity > 0
          ? state.rawOre.map((o) => (o.metalName === action.metalName ? newRow : o))
          : state.rawOre.filter((o) => o.metalName !== action.metalName)
      const next: GameState = {
        ...patchHubInventory(state, { gold: state.hubInventory.gold + price * qty }),
        rawOre,
        gameNotice: null,
      }
      return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.rawOreSold * qty))
    }
    case 'SELL_NUGGET': {
      const row = state.metalNuggets.find((n) => n.metalName === action.metalName)
      if (!row) return state
      const price = NUGGET_SELL_PRICES[action.metalName] ?? 0
      if (price <= 0) return state
      const qty = Math.max(1, Math.min(action.quantity, row.quantity))
      const newRow = { ...row, quantity: row.quantity - qty }
      const metalNuggets =
        newRow.quantity > 0
          ? state.metalNuggets.map((n) => (n.metalName === action.metalName ? newRow : n))
          : state.metalNuggets.filter((n) => n.metalName !== action.metalName)
      const next: GameState = {
        ...patchHubInventory(state, { gold: state.hubInventory.gold + price * qty }),
        metalNuggets,
        gameNotice: null,
      }
      return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.nuggetSold * qty))
    }
    case 'ADD_ESSENCE': {
      const q = action.quantity ?? 1
      return addEssence(state, action.essenceId, q)
    }
    case 'USE_ESSENCE_MINE': {
      const def = getEssenceDef(action.essenceId)
      if (!def) return state
      if (def.useKind !== 'mine_phoenix' && def.useKind !== 'mine_slumber') {
        return { ...state, gameNotice: 'Denne essens kan ikke bruges som mine-boost.' }
      }
      const spent = consumeEssence(state, action.essenceId, 1)
      if (!spent) return { ...state, gameNotice: 'Du har ikke essensen.' }
      if (def.useKind === 'mine_phoenix') {
        return {
          ...spent,
          pickaxes: spent.pickaxes.map((p) => {
            if (p.id !== spent.activePickaxeId) return p
            const newMax = p.maxDurability + 5
            return { ...p, maxDurability: newMax, durability: newMax }
          }),
          gameNotice: null,
        }
      }
      return {
        ...spent,
        pickaxes: spent.pickaxes.map((p) =>
          p.id === spent.activePickaxeId
            ? {
                ...p,
                durability: Math.min(
                  p.maxDurability,
                  p.durability + Math.floor(p.maxDurability * 0.25),
                ),
              }
            : p,
        ),
        gameNotice: null,
      }
    }
    case 'USE_ESSENCE_CHAMBER': {
      const def = getEssenceDef(action.essenceId)
      if (!def || def.useKind !== 'chamber_moon') {
        return { ...state, gameNotice: 'Kun Månetåre kan aktiveres i essenskammeret.' }
      }
      const spent = consumeEssence(state, action.essenceId, 1)
      if (!spent) return { ...state, gameNotice: 'Du har ikke essensen.' }
      const rest = spent.activeEffects.filter((e) => e.id !== MOON_TEAR_EFFECT_ID)
      return {
        ...spent,
        activeEffects: [
          ...rest,
          { id: MOON_TEAR_EFFECT_ID, expiresAt: Date.now() + 5 * 60 * 1000 },
        ],
        gameNotice: null,
      }
    }
    case 'BUY_ESSENCE_MARKET': {
      if (!isValidEssenceMarketOffer(action.essenceId, action.price)) {
        return { ...state, gameNotice: 'Ugyldigt markedstilbud (ny dag?).' }
      }
      if (state.hubInventory.gold < action.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      return addEssence(
        { ...patchHubInventory(state, { gold: state.hubInventory.gold - action.price }), gameNotice: null },
        action.essenceId,
        1,
      )
    }
    case 'PRUNE_EXPIRED_EFFECTS': {
      const now = Date.now()
      return {
        ...state,
        activeEffects: state.activeEffects.filter((e) => e.expiresAt == null || e.expiresAt > now),
      }
    }
    case 'UNLOCK_ACHIEVEMENTS': {
      if (action.ids.length === 0) return state
      for (const id of action.ids) {
        logTelemetry('achievement_unlock', { id })
      }
      const set = new Set([...state.achievementsUnlocked, ...action.ids])
      let unlockedBlueprints = state.unlockedBlueprints
      if (action.ids.includes('master_jeweler') && !unlockedBlueprints.includes('tiara')) {
        unlockedBlueprints = [...unlockedBlueprints, 'tiara'].sort()
      }
      return { ...state, achievementsUnlocked: [...set].sort(), unlockedBlueprints }
    }
    case 'DEV_BULK_RANDOM_GEMS': {
      if (!ENABLE_DEV_CHEATS) return state
      const maxAdd = Math.min(Math.max(0, action.count), 300)
      let next = state
      for (let i = 0; i < maxAdd; i++) {
        if (next.gems.length >= next.inventoryCapacity.gems) break
        const gem = createRandomGem(computeWorldTier(next))
        next = {
          ...next,
          gems: [gem, ...next.gems],
          totalGemsFound: next.totalGemsFound + 1,
          gameNotice: null,
        }
      }
      return next
    }
    default:
      return state
  }
}
