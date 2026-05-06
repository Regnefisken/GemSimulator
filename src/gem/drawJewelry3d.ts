import type { ColorMap, Gem, MetalName, Voxel3DGrid } from '../types'
import { JEWELRY_TEMPLATES } from '../data/jewelryTemplates'
import { METALS } from '../data/metals'
import { darkenColor, lightenColor } from '../data/oreTemplates'
import { resolveColor } from './colorResolver'

/**
 * Bygger 3D voxel-data fra en 2D blueprint-template ved at tilføje dybde-lag.
 *
 * - Lag 0 (Z=0, forrest): fuld template.
 * - Mellemlag: kun metal (r/R/s) → 'r'.
 * - Bagerste lag: kun metal → 'B' (mørkere bagside i colorMap).
 */
export function buildJewelryVoxel3d(
  blueprintId: string,
  gems: Gem[],
  rimMetal: MetalName,
  depth = 3,
): Voxel3DGrid {
  const tmpl = JEWELRY_TEMPLATES[blueprintId]
  if (!tmpl) {
    throw new Error(`Ukendt blueprint: ${blueprintId}`)
  }
  const baseRim = METALS[rimMetal].pixelColor
  const slotChars = ['g', 'h', 'i'] as const

  const colorMap: ColorMap = {
    r: baseRim,
    R: darkenColor(baseRim, 0.3),
    s: lightenColor(baseRim, 0.25),
    B: darkenColor(baseRim, 0.55),
  }
  for (let i = 0; i < gems.length && i < 3; i++) {
    const gem = gems[i]!
    const ch = slotChars[i]!
    const raw =
      resolveColor('G', gem.colorMap) ??
      resolveColor('1', gem.colorMap) ??
      resolveColor('D', gem.colorMap) ??
      '#c084fc'
    colorMap[ch] = typeof raw === 'string' && raw.startsWith('#') ? raw : '#c084fc'
  }

  const layers: string[][] = []
  layers.push(tmpl.data.slice())
  for (let z = 1; z < depth; z++) {
    const isBack = z === depth - 1
    const replaceChar = isBack ? 'B' : 'r'
    const layer = tmpl.data.map((row) =>
      row
        .split('')
        .map((c) => (c === 'r' || c === 'R' || c === 's' ? replaceChar : '.'))
        .join(''),
    )
    layers.push(layer)
  }

  return { depth, layers, colorMap }
}

/** Antal voxels der vil blive renderet (pre-validering mod instancelimit). */
export function countVoxels(grid: Voxel3DGrid): number {
  let n = 0
  for (const layer of grid.layers) {
    for (const row of layer) {
      for (const c of row) {
        if (c !== '.') n++
      }
    }
  }
  return n
}
