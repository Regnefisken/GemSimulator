import type { ColorMap, Voxel3DGrid } from '../types'

type GemVoxelSource = { data: string[]; colorMap: ColorMap }

/**
 * Bygger et lille 3D-voxel-grid fra en ædelstens 2D-pixelplade:
 * forside + mellemlag (kant `O`) + bagside med **samme (x,y)-layout som forsiden**
 * — så hver søjle matcher gennem tykkelsen (ingen horisontal spejling, som ellers
 * forskøv forsiden/bagsiden visuelt).
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

  layers.push(data.map((row) => row))

  return { depth: layers.length, layers, colorMap }
}

/** Samme volumetrische udvidelse som ædelsten — til malm, rå klipper, klumper, ingots m.m. (`PixelItem`). */
export function buildPixelItemVoxel3d(item: GemVoxelSource, depth = 3): Voxel3DGrid {
  return buildGemVoxel3d(item, depth)
}
