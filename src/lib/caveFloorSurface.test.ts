import { describe, expect, it } from 'vitest'
import { FLAT_CAVE_FLOOR_Y, getCaveFloorNoise2D, rawCaveFloorY, sampleCaveFloorMeshY } from './caveFloorSurface'

describe('sampleCaveFloorMeshY', () => {
  it('er konstant over XZ (fladt underlag)', () => {
    const caveSeed = 12345
    const halfX = 8
    const halfZ = 7
    const noise = getCaveFloorNoise2D(caveSeed)
    const salt = caveSeed ^ 0xabc01

    expect(rawCaveFloorY(noise, salt, -3, 4)).toBe(FLAT_CAVE_FLOOR_Y)

    for (const wx of [-7, 0, 3.3, 8]) {
      for (const wz of [-6, 2, 7]) {
        expect(sampleCaveFloorMeshY(caveSeed, halfX, halfZ, wx, wz)).toBeCloseTo(FLAT_CAVE_FLOOR_Y, 7)
      }
    }
  })
})
