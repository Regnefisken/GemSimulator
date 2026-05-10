import { describe, expect, it } from 'vitest'
import type { RawOre } from '../types'
import {
  LOOT_SPAWN_EDGE_MARGIN,
  spawnPositionsAround,
  worldLootKindScale,
} from './lootEntities'

describe('worldLootKindScale', () => {
  const emptyPixel = { data: [] as string[], colorMap: {} }

  it('malm mindre end kul; skala under ædelsten-reference', () => {
    expect(worldLootKindScale({ kind: 'coal', quantity: 1, pixelItem: emptyPixel })).toBe(0.4)
    const ore: RawOre = {
      metalName: 'Kobber',
      quantity: 1,
      pixelItem: emptyPixel,
    }
    expect(worldLootKindScale({ kind: 'ore', ore })).toBe(0.33)
    expect(worldLootKindScale({ kind: 'ore', ore })).toBeLessThan(
      worldLootKindScale({ kind: 'coal', quantity: 1, pixelItem: emptyPixel }),
    )
    expect(0.33).toBeLessThan(1)
  })
})

describe('spawnPositionsAround', () => {
  const origin: [number, number, number] = [6.2, 0.55, -4.1]

  it('med spawnClamp: holder XZ inde i spillbar rektangel', () => {
    const playableHalfX = 5
    const playableHalfZ = 5
    const maxAbsX = playableHalfX - LOOT_SPAWN_EDGE_MARGIN
    const maxAbsZ = playableHalfZ - LOOT_SPAWN_EDGE_MARGIN
    const clamp = {
      playableHalfX,
      playableHalfZ,
    }
    for (let k = 0; k < 40; k++) {
      const pos = spawnPositionsAround(origin, 1, Math.random, clamp)[0]!
      expect(Math.abs(pos[0])).toBeLessThanOrEqual(maxAbsX + 1e-6)
      expect(Math.abs(pos[2])).toBeLessThanOrEqual(maxAbsZ + 1e-6)
    }
  })
})
