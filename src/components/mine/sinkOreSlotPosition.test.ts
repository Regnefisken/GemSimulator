import { describe, expect, it } from 'vitest'
import { DEFAULT_CAVE_CONFIG } from '../../types'
import { getProceduralMineCaveSeed } from '../../gem/mineCaveContext'
import {
  alignOreSlotYToCaveFloor,
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

  it('sinkOreSlotWorldPosition er konsistent med sink + align', () => {
    const cave = DEFAULT_CAVE_CONFIG
    const seed = getProceduralMineCaveSeed('r', 1)
    const pos = [3.1, 0.48, -2.2] as const
    const extra = -0.03
    const a = alignOreSlotYToCaveFloor(sinkOreSlotPosition(pos, extra), seed, cave)
    const b = sinkOreSlotWorldPosition(pos, extra, seed, cave)
    expect(b).toEqual(a)
  })

  it('oreFootVisualSinkBias: rig åre + stor skala graver ekstra ned', () => {
    expect(oreFootVisualSinkBias()).toBe(0)
    expect(oreFootVisualSinkBias({ rockType: 'rich', meshScaleMultiplier: 1 })).toBeCloseTo(0.032, 6)
    expect(oreFootVisualSinkBias({ rockType: 'hard', meshScaleMultiplier: 1 })).toBe(0)
    expect(oreFootVisualSinkBias({ rockType: 'normal', meshScaleMultiplier: 2 })).toBeCloseTo(0.026, 6)
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
})
