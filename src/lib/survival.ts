import { AREAS } from '../data/areas'
import type { GameState } from '../types'

/** D38: neutral mana før brews. */
export const NEUTRAL_MANA_MAX = 50

export const DEFAULT_PLAYER_HP_MAX = 100

/**
 * Sand når spilleren er i aktiv mine-run (mine-scene med `mineRun` for samme lokation).
 * Bruges til HUD (D32), regen-undtagelse og senere mob-skade (Fase 2).
 */
export function isInActiveMineRun(state: GameState): boolean {
  if (state.viewMode !== 'location') return false
  const area = AREAS.find((a) => a.id === state.currentArea)
  if (!area || area.kind !== 'mine') return false
  if (!state.mineRun) return false
  return state.mineRun.mineId === state.currentArea
}

/** D16/D17: fuld HP og mana i hub / på kort / ikke-mine lokationer. */
export function applySafeZoneRegen(state: GameState): GameState {
  return {
    ...state,
    playerHp: state.playerHpMax,
    playerMana: state.playerManaMax,
  }
}

export function clampPlayerSurvival(state: GameState): GameState {
  const hpM = Math.max(1, state.playerHpMax)
  const manaM = Math.max(1, state.playerManaMax)
  return {
    ...state,
    playerHpMax: hpM,
    playerManaMax: manaM,
    playerHp: Math.min(Math.max(0, state.playerHp), hpM),
    playerMana: Math.min(Math.max(0, state.playerMana), manaM),
  }
}

/**
 * Fase 2: mob-skade m.m. I MVP kan kaldes uden for aktiv mine-run uden effekt.
 * Nulstilling ved død (D7+D18) tilføjes når døds-flow findes.
 */
export function applyDamageToPlayer(state: GameState, amount: number, _source?: string): GameState {
  if (!isInActiveMineRun(state) || amount <= 0) return state
  const dmg = Math.floor(amount)
  const hp = Math.max(0, state.playerHp - dmg)
  return { ...state, playerHp: hp }
}
