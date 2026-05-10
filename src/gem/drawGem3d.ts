import type { ColorMap, Voxel3DGrid } from '../types'
import { mirrorGemDataHorizontally } from './generate'

type GemVoxelSource = { data: string[]; colorMap: ColorMap }

/**
 * Bygger et lille 3D-voxel-grid fra en ædelstens 2D-pixelplade:
 * forrest fuld facet, mellemlag som kant (O), bagside samme rigdom som forsiden
 * (horisontalt spejlet facet-plade — typisk symmetrisk som en slibes bagside).
 */
export function buildGemVoxel3d(gem: GemVoxelSource, depth = 3): Voxel3DGrid {
  const { data, colorMap } = gem
  if (!data.length) {
    return { depth: 1, layers: [['.']], colorMap }
  }

  const layers: string[][] = []
  layers.push(data.map((row) => row))

  for (let z = 1; z < depth - 1; z++) {
    layers.push(
      data.map((row) =>
        row
          .split('')
          .map((c) => (c === '.' ? '.' : 'O'))
          .join(''),
      ),
    )
  }

  layers.push(mirrorGemDataHorizontally(data))

  return { depth: layers.length, layers, colorMap }
}
