import { describe, expect, it } from 'vitest'
import { buildGemVoxel3d } from './drawGem3d'
import { MAX_VOXEL_INSTANCES } from '../components/VoxelMesh'
import { countVoxels } from './drawJewelry3d'

describe('buildGemVoxel3d', () => {
  it('laver tre lag og bruger samme colorMap', () => {
    const gem = {
      data: ['.OG.', '..D..'],
      colorMap: { O: '#111', G: '#222', D: '#333' },
    }
    const g = buildGemVoxel3d(gem)
    expect(g.depth).toBe(3)
    expect(g.layers).toHaveLength(3)
    expect(g.layers[0]).toEqual(gem.data)
    expect(g.layers[1]).toEqual(['.OO.', '..O..'])
    expect(g.layers[2]).toEqual(['.GO.', '..D..'])
    expect(g.colorMap).toBe(gem.colorMap)
  })

  it('holder voxel-antal under instanceloft for alle skabeloner', async () => {
    const { TEMPLATES } = await import('../data/templates')
    const colorMap = {
      O: '#000',
      D: '#111',
      G: '#222',
      L: '#333',
      W: '#444',
    }
    for (const t of TEMPLATES) {
      const n = countVoxels(buildGemVoxel3d({ data: t.data, colorMap }))
      expect(n, t.shapeName).toBeLessThanOrEqual(MAX_VOXEL_INSTANCES)
    }
  })
})
