import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { reducer, initialState } from './gameState'
import { makeArmour } from '../data/armour'
import { createInitialMineRun } from '../gem/mineLayer'
import { AREAS } from '../data/areas'
import { effectiveTotalHpMax, effectiveTotalManaMax } from './survival'

describe('Fase 5 rustning (D35/D55)', () => {
  it('SET_ACTIVE_ARMOUR øger effektivt HP/mana når rustning har holdbarhed', () => {
    const a = makeArmour(3, 'test')
    const base: GameState = {
      ...initialState,
      armours: [a],
      activeArmourId: null,
    }
    expect(effectiveTotalHpMax(base)).toBe(initialState.playerHpMax)
    const next = reducer(base, { type: 'SET_ACTIVE_ARMOUR', id: a.id })
    expect(effectiveTotalHpMax(next)).toBe(initialState.playerHpMax + (a.bonuses.hpMax ?? 0))
    expect(effectiveTotalManaMax(next)).toBeGreaterThanOrEqual(effectiveTotalManaMax(base))
  })

  it('D55: rustning med durability 0 giver ingen bonus men kan forblive equipped', () => {
    const a = { ...makeArmour(2, 'broken'), durability: 0 }
    const base: GameState = {
      ...initialState,
      armours: [a],
      activeArmourId: a.id,
    }
    expect(effectiveTotalHpMax(base)).toBe(initialState.playerHpMax)
    expect(effectiveTotalManaMax(base)).toBe(effectiveTotalManaMax(initialState))
  })

  it('SET_ACTIVE_ARMOUR under aktiv mine-run afvises', () => {
    const area = AREAS.find((x) => x.id === 'kobbermine')!
    const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
    const a = makeArmour(1, 't')
    const base: GameState = {
      ...initialState,
      viewMode: 'location',
      currentArea: 'kobbermine',
      mineRun: run,
      armours: [a],
      activeArmourId: null,
    }
    const next = reducer(base, { type: 'SET_ACTIVE_ARMOUR', id: a.id })
    expect(next.gameNotice).toMatch(/Rustning kan kun skiftes/)
    expect(next.activeArmourId).toBeNull()
  })
})
