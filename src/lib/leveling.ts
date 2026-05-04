import type { GameState } from '../types'

export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.55))
}

export const XP_REWARDS = {
  mineHit: 1,
  rockBroken: 8,
  oreSmelted: 5,
  gemCrafted: 12,
  jewelryCrafted: 25,
  jewelrySold: 15,
  gemSold: 8,
  rawOreSold: 1,
  nuggetSold: 3,
}

export function applyXpGain(state: GameState, amount: number): GameState {
  let xp = state.xp + amount
  let level = state.level
  let need = xpToNextLevel(level)
  while (xp >= need) {
    xp -= need
    level += 1
    need = xpToNextLevel(level)
  }
  return { ...state, xp, level }
}
