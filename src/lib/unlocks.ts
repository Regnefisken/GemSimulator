import { AREAS } from '../data/areas'
import type { GameState } from '../types'

function meetsRequirements(state: GameState, area: (typeof AREAS)[number]): boolean {
  if (area.unlockedByDefault) return true
  const req = area.requirement
  if (!req) return false
  if (req.level !== undefined && state.level < req.level) return false
  if (req.reputation !== undefined && state.reputation < req.reputation) return false
  if (req.gold !== undefined && state.hubInventory.gold < req.gold) return false
  return true
}

/** Tilføjer alle lokationer der nu opfylder krav (oplåsning er permanent). */
export function applyEligibleUnlocks(state: GameState): GameState {
  const set = new Set(state.unlockedLocations)
  let added = false
  for (const area of AREAS) {
    if (set.has(area.id)) continue
    if (meetsRequirements(state, area)) {
      set.add(area.id)
      added = true
    }
  }
  if (!added) return state
  const ordered = AREAS.filter((a) => set.has(a.id)).map((a) => a.id)
  return { ...state, unlockedLocations: ordered }
}
