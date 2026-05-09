import { describe, expect, it } from 'vitest'
import { AREAS } from '../data/areas'
import { DEFAULT_CAVE_CONFIG } from '../types'
import {
  computeRoomLayout,
  MAX_INTERACTIVE_SLOTS,
  MIN_INTERACTIVE_SLOTS,
  resolveEffectiveCaveConfig,
  scaleClassicOreSlots,
} from './mineCaveContext'

const kobber = AREAS.find((a) => a.id === 'kobbermine')!

describe('resolveEffectiveCaveConfig', () => {
  it('samme runId+dybde giver samme bounds og slotCount', () => {
    const a = resolveEffectiveCaveConfig({
      area: kobber,
      runId: 'r1',
      mineId: 'kobbermine',
      currentDepth: 4,
    })
    const b = resolveEffectiveCaveConfig({
      area: kobber,
      runId: 'r1',
      mineId: 'kobbermine',
      currentDepth: 4,
    })
    expect(a).toEqual(b)
    expect(a.oreSlots.length).toBeGreaterThanOrEqual(MIN_INTERACTIVE_SLOTS)
    expect(a.oreSlots.length).toBeLessThanOrEqual(MAX_INTERACTIVE_SLOTS)
    expect(['classic', 'corridor', 'island', 'dogleg']).toContain(a.template)
    expect(['compact', 'normal', 'expansive']).toContain(a.size)
    expect(a.boundsHalfX ?? a.bounds).toBeGreaterThan(0)
    expect(a.boundsHalfZ ?? a.bounds).toBeGreaterThan(0)
  })
})

describe('computeRoomLayout (dogleg)', () => {
  it('halvakser giver plads til malm-mesh ud over pivot (alle størrelser og slot-antal)', () => {
    const minClear = 0.85
    for (const size of ['compact', 'normal', 'expansive'] as const) {
      for (let n = MIN_INTERACTIVE_SLOTS; n <= MAX_INTERACTIVE_SLOTS; n++) {
        const { oreSlots, boundsHalfX, boundsHalfZ } = computeRoomLayout({
          base: { ...DEFAULT_CAVE_CONFIG, bounds: 9 },
          template: 'dogleg',
          size,
          slotCount: n,
        })
        let maxAx = 0
        let maxAz = 0
        for (const [ox, , oz] of oreSlots) {
          maxAx = Math.max(maxAx, Math.abs(ox))
          maxAz = Math.max(maxAz, Math.abs(oz))
        }
        expect(boundsHalfX).toBeGreaterThanOrEqual(maxAx + minClear)
        expect(boundsHalfZ).toBeGreaterThanOrEqual(maxAz + minClear)
      }
    }
  })
})

describe('scaleClassicOreSlots', () => {
  const base: [number, number, number][] = [
    [5, 0.48, -2],
    [-4.2, 0.48, 4.5],
    [1.2, 0.48, -6.5],
    [-6.2, 0.48, -3],
    [6.5, 0.48, 5],
  ]

  it('bevarer antal når target matcher baseline', () => {
    expect(scaleClassicOreSlots(base, 5)).toHaveLength(5)
  })

  it('skalerer op til flere punkter', () => {
    expect(scaleClassicOreSlots(base, 8)).toHaveLength(8)
  })
})
