import type {
  GameState,
  Gem,
  LocationId,
  MetalName,
  MetalNugget,
  MetalIngot,
  Pickaxe,
  RawOre,
  RoughStone,
  SmeltingJob,
  ViewMode,
} from '../types'
import { makePickaxe } from '../data/pickaxes'
import { makeIngotPixelItem } from '../data/oreTemplates'
import { CURRENT_STATE_VERSION } from './migrations'
import { applyXpGain } from './leveling'
import { applyEligibleUnlocks } from './unlocks'
import { XP_REWARDS } from './leveling'
import { startSmeltingJob } from '../gem/smelting'
import { craftAlloy, craftGemFromRoughStone } from '../gem/crafting'

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
  | { type: 'INCREMENT_DEPTH' }
  | { type: 'CONSUME_ORE'; metalName: MetalName; quantity: number }
  | { type: 'CONSUME_NUGGET'; metalName: MetalName; quantity: number }
  | { type: 'CONSUME_ROUGH_STONE'; id: string }
  | { type: 'CONSUME_INGOT'; metalName: MetalName; quantity: number }
  | { type: 'ADD_INGOT'; ingot: MetalIngot }
  | { type: 'START_SMELTING'; metalName: MetalName; source: 'ore' | 'nugget' }
  | { type: 'TICK_SMELTING' }
  | { type: 'CRAFT_ALLOY'; a: MetalName; b: MetalName }
  | { type: 'CRAFT_GEM_FROM_ROUGH'; stoneId: string; ingotSelection: MetalName[] }
  | { type: 'BUY_PICKAXE'; pickaxe: Pickaxe }
  | { type: 'UPGRADE_SMELTER' }
  | { type: 'EXPAND_INVENTORY'; category: 'gems' | 'materials' | 'tools'; amount: number }
  | { type: 'BUY_CHARM'; charmId: string }
  | { type: 'ADD_JEWELRY'; jewelry: { id: string } }
  | { type: 'SELL_JEWELRY'; id: string }
  | { type: 'CLEAR_GAME_NOTICE' }

export function materialsCount(state: GameState): number {
  return (
    state.roughStones.length +
    state.rawOre.reduce((s, o) => s + o.quantity, 0) +
    state.metalNuggets.reduce((s, n) => s + n.quantity, 0) +
    state.metalIngots.reduce((s, i) => s + i.quantity, 0)
  )
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
    return { ...state, gameNotice: 'Råvarer: lager fuldt.' }
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

const starter = makePickaxe(0)

export const initialState: GameState = {
  level: 1,
  xp: 0,
  gold: 0,
  reputation: 0,
  depth: 0,
  totalGemsFound: 0,
  activePickaxeId: starter.id,
  pickaxes: [starter],
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
  unlockedLocations: ['kobbermine', 'smedjen', 'butikken'],
  activeCharms: [],
  activeEffects: [],
  jewelry: [],
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
    return { ...state, gameNotice: 'Råvarer: lager fuldt.' }
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
    return { ...state, gameNotice: 'Råvarer: lager fuldt.' }
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
    case 'CHANGE_LOCATION':
      return { ...state, currentArea: action.location }
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.viewMode }
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
        return { ...state, gameNotice: 'Råvarer: lager fuldt.' }
      }
      return next
    }
    case 'INCREMENT_DEPTH':
      return { ...state, depth: state.depth + 1 }
    case 'DAMAGE_PICKAXE': {
      const pickaxes = state.pickaxes.map((p) =>
        p.id === state.activePickaxeId
          ? { ...p, durability: Math.max(0, p.durability - action.amount) }
          : p,
      )
      return { ...state, pickaxes }
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
        if (afterIngot.gameNotice === 'Råvarer: lager fuldt.') {
          remaining.push(job)
          continue
        }
        s = applyEligibleUnlocks(applyXpGain({ ...afterIngot, gameNotice: null }, XP_REWARDS.oreSmelted))
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
        return { ...state, gameNotice: 'Mangler metalbarer.' }
      }
      if (action.a === action.b && countOf(action.a) < needA + needB) {
        return { ...state, gameNotice: 'Mangler metalbarer.' }
      }
      let next = consumeIngot(state, action.a, needA)!
      next = consumeIngot(next, action.b, needB)!
      const after = addIngot(next, {
        metalName: out,
        quantity: 1,
        pixelItem: makeIngotPixelItem(out),
      })
      if (after.gameNotice === 'Råvarer: lager fuldt.') {
        return { ...state, gameNotice: 'Råvarer: lager fuldt.' }
      }
      return { ...after, gameNotice: null }
    }
    case 'CRAFT_GEM_FROM_ROUGH': {
      if (action.ingotSelection.length > 3) return state
      const stone = state.roughStones.find((x) => x.id === action.stoneId)
      if (!stone) return { ...state, gameNotice: 'Rå klippe findes ikke.' }
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
      const ingots = [...need.entries()].map(([metalName, quantity]) => ({ metalName, quantity }))
      const gem = craftGemFromRoughStone(stone, ingots, next.depth)
      return addGemWithRewards(next, gem)
    }
    default:
      return state
  }
}
