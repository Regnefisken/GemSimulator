import { createNoise3D } from 'simplex-noise'
import * as THREE from 'three'
import { mulberry32 } from './rng'

const NOISE_SCALE = 2
const NOISE_STRENGTH = 0.15
const FLAT_Y = -0.475
const FLAT_THRESHOLD = -0.4

/** OBB til raycast / collider — matcher procedurelt indhold (~1.1 × 0.95 × 1.05). */
export const ROCK_COLLIDER_HALF = {
  x: (1.1 * 1.02) / 2,
  y: (0.95 * 1.05) / 2,
  z: (1.05 * 1.02) / 2,
}

const ORE_METAL_RGB: [number, number, number][] = [
  [0.83, 0.68, 0.21],
  [0.85, 0.85, 0.85],
  [0.8, 0.4, 0.15],
  [0.9, 0.85, 0.9],
  [0.5, 0.55, 0.6],
]

function noiseOffset(seed: number): number {
  return (seed % 10000) * 0.000137
}

function deformVertices(geometry: THREE.BufferGeometry, seed: number, mode: 'normal' | 'hard'): void {
  const noise3D = createNoise3D(mulberry32(seed ^ 0x5bd1e995))
  const off = noiseOffset(seed)
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const v = new THREE.Vector3()
  const dir = new THREE.Vector3()

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    v.x *= 1.0
    v.y *= 0.86
    v.z *= 0.95

    let displacement: number
    if (mode === 'hard') {
      displacement =
        noise3D(v.x * 4.0 + off, v.y * 4.0 + off, v.z * 4.0 + off) * 0.05 +
        noise3D(v.x * 1.5 + off, v.y * 1.5 + off, v.z * 1.5 + off) * 0.1
    } else {
      displacement =
        noise3D(
          v.x * NOISE_SCALE + off,
          v.y * NOISE_SCALE + off,
          v.z * NOISE_SCALE + off,
        ) * NOISE_STRENGTH
    }

    dir.copy(v).normalize()
    v.addScaledVector(dir, displacement)

    if (v.y < FLAT_THRESHOLD) {
      v.y = FLAT_Y
    }

    pos.setXYZ(i, v.x, v.y, v.z)
  }

  geometry.computeVertexNormals()
}

/** Normal + rich + crystal host: icosahedron detail 2, facet displacement. */
export function createBaseRockGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.55, 2)
  deformVertices(geo, seed, 'normal')
  const nonIndexed = geo.toNonIndexed()
  nonIndexed.translate(0, 0.475, 0)
  return nonIndexed
}

/** Hård: finere mesh + ekstra højfrekvent displacement. */
export function createHardRockGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.55, 3).toNonIndexed()
  deformVertices(geo, seed, 'hard')
  geo.translate(0, 0.475, 0)
  return geo
}

function smoothOreMask(n: number): number {
  return THREE.MathUtils.smoothstep(n, 0.35, 0.55)
}

/** Rig malm: samme form som normal, vertex‑farver malm vs sten (ingen custom shader). */
export function createRichRockGeometry(
  seed: number,
  baseRockColor: THREE.Color,
): THREE.BufferGeometry {
  const src = createBaseRockGeometry(seed)
  const geo = src.clone()
  src.dispose()
  const metalIdx = seed % ORE_METAL_RGB.length
  const [mr, mg, mb] = ORE_METAL_RGB[metalIdx]
  const ore = new THREE.Color(mr, mg, mb)

  const noise3D = createNoise3D(mulberry32(seed ^ 0x51f4e5c7))
  const off = noiseOffset(seed)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const v = new THREE.Vector3()

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = noise3D(v.x * 3 + off, v.y * 3 + off, v.z * 3 + off)
    const mask = smoothOreMask(n)
    const c = baseRockColor.clone().lerp(ore, mask)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

export type CrystalShard = {
  id: string
  position: [number, number, number]
  euler: [number, number, number]
  radius: number
  stretchY: number
  color: string
}

/** Krystal: mørk vært + seeded facet‑cluster inde for bbox. */
export function createCrystalRockCluster(seed: number): {
  hostGeometry: THREE.BufferGeometry
  shards: CrystalShard[]
} {
  const src = createBaseRockGeometry(seed)
  const hostGeometry = src.clone()
  src.dispose()
  hostGeometry.translate(0, -0.475, 0)
  hostGeometry.scale(0.85, 0.85, 0.85)
  hostGeometry.translate(0, 0.475 * 0.85, 0)

  const rng = mulberry32(seed ^ 0xc822ad33)
  const nCrystal = Math.min(7, Math.floor(Math.pow(rng(), 1.5) * 7) + 1)
  const shards: CrystalShard[] = []

  for (let i = 0; i < nCrystal; i++) {
    const hue = rng()
    const light = 0.25 + rng() * 0.1
    const c = new THREE.Color().setHSL(hue, 1.0, light)
    const radius = 0.08 + rng() * 0.1
    const stretchY = 1.5 + rng() * 1.5

    const phi = rng() * Math.PI * 2
    const theta = rng() * Math.PI * 0.6
    const r = 0.48

    const x = r * Math.sin(theta) * Math.cos(phi)
    const y = r * Math.cos(theta) + 0.3
    const z = r * Math.sin(theta) * Math.sin(phi)

    const euler: [number, number, number] = [
      (rng() - 0.5) * Math.PI * 0.7,
      (rng() - 0.5) * Math.PI * 0.7,
      rng() * Math.PI * 2,
    ]

    shards.push({
      id: `${seed}-c-${i}`,
      position: [x, y, z],
      euler,
      radius,
      stretchY,
      color: `#${c.getHexString()}`,
    })
  }

  return { hostGeometry, shards }
}
