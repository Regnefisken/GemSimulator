import { AREAS } from '../data/areas'
import { findBrew } from '../data/brews'
import { isDevMineGearProtectEnabled } from '../dev/devMineGearProtect'
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

/** D38: effektiv mana-ceiling fra aktiv brew eller neutral baseline. */
export function effectiveManaMax(state: GameState): number {
  if (state.activeBrewId) {
    const b = findBrew(state.activeBrewId)
    if (b) return Math.max(1, b.manaMax)
  }
  return NEUTRAL_MANA_MAX
}

function equippedArmourPiece(state: GameState): import('../types').Armour | undefined {
  if (!state.activeArmourId) return undefined
  const a = state.armours.find((x) => x.id === state.activeArmourId)
  if (!a || a.durability <= 0) return undefined
  return a
}

/** Bonus HP fra aktiv rustning med durability > 0 (D35). */
export function armourHpBonus(state: GameState): number {
  const a = equippedArmourPiece(state)
  return Math.max(0, a?.bonuses.hpMax ?? 0)
}

/** Bonus mana-cap fra aktiv rustning (D35). */
export function armourManaBonus(state: GameState): number {
  const a = equippedArmourPiece(state)
  return Math.max(0, a?.bonuses.manaMax ?? 0)
}

/** Samlet HP-loft: intrinsisk `playerHpMax` + rustning. */
export function effectiveTotalHpMax(state: GameState): number {
  const intrinsic = Math.max(1, state.playerHpMax)
  return intrinsic + armourHpBonus(state)
}

/** Samlet mana-loft: brew/neutral + rustning. */
export function effectiveTotalManaMax(state: GameState): number {
  return Math.max(1, effectiveManaMax(state) + armourManaBonus(state))
}

/**
 * D16/D17 + Fase 4 D36: fuld HP og mana i hub; aktiv brew nulstilles (`until_swap` slutter ved hub).
 */
export function applySafeZoneRegen(state: GameState): GameState {
  const cleared = { ...state, activeBrewId: null }
  const hpCap = effectiveTotalHpMax(cleared)
  const manaCap = effectiveTotalManaMax(cleared)
  return clampPlayerSurvival({
    ...cleared,
    playerHp: hpCap,
    playerMana: manaCap,
  })
}

export function clampPlayerSurvival(state: GameState): GameState {
  const hpIntrinsic = Math.max(1, state.playerHpMax)
  const hpCap = effectiveTotalHpMax(state)
  const manaCap = effectiveTotalManaMax(state)
  return {
    ...state,
    playerHpMax: hpIntrinsic,
    playerManaMax: manaCap,
    playerHp: Math.min(Math.max(0, state.playerHp), hpCap),
    playerMana: Math.min(Math.max(0, state.playerMana), manaCap),
  }
}

/**
 * Fase 2: mob-skade m.m. I MVP kan kaldes uden for aktiv mine-run uden effekt.
 * Nulstilling ved død (D7+D18) tilføjes når døds-flow findes.
 */
export function applyDamageToPlayer(state: GameState, amount: number, _source?: string): GameState {
  if (isDevMineGearProtectEnabled()) return state
  if (!isInActiveMineRun(state) || amount <= 0) return state
  const dmg = Math.floor(amount)
  const hp = Math.max(0, state.playerHp - dmg)
  let next: GameState = { ...state, playerHp: hp }
  if (dmg > 0 && next.activeArmourId) {
    const loss = Math.max(1, Math.min(5, Math.ceil(dmg / 6)))
    next = damageEquippedArmourDurability(next, loss)
  }
  return next
}

function damageEquippedArmourDurability(state: GameState, loss: number): GameState {
  const id = state.activeArmourId
  if (!id || loss <= 0) return state
  const armours = state.armours.map((a) =>
    a.id === id ? { ...a, durability: Math.max(0, a.durability - loss) } : a,
  )
  return clampPlayerSurvival({ ...state, armours })
}
