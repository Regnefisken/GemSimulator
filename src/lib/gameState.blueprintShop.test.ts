import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { reducer, initialState } from './gameState'

describe('BUY_BLUEPRINT', () => {
  it('trækker guld og tilføjer blueprint', () => {
    const base: GameState = {
      ...initialState,
      level: 15,
      hubInventory: { ...initialState.hubInventory, gold: 2000 },
      unlockedBlueprints: initialState.unlockedBlueprints.filter((id) => id !== 'bangle'),
    }
    const next = reducer(base, { type: 'BUY_BLUEPRINT', blueprintId: 'bangle' })
    expect(next.unlockedBlueprints).toContain('bangle')
    expect(next.hubInventory.gold).toBe(2000 - 600)
    expect(next.gameNotice).toBeNull()
  })

  it('afviser ikke-shop blueprint', () => {
    const next = reducer(initialState, { type: 'BUY_BLUEPRINT', blueprintId: 'tiara' })
    expect(next.unlockedBlueprints).toEqual(initialState.unlockedBlueprints)
    expect(next.gameNotice).toMatch(/kan ikke købes/)
  })
})

describe('UNLOCK_BLUEPRINT', () => {
  it('tilføjer id uden duplikat', () => {
    const base: GameState = {
      ...initialState,
      unlockedBlueprints: ['simple_band'],
    }
    const next = reducer(base, { type: 'UNLOCK_BLUEPRINT', blueprintId: 'tiara' })
    expect(next.unlockedBlueprints).toContain('tiara')
    const next2 = reducer(next, { type: 'UNLOCK_BLUEPRINT', blueprintId: 'tiara' })
    expect(next2.unlockedBlueprints.filter((id) => id === 'tiara').length).toBe(1)
  })
})
