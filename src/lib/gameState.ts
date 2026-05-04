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
import { CURRENT_STATE_VERSION } from './migrations'
import { applyXpGain } from './leveling'
import { applyEligibleUnlocks } from './unlocks'
import { XP_REWARDS } from './leveling'

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
  | { type: 'START_SMELTING'; job: SmeltingJob }
  | { type: 'TICK_SMELTING' }
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
    case 'ADD_GEM': {
      const cap = state.inventoryCapacity.gems
      const atCap = state.gems.length >= cap
      const gems = [action.gem, ...state.gems].slice(0, cap)
      const next: GameState = {
        ...state,
        gems,
        totalGemsFound: state.totalGemsFound + 1,
        gameNotice: atCap ? 'Ædelsten: maks. plads — ældste fjernet.' : null,
      }
      return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.gemCrafted))
    }
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
    default:
      return state
  }
}
