import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { reducer, initialState } from './gameState'
import { createInitialMineRun } from '../gem/mineLayer'
import { AREAS } from '../data/areas'
import { WORKSHOP_DEFAULT_STOCK } from '../data/consumables'

describe('Fase 3 alkymi & forbrug', () => {
  it('BUY_WORKSHOP_CONSUMABLE trækker guld og hyldelager', () => {
    const base: GameState = {
      ...initialState,
      gold: 1000,
      workshopStock: { ...WORKSHOP_DEFAULT_STOCK },
    }
    const next = reducer(base, { type: 'BUY_WORKSHOP_CONSUMABLE', consumableId: 'cons_bread_minor' })
    expect(next.gold).toBe(1000 - 25)
    expect(next.workshopStock.cons_bread_minor).toBe((WORKSHOP_DEFAULT_STOCK.cons_bread_minor ?? 0) - 1)
    const row = next.consumables.find((c) => c.consumableId === 'cons_bread_minor')
    expect(row?.quantity).toBe(1)
  })

  it('MINE_RUN_EXIT fylder værkstedshylder igen (D39)', () => {
    const base: GameState = {
      ...initialState,
      workshopStock: { cons_bread_minor: 1 },
    }
    const next = reducer(base, { type: 'MINE_RUN_EXIT' })
    expect(next.workshopStock).toEqual(WORKSHOP_DEFAULT_STOCK)
  })

  it('USE_CONSUMABLE_QUICK_SLOT uden aktiv mine giver besked', () => {
    const base: GameState = {
      ...initialState,
      consumables: [{ consumableId: 'cons_bread_minor', quantity: 1 }],
      consumableQuickSlots: ['cons_bread_minor', null, null],
    }
    const next = reducer(base, { type: 'USE_CONSUMABLE_QUICK_SLOT', slotIndex: 0 })
    expect(next.gameNotice).toMatch(/Kun i minen/)
    expect(next.consumables[0]?.quantity).toBe(1)
  })

  it('USE_CONSUMABLE_QUICK_SLOT i mine bruger genstand og helbreder', () => {
    const area = AREAS.find((a) => a.id === 'kobbermine')!
    const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
    const base: GameState = {
      ...initialState,
      viewMode: 'location',
      currentArea: 'kobbermine',
      mineRun: run,
      playerHp: 10,
      playerHpMax: 100,
      consumables: [{ consumableId: 'cons_bread_minor', quantity: 2 }],
      consumableQuickSlots: ['cons_bread_minor', null, null],
    }
    const next = reducer(base, { type: 'USE_CONSUMABLE_QUICK_SLOT', slotIndex: 0 })
    expect(next.playerHp).toBeGreaterThan(10)
    const row = next.consumables.find((c) => c.consumableId === 'cons_bread_minor')
    expect(row?.quantity).toBe(1)
  })
})
