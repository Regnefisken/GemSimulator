import type { NoiseFunction2D } from 'simplex-noise'
import { createCaveNoise } from './caveSeed'

/** Samme som `CaveWalls` → `createCaveNoise(seed ^ …)`. */
const FLOOR_NOISE_SEED_XOR = 0x51eded01
/** Samme salt som gulv‑mesh i `makeHorizontalPlane` (floor‑gren). */
const FLOOR_SALT_XOR = 0xabc01

const FLOOR_SEGMENTS = 8

export function getCaveFloorNoise2D(caveSeed: number): NoiseFunction2D {
  return createCaveNoise(caveSeed ^ FLOOR_NOISE_SEED_XOR)
}

/** Vertex/forplantnings‑højde — samme formel som gulvets diskrete hjørner. */
export function rawCaveFloorY(
  noise: NoiseFunction2D,
  salt: number,
  worldX: number,
  worldZ: number,
): number {
  const n = noise(worldX * 0.35 + salt * 0.001, worldZ * 0.35 + salt * 0.002)
  return n * 0.35 + 0.02
}

function worldXZOnFloorGrid(halfX: number, halfZ: number, ix: number, iy: number) {
  const wx = -halfX + (ix / FLOOR_SEGMENTS) * (2 * halfX)
  /** Matcher `PlaneGeometry(width, depth)` → `(x,-y,0)` + `rotateX(-π/2)` → verdens‑z = −planeY. */
  const wz = -halfZ + (iy / FLOOR_SEGMENTS) * (2 * halfZ)
  return { wx, wz }
}

function barycentricXZ(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
): { wa: number; wb: number; wc: number } | null {
  const v0x = bx - ax
  const v0z = bz - az
  const v1x = cx - ax
  const v1z = cz - az
  const v2x = px - ax
  const v2z = pz - az
  const den = v0x * v1z - v1x * v0z
  if (Math.abs(den) < 1e-14) return null
  const r = (v2x * v1z - v1x * v2z) / den
  const s = (v0x * v2z - v2x * v0z) / den
  const t = 1 - r - s
  const eps = 1e-5
  if (r >= -eps && s >= -eps && t >= -eps) return { wa: t, wb: r, wc: s }
  return null
}

function heightOnTriangle(
  px: number,
  pz: number,
  ax: number,
  az: number,
  ha: number,
  bx: number,
  bz: number,
  hb: number,
  cx: number,
  cz: number,
  hc: number,
): number | null {
  const b = barycentricXZ(px, pz, ax, az, bx, bz, cx, cz)
  if (!b) return null
  return b.wa * ha + b.wb * hb + b.wc * hc
}

/**
 * Rendret gulvhøjde i (x,z): samme trekants-opdeling som `PlaneGeometry` (to trekanter pr. celle),
 * ikke bilinear over firkanten — ellers små men synlige fejl midt i cellerne.
 */
export function sampleCaveFloorMeshY(
  caveSeed: number,
  halfX: number,
  halfZ: number,
  worldX: number,
  worldZ: number,
): number {
  const noise = getCaveFloorNoise2D(caveSeed)
  const salt = caveSeed ^ FLOOR_SALT_XOR

  const cornerH = (ix: number, iy: number) => {
    const { wx, wz } = worldXZOnFloorGrid(halfX, halfZ, ix, iy)
    return rawCaveFloorY(noise, salt, wx, wz)
  }

  const u = ((worldX + halfX) / Math.max(1e-9, 2 * halfX)) * FLOOR_SEGMENTS
  const v = ((worldZ + halfZ) / Math.max(1e-9, 2 * halfZ)) * FLOOR_SEGMENTS
  const uC = Math.min(FLOOR_SEGMENTS, Math.max(0, u))
  const vC = Math.min(FLOOR_SEGMENTS, Math.max(0, v))
  const ix = Math.min(FLOOR_SEGMENTS - 1, Math.max(0, Math.floor(uC)))
  const iy = Math.min(FLOOR_SEGMENTS - 1, Math.max(0, Math.floor(vC)))

  const p00 = worldXZOnFloorGrid(halfX, halfZ, ix, iy)
  const p01 = worldXZOnFloorGrid(halfX, halfZ, ix, iy + 1)
  const p10 = worldXZOnFloorGrid(halfX, halfZ, ix + 1, iy)
  const p11 = worldXZOnFloorGrid(halfX, halfZ, ix + 1, iy + 1)

  const h00 = cornerH(ix, iy)
  const h01 = cornerH(ix, iy + 1)
  const h10 = cornerH(ix + 1, iy)
  const h11 = cornerH(ix + 1, iy + 1)

  /** Trekanter som Three.js: (a,b,d) og (b,c,d) — se `PlaneGeometry` indices. */
  const y1 = heightOnTriangle(
    worldX,
    worldZ,
    p00.wx,
    p00.wz,
    h00,
    p01.wx,
    p01.wz,
    h01,
    p10.wx,
    p10.wz,
    h10,
  )
  if (y1 != null) return y1

  const y2 = heightOnTriangle(
    worldX,
    worldZ,
    p01.wx,
    p01.wz,
    h01,
    p11.wx,
    p11.wz,
    h11,
    p10.wx,
    p10.wz,
    h10,
  )
  if (y2 != null) return y2

  /** Fallback ved numerisk kant — vægtet hjørne-afstand. */
  const fx = uC - ix
  const fy = vC - iy
  const h0 = h00 * (1 - fx) + h10 * fx
  const h1 = h01 * (1 - fx) + h11 * fx
  return h0 * (1 - fy) + h1 * fy
}
