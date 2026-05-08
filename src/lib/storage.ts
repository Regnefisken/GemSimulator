import type { GameState } from '../types'
import { migrateGameState, migrateGem } from './migrations'
import { initialState } from './gameState'
import { applyEligibleUnlocks } from './unlocks'
import { refundActiveSmeltingJobs } from '../gem/smelting'
import { logTelemetry } from '../telemetry/localLogger'

const STATE_KEY = 'gem-game-state'
const LEGACY_COLLECTION_KEY = 'gem-collection'

function hydrate(state: GameState): GameState {
  return applyEligibleUnlocks(refundActiveSmeltingJobs(state))
}

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const fromVersion = typeof parsed.version === 'number' ? parsed.version : 'missing'
      const next = hydrate(migrateGameState(parsed, initialState))
      logTelemetry('save_migration_run', { fromVersion, toVersion: next.version })
      return next
    }
    const legacy = localStorage.getItem(LEGACY_COLLECTION_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as unknown
      const gems = Array.isArray(parsed) ? parsed.map(migrateGem) : []
      const next = hydrate(
        migrateGameState(
          { ...initialState, gems, totalGemsFound: gems.length },
          initialState,
        ),
      )
      logTelemetry('save_migration_run', { source: 'legacy_collection', toVersion: next.version })
      return next
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
