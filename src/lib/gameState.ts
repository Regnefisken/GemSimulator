import type {
  GameState,
  Gem,
  Jewelry,
  LocationId,
  MetalName,
  MetalNugget,
  MetalIngot,
  RawOre,
  RoughStone,
  SmeltingJob,
  ViewMode,
} from '../types'
import { AREAS } from '../data/areas'
import { makePickaxe } from '../data/pickaxes'
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
import { ENABLE_DEV_CHEATS } from '../dev/featureFlags'
import { computeWorldTier } from './worldTier'
import {
  applySafeZoneRegen,
  applyDamageToPlayer,
  clampPlayerSurvival,
  DEFAULT_PLAYER_HP_MAX,
  effectiveManaMax,
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
  SHOP_CONSUMABLE_IDS,
  smelterNextUpgradeCost,
} from '../data/shop'
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
  | { type: 'REPAIR_TOOL_WITH_COAL'; tool: 'pickaxe' | 'sword'; id: string }
  | { type: 'INCREMENT_DEPTH' }
  | { type: 'MINE_RUN_ENTER'; mineId: LocationId }
  | { type: 'MINE_RUN_EXIT' }
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
  return state.consumables.reduce((s, c) => s + c.quantity, 0)
}

export function canAddConsumableUnits(state: GameState, qty: number): boolean {
  return qty > 0 && totalConsumableQty(state) + qty <= CONSUMABLE_BAG_MAX
}

function restockWorkshopShelf(state: GameState): GameState {
  return { ...state, workshopStock: { ...WORKSHOP_DEFAULT_STOCK } }
}

function addConsumableToState(state: GameState, consumableId: string, qty: number): GameState {
  const def = findConsumableDef(consumableId)
  if (!def || qty <= 0) return state
  if (totalConsumableQty(state) + qty > CONSUMABLE_BAG_MAX) {
    return { ...state, gameNotice: `Forbrugs-lager fuldt (${CONSUMABLE_BAG_MAX} stk. max).` }
  }
  const idx = state.consumables.findIndex((c) => c.consumableId === consumableId)
  if (idx < 0) {
    return {
      ...state,
      consumables: [...state.consumables, { consumableId, quantity: Math.min(qty, CONSUMABLE_STACK_MAX) }],
      gameNotice: null,
    }
  }
  const row = state.consumables[idx]!
  const nq = Math.min(CONSUMABLE_STACK_MAX, row.quantity + qty)
  const consumables = state.consumables.map((c, i) => (i === idx ? { ...c, quantity: nq } : c))
  return { ...state, consumables, gameNotice: null }
}

function pruneConsumableQuickSlots(state: GameState): GameState {
  const qs = [...state.consumableQuickSlots] as [string | null, string | null, string | null]
  let dirty = false
  for (let i = 0; i < 3; i++) {
    const id = qs[i]
    if (!id) continue
    const ok = state.consumables.some((c) => c.consumableId === id && c.quantity > 0)
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
  let consumables = [...state.consumables]
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
  return pruneConsumableQuickSlots({ ...state, consumables })
}

function applyBrewToState(state: GameState, brewId: string): GameState {
  const brew = findBrew(brewId)
  if (!brew) return state
  return clampPlayerSurvival({
    ...state,
    activeBrewId: brewId,
    playerMana: Math.min(state.playerMana, brew.manaMax),
  })
}

function applyConsumableDefToState(
  state: GameState,
  def: NonNullable<ReturnType<typeof findConsumableDef>>,
): GameState {
  if (def.effect === 'heal_hp') {
    const add = Math.max(0, def.value)
    return { ...state, playerHp: Math.min(state.playerHpMax, state.playerHp + add) }
  }
  if (def.effect === 'heal_mana') {
    const add = Math.max(0, def.value)
    const cap = effectiveManaMax(state)
    return { ...state, playerMana: Math.min(cap, state.playerMana + add) }
  }
  if (def.effect === 'apply_brew') {
    return applyBrewToState(state, def.brewId)
  }
  return state
}

const starter = makePickaxe(0)
const starterSword = makeSword(0)

export const initialState: GameState = {
  level: 1,
  xp: 0,
  gold: 0,
  reputation: 0,
  depth: 0,
  unlockedDepths: {},
  mineRun: null,
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
  consumables: [],
  workshopStock: { ...WORKSHOP_DEFAULT_STOCK },
  consumableQuickSlots: [null, null, null],
  playerHp: DEFAULT_PLAYER_HP_MAX,
  playerHpMax: DEFAULT_PLAYER_HP_MAX,
  playerMana: NEUTRAL_MANA_MAX,
  playerManaMax: NEUTRAL_MANA_MAX,
  activeBrewId: null,
  gameNotice: null,
  version: CURRENT_STATE_VERSION,
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

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'GAIN_XP':
      return applyEligibleUnlocks(applyXpGain(state, action.amount))
    case 'GAIN_REPUTATION':
      return applyEligibleUnlocks({ ...state, reputation: state.reputation + action.amount })
    case 'EARN_GOLD':
      return applyEligibleUnlocks({ ...state, gold: state.gold + action.amount })
    case 'SPEND_GOLD':
      return { ...state, gold: Math.max(0, state.gold - action.amount) }
    case 'PLAYER_TAKE_DAMAGE':
      return applyDamageToPlayer(state, action.amount, action.source)
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
    case 'DAMAGE_SWORD': {
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
      return addGemWithRewards(state, action.gem)
    case 'CLEAR_GEMS':
      return { ...state, gems: [] }
    case 'ADD_ORE':
      return addOre(state, action.ore)
    case 'ADD_NUGGET':
      return addNugget(state, action.nugget)
    case 'ADD_ROUGH_STONE': {
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
        gameNotice: null,
      }
      const manaCap = effectiveManaMax(withRun)
      return clampPlayerSurvival({
        ...withRun,
        playerHp: withRun.playerHpMax,
        playerMana: manaCap,
      })
    }
    case 'MINE_RUN_EXIT':
      return restockWorkshopShelf(applySafeZoneRegen({ ...state, mineRun: null, gameNotice: null }))
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
      let nextState: GameState = { ...state, mineRun: { ...r, slots }, totalRockSlotsCleared }
      if (nowCleared && !slot.cleared && slot.kind === 'rock') {
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
        mineRun: { ...r, currentDepth: nextDepth, targetSlotIndex: 0, slots },
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
      if (state.gold < cost) return { ...state, gameNotice: 'Ikke nok guld.' }
      const workshopStock = { ...state.workshopStock, [action.consumableId]: avail - qty }
      const paid = { ...state, gold: state.gold - cost, workshopStock, gameNotice: null as string | null }
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
      const stack = state.consumables.find((c) => c.consumableId === action.consumableId && c.quantity > 0)
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
      const idx = state.consumables.findIndex((c) => c.consumableId === consumableId)
      if (idx < 0 || state.consumables[idx]!.quantity < 1) return state
      let next = applyConsumableDefToState(state, def)
      const row = next.consumables[idx]!
      const nq = row.quantity - 1
      const consumables =
        nq <= 0 ? next.consumables.filter((_, i) => i !== idx) : next.consumables.map((c, i) => (i === idx ? { ...c, quantity: nq } : c))
      next = { ...next, consumables, gameNotice: null }
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
      return addConsumableToState(without, recipe.outputConsumableId, 1)
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
      const next = applyXpGain(
        { ...state, gold: state.gold + action.gold, gameNotice: null },
        XP_REWARDS.rockBroken,
      )
      return applyEligibleUnlocks(next)
    }
    case 'DAMAGE_PICKAXE': {
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
      const tool = action.tool === 'pickaxe' ? state.pickaxes.find((p) => p.id === action.id) : state.swords.find((s) => s.id === action.id)
      if (!tool) return { ...state, gameNotice: 'Våben ikke fundet.' }
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
      const swords = state.swords.map((s) => (s.id === action.id ? { ...s, durability: s.maxDurability } : s))
      return { ...state, swords, coal: state.coal - cost, gameNotice: null }
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
      if (state.gold < offer.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      if (state.pickaxes.some((p) => p.tier === action.tier)) {
        return { ...state, gameNotice: 'Du ejer allerede denne hakke. Reparér den i smedjen.' }
      }
      if (state.pickaxes.length + state.swords.length >= state.inventoryCapacity.tools) {
        return { ...state, gameNotice: 'Værktøjslager er fuldt.' }
      }
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const pickaxe = makePickaxe(offer.tier, unique)
      return {
        ...state,
        gold: state.gold - offer.price,
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
      if (state.gold < offer.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      if (state.swords.some((s) => s.tier === action.tier)) {
        return { ...state, gameNotice: 'Du ejer allerede dette sværd. Reparér det i smedjen.' }
      }
      if (state.pickaxes.length + state.swords.length >= state.inventoryCapacity.tools) {
        return { ...state, gameNotice: 'Værktøjslager er fuldt.' }
      }
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const sword = makeSword(offer.tier, unique)
      return {
        ...state,
        gold: state.gold - offer.price,
        swords: [...state.swords, sword],
        activeSwordId: sword.id,
        gameNotice: null,
      }
    }
    case 'UPGRADE_SMELTER': {
      const cost = smelterNextUpgradeCost(state.smelterTier)
      if (cost == null) return { ...state, gameNotice: 'Smelter er allerede på maks.' }
      if (state.gold < cost) return { ...state, gameNotice: 'Ikke nok guld.' }
      return {
        ...state,
        gold: state.gold - cost,
        smelterTier: state.smelterTier + 1,
        gameNotice: null,
      }
    }
    case 'BUY_CONSUMABLE': {
      const c = findConsumable(action.id)
      if (!c) return state
      if (state.gold < c.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      let next: GameState = {
        ...state,
        gold: state.gold - c.price,
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
      if (state.gold < pack.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      return {
        ...state,
        gold: state.gold - pack.price,
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
      if (state.gold < ch.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      return {
        ...state,
        gold: state.gold - ch.price,
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
        ...state,
        jewelry,
        gold: state.gold + item.goldValue,
        reputation: state.reputation + item.reputationValue,
        gameNotice: null,
      }
      return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.jewelrySold))
    }
    case 'SELL_GEM': {
      const gem = state.gems.find((g) => g.id === action.id)
      if (!gem) return state
      const next: GameState = {
        ...state,
        gems: state.gems.filter((g) => g.id !== action.id),
        gold: state.gold + gem.goldValue,
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
        ...state,
        gems: state.gems.filter((g) => !action.ids.includes(g.id)),
        gold: state.gold + totalGold,
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
        ...state,
        rawOre,
        gold: state.gold + price * qty,
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
        ...state,
        metalNuggets,
        gold: state.gold + price * qty,
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
      if (state.gold < action.price) return { ...state, gameNotice: 'Ikke nok guld.' }
      return addEssence({ ...state, gold: state.gold - action.price, gameNotice: null }, action.essenceId, 1)
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
