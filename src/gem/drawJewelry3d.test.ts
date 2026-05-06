import { describe, expect, it } from 'vitest'
import type { Gem, MetalName } from '../types'
import { BLUEPRINTS } from '../data/blueprints'
import { buildJewelryVoxel3d, countVoxels } from './drawJewelry3d'

function stubGem(id: string, overrides: Partial<Gem> = {}): Gem {
  return {
    id,
    name: 'Rubin',
    shapeName: 'Brilliant',
    paletteName: 'Rubin',
    purity: 3,
    karat: null,
    data: [],
    colorMap: { G: '#ef4444', D: '#991b1b', L: '#fca5a5', O: '#450a0a', W: '#fecaca' },
    timestamp: '',
    isGodTier: false,
    metalInclusions: [],
    magicProperties: [{ name: 'Test', icon: '✦', color: '#fff', glow: '#fff', rarity: 'common' }],
    goldValue: 100,
    ...overrides,
  }
}

describe('drawJewelry3d', () => {
  it('bygger grid med depth 3 og matchende lag-dimensioner', () => {
    const g = stubGem('a')
    const grid = buildJewelryVoxel3d('simple_band', [g], 'Kobber')
    expect(grid.depth).toBe(3)
    expect(grid.layers).toHaveLength(3)
    const w = grid.layers[0]![0]!.length
    const h = grid.layers[0]!.length
    for (const layer of grid.layers) {
      expect(layer).toHaveLength(h)
      for (const row of layer) {
        expect(row).toHaveLength(w)
      }
    }
    expect(grid.colorMap.B).toMatch(/^#/)
  })

  it('countVoxels for alle blueprints × 3 lag er under MAX_INSTANCES (1024)', () => {
    const rim: MetalName = 'Guld'
    for (const bp of BLUEPRINTS) {
      const gems = Array.from({ length: bp.gemSlots }, (_, i) => stubGem(`gem-${bp.id}-${i}`))
      const grid = buildJewelryVoxel3d(bp.id, gems, rim)
      const n = countVoxels(grid)
      expect(n, bp.id).toBeLessThan(1024)
    }
  })

  it('kaster ved ukendt blueprint', () => {
    expect(() => buildJewelryVoxel3d('does_not_exist', [stubGem('x')], 'Kobber')).toThrow()
  })
})
