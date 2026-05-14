import { describe, expect, it } from 'vitest'
import { DEFAULT_CAVE_CONFIG } from '../../types'
import { getProceduralMineCaveSeed } from '../../gem/mineCaveContext'
import { getCaveHalfExtents } from '../../lib/caveHalfExtents'
import { sampleCaveFloorMeshY } from '../../lib/caveFloorSurface'
import {
  alignOreSlotYToCaveFloor,
  lootScatterOriginWorldPosition,
  MINE_LOOT_SCATTER_BASE_Y,
  oreFootVisualSinkBias,
  sinkOreSlotPosition,
  sinkOreSlotWorldPosition,
} from './sinkOreSlotPosition'

describe('alignOreSlotYToCaveFloor', () => {
  it('felt ved rumcentrum (0,0): samme gulv som reference → ingen lodret delta', () => {
    const cave = DEFAULT_CAVE_CONFIG
    const seed = getProceduralMineCaveSeed('test-run', 3)
    const sunk = sinkOreSlotPosition([0, 0.48, 0], -0.02)
    const aligned = alignOreSlotYToCaveFloor(sunk, seed, cave)
    expect(aligned[0]).toBe(sunk[0])
    expect(aligned[2]).toBe(sunk[2])
    expect(aligned[1]).toBeCloseTo(sunk[1], 6)
  })

  it('sinkOreSlotWorldPosition er konsistent med sink + align (Y fra gulv‑sample)', () => {
    const cave = DEFAULT_CAVE_CONFIG
    const seed = getProceduralMineCaveSeed('r', 1)
    const pos = [3.1, 0.48, -2.2] as const
    const extra = -0.03
    const { halfX, halfZ } = getCaveHalfExtents(cave)
    const fy = sampleCaveFloorMeshY(seed, halfX, halfZ, pos[0], pos[2])
    const a = alignOreSlotYToCaveFloor(sinkOreSlotPosition([pos[0], fy, pos[2]], extra), seed, cave)
    const b = sinkOreSlotWorldPosition(pos, extra, seed, cave)
    expect(b).toEqual(a)
  })

  it('sinkOreSlotWorldPosition ignorerer legacy pos[1]; bruger gulvhøjde ved (x,z)', () => {
    const cave = DEFAULT_CAVE_CONFIG
    const seed = getProceduralMineCaveSeed('y', 4)
    const { halfX, halfZ } = getCaveHalfExtents(cave)
    const xz = [2.1, -500, -3.4] as const
    const fy = sampleCaveFloorMeshY(seed, halfX, halfZ, xz[0], xz[2])
    const a = sinkOreSlotWorldPosition([xz[0], xz[1], xz[2]], 0, seed, cave)
    const b = sinkOreSlotWorldPosition([xz[0], fy, xz[2]], 0, seed, cave)
    expect(a).toEqual(b)
  })

  it('oreFootVisualSinkBias: rig åre + stor skala graver ekstra ned; krystal løftes lidt', () => {
    expect(oreFootVisualSinkBias()).toBe(0)
    expect(oreFootVisualSinkBias({ rockType: 'rich', meshScaleMultiplier: 1 })).toBeCloseTo(0.032, 6)
    expect(oreFootVisualSinkBias({ rockType: 'hard', meshScaleMultiplier: 1 })).toBe(0)
    expect(oreFootVisualSinkBias({ rockType: 'normal', meshScaleMultiplier: 2 })).toBeCloseTo(0.026, 6)
    expect(oreFootVisualSinkBias({ rockType: 'crystal', meshScaleMultiplier: 1 })).toBeCloseTo(-0.058, 6)
    const richLarge = oreFootVisualSinkBias({ rockType: 'rich', meshScaleMultiplier: 2 })
    expect(richLarge).toBeCloseTo(0.032 + 0.026, 6)
  })

  it('sinkOreSlotWorldPosition med opts har lavere Y end uden (rig)', () => {
    const cave = DEFAULT_CAVE_CONFIG
    const seed = getProceduralMineCaveSeed('x', 2)
    const pos = [2, 0.48, -1] as const
    const extra = -0.05
    const base = sinkOreSlotWorldPosition(pos, extra, seed, cave)
    const rich = sinkOreSlotWorldPosition(pos, extra, seed, cave, {
      rockType: 'rich',
      meshScaleMultiplier: 1,
    })
    expect(rich[1]).toBeLessThan(base[1])
    expect(base[1] - rich[1]).toBeCloseTo(0.032, 6)
  })

  it('chestBase ankrer højere end klippefod (mindre nedgravning)', () => {
    const cave = DEFAULT_CAVE_CONFIG
    const seed = getProceduralMineCaveSeed('chest', 3)
    const pos = [2, 0.48, -1] as const
    const rock = sinkOreSlotWorldPosition(pos, -0.06, seed, cave)
    const chest = sinkOreSlotWorldPosition(pos, -0.06, seed, cave, { anchor: 'chestBase' })
    expect(chest[1]).toBeGreaterThan(rock[1])
  })

  it('mob slot er over klippenedgravning ved samme felt', () => {
    const cave = DEFAULT_CAVE_CONFIG
    const seed = getProceduralMineCaveSeed('moby', 2)
    const pos = [2, 0.48, -1] as const
    const extra = -0.08
    const rock = sinkOreSlotWorldPosition(pos, extra, seed, cave, {
      rockType: 'normal',
      meshScaleMultiplier: 1,
    })
    const mob = sinkOreSlotWorldPosition(pos, extra, seed, cave, {
      rockType: 'mob',
      meshScaleMultiplier: 1.4,
    })
    expect(mob[1]).toBeGreaterThan(rock[1])
  })

  it('små mesh (lav meshScaleMultiplier) løftes lidt ift. standard — mindre «i gulvet»', () => {
    const cave = DEFAULT_CAVE_CONFIG
    const seed = getProceduralMineCaveSeed('smallrock', 1)
    const pos = [1.2, 0.48, -0.8] as const
    const extra = -0.08
    const base = sinkOreSlotWorldPosition(pos, extra, seed, cave, {
      rockType: 'normal',
      meshScaleMultiplier: 1,
    })
    const small = sinkOreSlotWorldPosition(pos, extra, seed, cave, {
      rockType: 'normal',
      meshScaleMultiplier: 0.55,
    })
    expect(small[1]).toBeGreaterThan(base[1])
    expect(small[1] - base[1]).toBeCloseTo((1 - 0.55) * 0.13, 6)
  })

  it('lootScatterOriginWorldPosition: Y er gulv + basis (ikke klippesænkning)', () => {
    const cave = DEFAULT_CAVE_CONFIG
    const seed = getProceduralMineCaveSeed('loot', 1)
    const pos = [4, 0.48, -3] as const
    const { halfX, halfZ } = getCaveHalfExtents(cave)
    const fy = sampleCaveFloorMeshY(seed, halfX, halfZ, pos[0], pos[2])
    const o = lootScatterOriginWorldPosition(pos, seed, cave)
    expect(o[1]).toBeCloseTo(fy + MINE_LOOT_SCATTER_BASE_Y, 6)
    const rock = sinkOreSlotWorldPosition(pos, -0.06, seed, cave)
    expect(o[1]).toBeGreaterThan(rock[1])
  })
})
