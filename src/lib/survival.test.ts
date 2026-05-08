import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { reducer, initialState } from './gameState'
import {
  applyDamageToPlayer,
  applySafeZoneRegen,
  clampPlayerSurvival,
  isInActiveMineRun,
  NEUTRAL_MANA_MAX,
} from './survival'

function mineRunStub(mineId: GameState['currentArea']): NonNullable<GameState['mineRun']> {
  return {
    runId: 'test-run',
    mineId,
    currentDepth: 0,
    rockSlotsClearedThisRun: 0,
    targetSlotIndex: 0,
    slots: [],
  }
}

describe('isInActiveMineRun', () => {
  it('er sand kun i location + mine-area + matchende mineRun', () => {
    const base: GameState = {
      ...initialState,
      viewMode: 'location',
      currentArea: 'kobbermine',
      mineRun: mineRunStub('kobbermine'),
    }
    expect(isInActiveMineRun(base)).toBe(true)
    expect(isInActiveMineRun({ ...base, viewMode: 'map' })).toBe(false)
    expect(isInActiveMineRun({ ...base, mineRun: null })).toBe(false)
    expect(isInActiveMineRun({ ...base, mineRun: mineRunStub('jernkloeften') })).toBe(false)
    expect(isInActiveMineRun({ ...base, currentArea: 'smedjen', mineRun: mineRunStub('kobbermine') })).toBe(false)
  })
})

describe('applyDamageToPlayer', () => {
  it('skader kun i aktiv mine-run', () => {
    const inMine: GameState = {
      ...initialState,
      viewMode: 'location',
      currentArea: 'kobbermine',
      mineRun: mineRunStub('kobbermine'),
      playerHp: 100,
      playerHpMax: 100,
    }
    const damaged = applyDamageToPlayer(inMine, 30)
    expect(damaged.playerHp).toBe(70)

    const onMap = { ...inMine, viewMode: 'map' as const }
    expect(applyDamageToPlayer(onMap, 30).playerHp).toBe(100)
  })
})

describe('applySafeZoneRegen + reducer', () => {
  it('genopfylder HP/mana ved CHANGE_LOCATION til ikke-mine', () => {
    const low: GameState = {
      ...initialState,
      playerHp: 10,
      playerMana: 5,
      currentArea: 'kobbermine',
    }
    const next = reducer(low, { type: 'CHANGE_LOCATION', location: 'smedjen' })
    expect(next.playerHp).toBe(next.playerHpMax)
    expect(next.playerMana).toBe(next.playerManaMax)
  })

  it('genopfylder ikke HP ved skift til mine-lokation', () => {
    const low: GameState = {
      ...initialState,
      playerHp: 10,
      playerMana: 5,
      currentArea: 'smedjen',
    }
    const next = reducer(low, { type: 'CHANGE_LOCATION', location: 'kobbermine' })
    expect(next.playerHp).toBe(10)
    expect(next.playerMana).toBe(5)
  })

  it('MINE_RUN_ENTER sætter fuld HP/mana (neutral eller brew-max)', () => {
    const low: GameState = {
      ...initialState,
      playerHp: 12,
      playerMana: 3,
      mineRun: null,
      currentArea: 'kobbermine',
    }
    const next = reducer(low, { type: 'MINE_RUN_ENTER', mineId: 'kobbermine' })
    expect(next.mineRun).not.toBeNull()
    expect(next.playerHp).toBe(next.playerHpMax)
    expect(next.playerMana).toBe(next.playerManaMax)
  })

  it('MINE_RUN_ENTER med aktiv brew fylder mana op til brew-cap', () => {
    const low: GameState = {
      ...initialState,
      playerHp: 12,
      playerMana: 3,
      playerManaMax: 65,
      activeBrewId: 'brew_solar_vigor',
      mineRun: null,
      currentArea: 'kobbermine',
    }
    const next = reducer(low, { type: 'MINE_RUN_ENTER', mineId: 'kobbermine' })
    expect(next.playerMana).toBe(65)
    expect(next.playerManaMax).toBe(65)
  })
})

describe('clampPlayerSurvival', () => {
  it('klamper HP og mana til max og min 1 på max-felter', () => {
    const s = clampPlayerSurvival({
      ...initialState,
      activeBrewId: null,
      playerHpMax: 0,
      playerManaMax: 0,
      playerHp: 500,
      playerMana: 999,
    })
    expect(s.playerHpMax).toBe(1)
    expect(s.playerManaMax).toBe(NEUTRAL_MANA_MAX)
    expect(s.playerHp).toBe(1)
    expect(s.playerMana).toBe(NEUTRAL_MANA_MAX)
  })
})

describe('applySafeZoneRegen', () => {
  it('sætter HP til max og neutral mana; rydder aktiv brew (hub)', () => {
    const s = applySafeZoneRegen({
      ...initialState,
      playerHp: 1,
      playerHpMax: 80,
      playerMana: 2,
      playerManaMax: 65,
      activeBrewId: 'brew_solar_vigor',
    })
    expect(s.playerHp).toBe(80)
    expect(s.playerMana).toBe(NEUTRAL_MANA_MAX)
    expect(s.playerManaMax).toBe(NEUTRAL_MANA_MAX)
    expect(s.activeBrewId).toBeNull()
  })
})
