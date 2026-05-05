import type { GameState } from '../types'
import { xpToNextLevel } from '../lib/leveling'

/** XP der skal til for at stige præcis `levels` niveauer fra nuværende level/xp. */
export function xpToGainLevels(state: GameState, levels: number): number {
  if (levels <= 0) return 0
  let level = state.level
  let xp = state.xp
  let total = 0
  for (let i = 0; i < levels; i++) {
    const need = xpToNextLevel(level)
    total += need - xp
    xp = 0
    level += 1
  }
  return total
}
