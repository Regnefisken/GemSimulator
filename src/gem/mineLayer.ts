import type { Area } from '../types'
import { getCaveConfig } from '../types'
import type { MineRunSlotState, MineRunState } from '../lib/mineTypes'
import { rockHpForDepth, rollChestLoot, rollRockEvent, mobHpForDepth, mobSlotChanceForDepth } from './mining'

/** Deterministisk RNG til lag-generering (D3). */
function hashStringToSeed(s: string): number {
  let h = 1779033703
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateLayerState(args: {
  area: Area
  mineId: string
  runId: string
  currentDepth: number
  activeCharms: string[]
}): MineRunSlotState[] {
  const cfg = getCaveConfig(args.area)
  const rng = mulberry32(hashStringToSeed(`${args.runId}|${args.mineId}|${args.currentDepth}`))
  const slots: MineRunSlotState[] = []

  for (let i = 0; i < cfg.oreSlots.length; i++) {
    const event = rollRockEvent(args.area, rng)
    if (event.type === 'chest') {
      const tier = event.chestTier ?? 'wood'
      const chestEntityId = `wc-${args.runId}-${args.currentDepth}-${i}`
      const loot = rollChestLoot(args.area, args.currentDepth, tier, args.activeCharms, rng)
      slots.push({
        slotIndex: i,
        kind: 'chest',
        rockType: 'chest',
        chestTier: tier,
        chestEntityId,
        maxHp: 0,
        currentHp: 0,
        cleared: false,
        chestLoot: loot,
      })
    } else if (rng() < mobSlotChanceForDepth(args.currentDepth)) {
      const maxHp = mobHpForDepth(args.currentDepth, args.area)
      slots.push({
        slotIndex: i,
        kind: 'mob',
        rockType: 'mob',
        mobTier: 1,
        maxHp,
        currentHp: maxHp,
        cleared: false,
      })
    } else {
      const maxHp = Math.floor(rockHpForDepth(args.currentDepth, args.area) * event.hpMultiplier)
      slots.push({
        slotIndex: i,
        kind: 'rock',
        rockType: event.type,
        maxHp,
        currentHp: maxHp,
        cleared: false,
      })
    }
  }
  return slots
}

/** Obligatoriske felter skal være ryddet før nedstigning (D2). Fase 1: alle felter. */
export function isMineSlotMandatory(_s: MineRunSlotState): boolean {
  return true
}

export function canDescendFromLayer(slots: MineRunSlotState[]): boolean {
  return slots.every((s) => !isMineSlotMandatory(s) || s.cleared)
}

export function createInitialMineRun(args: {
  area: Area
  mineId: string
  activeCharms: string[]
}): MineRunState {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return {
    runId,
    mineId: args.mineId,
    currentDepth: 0,
    rockSlotsClearedThisRun: 0,
    targetSlotIndex: -1,
    slots: generateLayerState({
      area: args.area,
      mineId: args.mineId,
      runId,
      currentDepth: 0,
      activeCharms: args.activeCharms,
    }),
  }
}
