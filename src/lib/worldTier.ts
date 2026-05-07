import type { GameState, LocationId } from '../types'

const MINE_IDS: LocationId[] = [
  'kobbermine',
  'jernkloeften',
  'soelvhulen',
  'guldgrotten',
  'mithrilbjerget',
  'rune-dybet',
]

/** D10: meta-tier til crafting m.m. — max af legacy `depth` og per-mine `unlockedDepths`. */
export function computeWorldTier(state: GameState): number {
  let maxU = 0
  for (const id of MINE_IDS) {
    const v = state.unlockedDepths[id]
    if (typeof v === 'number' && v > maxU) maxU = v
  }
  return Math.max(state.depth, maxU)
}

export function isMineLocationId(id: string): id is LocationId {
  return (MINE_IDS as string[]).includes(id)
}
