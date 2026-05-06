import { describe, expect, it } from 'vitest'
import type { Gem, GameState, MetalIngot } from '../types'
import { findBlueprint } from '../data/blueprints'
import { reducer, initialState } from './gameState'
import { gemMatchesBlueprint } from '../data/jewelry'

function testGem(id: string, overrides: Partial<Gem> = {}): Gem {
  return {
    id,
    name: 'Rubin',
    shapeName: 'Brilliant',
    paletteName: 'Rubin',
    purity: 3,
    karat: null,
    data: [],
    colorMap: { G: '#ef4444' },
    timestamp: '',
    isGodTier: false,
    metalInclusions: [],
    magicProperties: [],
    goldValue: 50,
    ...overrides,
  }
}

describe('CRAFT_JEWELRY_V2', () => {
  it('forbruger gems og barer og opretter smykke', () => {
    const g = testGem('gem-a', { purity: 2 })
    const base: GameState = {
      ...initialState,
      level: 10,
      unlockedBlueprints: [...initialState.unlockedBlueprints],
      gems: [g],
      metalIngots: [
        {
          metalName: 'Kobber',
          quantity: 5,
          pixelItem: { data: ['.'], colorMap: {} },
        } satisfies MetalIngot,
      ],
    }
    const next = reducer(base, {
      type: 'CRAFT_JEWELRY_V2',
      blueprintId: 'simple_band',
      gemIds: ['gem-a'],
    })
    expect(next.jewelry).toHaveLength(1)
    expect(next.gems).toHaveLength(0)
    expect(next.jewelry[0]!.blueprintId).toBe('simple_band')
    expect(next.jewelry[0]!.voxelData).toBeDefined()
    expect(next.metalIngots.find((i) => i.metalName === 'Kobber')?.quantity).toBe(4)
    expect(next.totalJewelryCrafted).toBe(base.totalJewelryCrafted + 1)
  })

  it('afviser duplikat gem-id', () => {
    const g = testGem('gem-a', { purity: 3 })
    const base: GameState = {
      ...initialState,
      level: 30,
      unlockedBlueprints: [...initialState.unlockedBlueprints, 'cluster_ring'],
      gems: [g],
      metalIngots: [
        {
          metalName: 'Guld',
          quantity: 5,
          pixelItem: { data: ['.'], colorMap: {} },
        } satisfies MetalIngot,
      ],
    }
    const next = reducer(base, {
      type: 'CRAFT_JEWELRY_V2',
      blueprintId: 'cluster_ring',
      gemIds: ['gem-a', 'gem-a', 'gem-a'],
    })
    expect(next.jewelry).toHaveLength(0)
    expect(next.gameNotice).toMatch(/Samme ædelsten/)
  })
})

describe('UNLOCK_ACHIEVEMENTS (Sprint 6)', () => {
  it('låser tiara-blueprint når master_jeweler opfyldes', () => {
    const base: GameState = {
      ...initialState,
      unlockedBlueprints: initialState.unlockedBlueprints.filter((id) => id !== 'tiara'),
    }
    expect(base.unlockedBlueprints.includes('tiara')).toBe(false)
    const next = reducer(base, { type: 'UNLOCK_ACHIEVEMENTS', ids: ['master_jeweler'] })
    expect(next.achievementsUnlocked).toContain('master_jeweler')
    expect(next.unlockedBlueprints).toContain('tiara')
  })
})

describe('gemMatchesBlueprint (workshop-filtrering)', () => {
  it('kræver magi når blueprint har gemMagicMin', () => {
    const bp = findBlueprint('rune_amulet')!
    const uden = testGem('x', { purity: 4, magicProperties: [] })
    const med = testGem('y', {
      purity: 4,
      magicProperties: [{ name: 'M', icon: '✦', color: '#fff', glow: '#fff', rarity: 'common' }],
    })
    expect(gemMatchesBlueprint(uden, bp)).toBe(false)
    expect(gemMatchesBlueprint(med, bp)).toBe(true)
  })
})
