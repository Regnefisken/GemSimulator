import type { Area, CaveConfig } from '../types'
import type { MineRunSlotState, MineRunState } from '../lib/mineTypes'
import {
  drawInteractiveSlotCount,
  drawRoomSize,
  drawRoomTemplate,
  hashStringToSeed,
  mineLayerSeedKey,
  mulberry32,
  resolveEffectiveCaveConfig,
} from './mineCaveContext'
import {
  mobHpForDepth,
  rockHpForDepth,
  rollChestLoot,
  rollChestTier,
  rollMineFieldKind,
  rollMobType,
  rollRockSubtypeForSlot,
} from './mining'

export function generateLayerState(args: {
  area: Area
  mineId: string
  runId: string
  currentDepth: number
  activeCharms: string[]
  /** Hvis udeladt: beregnes via `resolveEffectiveCaveConfig` (samme som UI skal bruge). */
  caveConfig?: CaveConfig
}): MineRunSlotState[] {
  const cfg =
    args.caveConfig ??
    resolveEffectiveCaveConfig({
      area: args.area,
      runId: args.runId,
      mineId: args.mineId,
      currentDepth: args.currentDepth,
    })
  const rng = mulberry32(hashStringToSeed(mineLayerSeedKey(args.runId, args.mineId, args.currentDepth)))
  /** Synkroniser med `resolveEffectiveCaveConfig`: slotCount → skabelon → størrelse. */
  drawInteractiveSlotCount(rng)
  drawRoomTemplate(rng)
  drawRoomSize(rng)

  /**
   * RNG efter slotCount: pr. felt `rollMineFieldKind` → kiste (`rollChestTier` + loot),
   * mob (`rollMobType` + HP), eller klippe (`rollRockSubtypeForSlot`).
   */
  const slots: MineRunSlotState[] = []

  for (let i = 0; i < cfg.oreSlots.length; i++) {
    const field = rollMineFieldKind(args.currentDepth, rng)
    if (field === 'chest') {
      const tier = rollChestTier(rng)
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
    } else if (field === 'mob') {
      const mobType = rollMobType(args.currentDepth, rng)
      const maxHp = mobHpForDepth(args.currentDepth, args.area)
      slots.push({
        slotIndex: i,
        kind: 'mob',
        rockType: 'mob',
        mobTier: 1,
        mobType,
        maxHp,
        currentHp: maxHp,
        cleared: false,
      })
    } else {
      const event = rollRockSubtypeForSlot(args.area, rng)
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

/** Klipper og uhyrer skal ryddes; kister er valgfrie for nedstigning. */
export function isMineSlotMandatory(s: MineRunSlotState): boolean {
  return s.kind !== 'chest'
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
