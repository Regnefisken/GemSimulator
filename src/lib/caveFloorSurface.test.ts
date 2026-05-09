import { describe, expect, it } from 'vitest'
import { getCaveFloorNoise2D, rawCaveFloorY, sampleCaveFloorMeshY } from './caveFloorSurface'

describe('sampleCaveFloorMeshY', () => {
  it('matcher diskrete hjørnehøjder (gitter‑hjørner)', () => {
    const caveSeed = 12345
    const salt = caveSeed ^ 0xabc01
    const halfX = 8
    const halfZ = 7
    const noise = getCaveFloorNoise2D(caveSeed)

    for (let ix = 0; ix <= 8; ix += 2) {
      for (let iy = 0; iy <= 8; iy += 2) {
        const wx = -halfX + (ix / 8) * (2 * halfX)
        const wz = -halfZ + (iy / 8) * (2 * halfZ)
        const expected = rawCaveFloorY(noise, salt, wx, wz)
        const sampled = sampleCaveFloorMeshY(caveSeed, halfX, halfZ, wx, wz)
        expect(sampled).toBeCloseTo(expected, 5)
      }
    }
  })
})
