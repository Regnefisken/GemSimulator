import type { GameState } from '../types'
import { computeAnyMineStats, type AnyMineStats } from '../achievements/anyMineAggregator'

let cachedState: GameState | null = null
let cachedStats: AnyMineStats | null = null

/** D44: memoiseret på `state`-reference (Reducer returnerer nyt objekt pr. ændring). */
export function selectAnyMineStats(state: GameState): AnyMineStats {
  if (cachedState === state && cachedStats !== null) {
    return cachedStats
  }
  cachedState = state
  cachedStats = computeAnyMineStats(state)
  return cachedStats
}
