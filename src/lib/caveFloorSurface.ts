import type { NoiseFunction2D } from 'simplex-noise'
import { createCaveNoise } from './caveSeed'

/** Samme som `CaveWalls` → `createCaveNoise(seed ^ …)`. */
const FLOOR_NOISE_SEED_XOR = 0x51eded01

/**
 * Konstant gulvhøjde — fladt underlag (samme værdi som `rawCaveFloorY` / gulvmesh-hjørner).
 * Tidligere brugte vi rumlig støj her; genoptag sampling i `sampleCaveFloorMeshY` hvis kuperet gulv vender tilbage.
 */
export const FLAT_CAVE_FLOOR_Y = 0.02

export function getCaveFloorNoise2D(caveSeed: number): NoiseFunction2D {
  return createCaveNoise(caveSeed ^ FLOOR_NOISE_SEED_XOR)
}

/**
 * Vertex/forplantnings‑højde for gulvmesh — fladt underlag.
 * Parametre `noise`, `salt`, `worldX`, `worldZ` bevares så kaldere (`CaveWalls`) ikke skal ændres ved evt. genindsættelse af støj.
 */
export function rawCaveFloorY(
  _noise: NoiseFunction2D,
  _salt: number,
  _worldX: number,
  _worldZ: number,
): number {
  return FLAT_CAVE_FLOOR_Y
}

/**
 * Rendret gulvhøjde i (x,z). Ved fladt gulv er den konstant; tidligere matched den PlaneGeometry-trekanter.
 */
export function sampleCaveFloorMeshY(
  _caveSeed: number,
  _halfX: number,
  _halfZ: number,
  _worldX: number,
  _worldZ: number,
): number {
  return FLAT_CAVE_FLOOR_Y
}
