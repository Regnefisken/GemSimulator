import type { GameState } from '../types'
import { migrateGameState, migrateGem } from './migrations'
import { initialState } from './gameState'
import { applyEligibleUnlocks } from './unlocks'
import { refundActiveSmeltingJobs } from '../gem/smelting'

const STATE_KEY = 'gem-game-state'
const LEGACY_COLLECTION_KEY = 'gem-collection'

function hydrate(state: GameState): GameState {
  return applyEligibleUnlocks(refundActiveSmeltingJobs(state))
}

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) {
      return hydrate(migrateGameState(JSON.parse(raw), initialState))
    }
    const legacy = localStorage.getItem(LEGACY_COLLECTION_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as unknown
      const gems = Array.isArray(parsed) ? parsed.map(migrateGem) : []
      return hydrate(
        migrateGameState(
          { ...initialState, gems, totalGemsFound: gems.length },
          initialState,
        ),
      )
    }
  } catch {
    // ignore
  }
  return hydrate({ ...initialState })
}

export function saveState(s: GameState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(s))
    localStorage.removeItem(LEGACY_COLLECTION_KEY)
  } catch {
    // localStorage utilgængelig eller fuld
  }
}
