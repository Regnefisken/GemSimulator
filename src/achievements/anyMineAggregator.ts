import type { GameState } from '../types'
import { MINE_LOCATION_IDS } from '../lib/worldTier'

/**
 * D44: aggregat for "any mine"-lag — ren read-model uden mutation.
 * `totalRunsCompleted` er 0 indtil evt. `mineRunHistory` (eller tilsvarende) persisteres senere.
 */
export type AnyMineStats = {
  deepestAcrossMines: number
  minesWithProgress: number
  sumRecordedDepths: number
  totalRockSlotsCleared: number
  totalGemsFound: number
  totalRunsCompleted: number
}

export function computeAnyMineStats(state: GameState): AnyMineStats {
  let deepest = 0
  let sumRecordedDepths = 0
  let minesWithProgress = 0

  for (const id of MINE_LOCATION_IDS) {
    const d = state.unlockedDepths[id]
    const v = typeof d === 'number' && d > 0 ? d : 0
    sumRecordedDepths += v
    if (v > 0) minesWithProgress += 1
    if (v > deepest) deepest = v
  }

  const legacyDepth = typeof state.depth === 'number' && state.depth > 0 ? state.depth : 0
  deepest = Math.max(deepest, legacyDepth)

  return {
    deepestAcrossMines: deepest,
    minesWithProgress,
    sumRecordedDepths,
    totalRockSlotsCleared: state.totalRockSlotsCleared,
    totalGemsFound: state.totalGemsFound,
    totalRunsCompleted: 0,
  }
}
