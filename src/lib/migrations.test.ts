import { describe, expect, it, vi } from 'vitest'
import { migrateGameState } from '../lib/migrations'
import { initialState } from '../lib/gameState'

describe('migrateGameState v9', () => {
  it('nulstiller gems ved version < 9', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const raw = {
      ...initialState,
      version: 8,
      totalGemsFound: 99,
      gems: [
        {
          id: 'x',
          name: 'Brilliant Rubin',
          purity: 2,
          karat: null,
          data: [],
          colorMap: {},
          timestamp: '',
          isGodTier: false,
          metalInclusions: [],
          magicProperties: [],
          goldValue: 10,
        },
      ],
      roughStones: [{ id: 'r', paletteName: 'Rubin', quality: 'fine' as const, pixelItem: { data: [], colorMap: {} } }],
    }
    const next = migrateGameState(raw, initialState)
    expect(next.gems).toEqual([])
    expect(next.roughStones).toEqual([])
    expect(next.totalGemsFound).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
