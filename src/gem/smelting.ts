import type { GameState, MetalName, RawOre, SmeltingJob, MetalNugget } from '../types'
import {
  NUGGET_PER_INGOT,
  NUGGET_SMELT_TIME_MULTIPLIER,
  ORE_PER_INGOT,
  SMELT_TIME_MS,
  SMELTER_TIERS,
} from '../data/smelterTiers'
import { makeOrePixelItem, makeNuggetPixelItem } from '../data/oreTemplates'

export type SmeltingSource = 'ore' | 'nugget'

function tierForState(state: GameState) {
  const idx = Math.max(0, Math.min(SMELTER_TIERS.length - 1, state.smelterTier - 1))
  return SMELTER_TIERS[idx]
}

export function canSmelt(metalName: MetalName, smelterTier: number): boolean {
  const idx = Math.max(0, Math.min(SMELTER_TIERS.length - 1, smelterTier - 1))
  return SMELTER_TIERS[idx].allowedMetals.includes(metalName)
}

export function startSmeltingJob(
  metalName: MetalName,
  source: SmeltingSource,
  state: GameState,
): SmeltingJob | null {
  const tier = tierForState(state)
  if (!tier.allowedMetals.includes(metalName)) return null

  if (source === 'nugget') {
    const needed = NUGGET_PER_INGOT[metalName]
    if (needed <= 0) return null
    const owned = state.metalNuggets.find((n) => n.metalName === metalName)?.quantity ?? 0
    if (owned < needed) return null
    return {
      id: `smelt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      metalName,
      source: 'nugget',
      inputUsed: needed,
      timeMs: (SMELT_TIME_MS[metalName] * NUGGET_SMELT_TIME_MULTIPLIER) / tier.speedMultiplier,
      startedAt: Date.now(),
    }
  }

  const needed = ORE_PER_INGOT[metalName]
  if (needed <= 0) return null
  const owned = state.rawOre.find((o) => o.metalName === metalName)?.quantity ?? 0
  if (owned < needed) return null
  return {
    id: `smelt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    metalName,
    source: 'ore',
    inputUsed: needed,
    timeMs: SMELT_TIME_MS[metalName] / tier.speedMultiplier,
    startedAt: Date.now(),
  }
}

function mergeOre(rawOre: RawOre[], metalName: MetalName, quantity: number, pixelItem: RawOre['pixelItem']): RawOre[] {
  const idx = rawOre.findIndex((o) => o.metalName === metalName)
  if (idx >= 0) {
    const next = [...rawOre]
    next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }
    return next
  }
  return [...rawOre, { metalName, quantity, pixelItem }]
}

function mergeNugget(
  metalNuggets: MetalNugget[],
  metalName: MetalName,
  quantity: number,
  pixelItem: MetalNugget['pixelItem'],
): MetalNugget[] {
  const idx = metalNuggets.findIndex((n) => n.metalName === metalName)
  if (idx >= 0) {
    const next = [...metalNuggets]
    next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }
    return next
  }
  return [...metalNuggets, { metalName, quantity, pixelItem }]
}

/** Ved genindlæsning: aktive jobs annulleres og input refunderes (ingen offline-smeltning). */
export function refundActiveSmeltingJobs(state: GameState): GameState {
  if (state.smeltingJobs.length === 0) return state
  let rawOre = [...state.rawOre]
  let metalNuggets = [...state.metalNuggets]
  for (const job of state.smeltingJobs) {
    if (job.source === 'ore') {
      rawOre = mergeOre(rawOre, job.metalName, job.inputUsed, makeOrePixelItem(job.metalName))
    } else {
      metalNuggets = mergeNugget(
        metalNuggets,
        job.metalName,
        job.inputUsed,
        makeNuggetPixelItem(job.metalName),
      )
    }
  }
  return { ...state, rawOre, metalNuggets, smeltingJobs: [] }
}
