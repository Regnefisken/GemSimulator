import { describe, expect, it } from 'vitest'
import { GRAPHICS_SCHEMA_VERSION } from './graphicsPresets'
import { generateCosmeticRocks } from './mineCosmetics'

const oreSlots: [number, number, number][] = [
  [5, 0.48, -2],
  [-4.2, 0.48, 4.5],
  [1.2, 0.48, -6.5],
  [-6.2, 0.48, -3],
  [6.5, 0.48, 5],
]

describe('generateCosmeticRocks', () => {
  it('samme args + preset → identisk liste', () => {
    const a = generateCosmeticRocks({
      runId: 'r',
      mineId: 'm',
      depth: 2,
      presetId: 'balanced',
      graphicsSchemaVersion: GRAPHICS_SCHEMA_VERSION,
      oreSlots,
      bounds: 9,
      cosmeticRockCount: { min: 5, max: 5 },
    })
    const b = generateCosmeticRocks({
      runId: 'r',
      mineId: 'm',
      depth: 2,
      presetId: 'balanced',
      graphicsSchemaVersion: GRAPHICS_SCHEMA_VERSION,
      oreSlots,
      bounds: 9,
      cosmeticRockCount: { min: 5, max: 5 },
    })
    expect(a).toEqual(b)
  })

  it('forskellig presetId → forskellig kosmetik (typisk)', () => {
    const perf = generateCosmeticRocks({
      runId: 'r',
      mineId: 'm',
      depth: 1,
      presetId: 'performance',
      oreSlots,
      bounds: 9,
      cosmeticRockCount: { min: 8, max: 8 },
      cosmeticLodBias: 1,
    })
    const rich = generateCosmeticRocks({
      runId: 'r',
      mineId: 'm',
      depth: 1,
      presetId: 'rich',
      oreSlots,
      bounds: 9,
      cosmeticRockCount: { min: 8, max: 8 },
      cosmeticLodBias: 1,
    })
    const perfSig = perf.map((x) => x.position.join(',')).join('|')
    const richSig = rich.map((x) => x.position.join(',')).join('|')
    expect(perfSig).not.toBe(richSig)
  })

  it('placeringer holder afstand til oreSlots (XZ)', () => {
    const rocks = generateCosmeticRocks({
      runId: 'x',
      mineId: 'y',
      depth: 0,
      presetId: 'balanced',
      oreSlots,
      bounds: 9,
      cosmeticRockCount: { min: 12, max: 12 },
      cosmeticLodBias: 1,
    })
    for (const r of rocks) {
      for (const p of oreSlots) {
        expect(Math.hypot(r.position[0] - p[0], r.position[2] - p[2])).toBeGreaterThan(2.5 - 1e-6)
      }
    }
  })

  it('rektangulært rum: kosmetiske klipper inden for hvert halv-akse (korridor)', () => {
    const rocks = generateCosmeticRocks({
      runId: 'r',
      mineId: 'm',
      depth: 1,
      presetId: 'balanced',
      oreSlots: [],
      bounds: 9,
      boundsHalfX: 4,
      boundsHalfZ: 18,
      cosmeticRockCount: { min: 24, max: 24 },
      cosmeticLodBias: 1,
    })
    const eps = 0.05
    for (const r of rocks) {
      expect(Math.abs(r.position[0])).toBeLessThanOrEqual(4 * 0.98 + eps)
      expect(Math.abs(r.position[2])).toBeLessThanOrEqual(18 * 0.98 + eps)
    }
  })
})
