import type { CosmeticRock } from '../types'
import { COSMETIC_ROCK_BOX_HALF_Y } from '../lib/cosmeticRockBox'
import { sampleCaveFloorMeshY } from '../lib/caveFloorSurface'
import type { GraphicsPresetId } from './graphicsPresets'
import { GRAPHICS_SCHEMA_VERSION } from './graphicsPresets'
import { hashStringToSeed, mulberry32 } from './mineCaveContext'

const MIN_DIST_FROM_SLOT_XZ = 2.5
const MAX_PLACE_ATTEMPTS = 40
const MODEL_IDS = ['rock_a', 'rock_b', 'rock_c'] as const
/** Bund lidt under det renderte gulv (meter). */
const FLOOR_ROCK_SINK_MIN = 0.055
const FLOOR_ROCK_SINK_SPREAD = 0.065

export type GenerateCosmeticRocksArgs = {
  runId: string
  mineId: string
  depth: number
  presetId: GraphicsPresetId
  /** Brug `GRAPHICS_SCHEMA_VERSION` fra `graphicsPresets.ts`. */
  graphicsSchemaVersion?: number
  oreSlots: readonly [number, number, number][]
  /** Fallback når `boundsHalfX`/`boundsHalfZ` ikke er sat (kvadratisk rum). */
  bounds: number
  /** Halve udstrækning X/Z — rektangulært rum (korridor); fallback er `bounds`. */
  boundsHalfX?: number
  boundsHalfZ?: number
  cosmeticRockCount: { min: number; max: number }
  cosmeticLodBias?: number
  /** Samme som `ProceduralCave`/`CaveWalls` — behøves for gulvjusteret Y på gulvklipper. */
  caveSeed: number
}

function farEnoughFromSlots(
  x: number,
  z: number,
  oreSlots: readonly [number, number, number][],
): boolean {
  for (const p of oreSlots) {
    if (Math.hypot(p[0] - x, p[2] - z) <= MIN_DIST_FROM_SLOT_XZ) return false
  }
  return true
}

/**
 * Kosmetiske klipper — kun visuelt; deterministisk fra run/dybde/preset/schema.
 */
export function generateCosmeticRocks(args: GenerateCosmeticRocksArgs): CosmeticRock[] {
  const ver = args.graphicsSchemaVersion ?? GRAPHICS_SCHEMA_VERSION
  const hCos = hashStringToSeed(
    `${args.runId}|${args.mineId}|${args.depth}|cosmetic|${args.presetId}|v${ver}`,
  )
  const rng = mulberry32(hCos)
  const { min, max } = args.cosmeticRockCount
  let target = min + Math.floor(rng() * (max - min + 1))
  const lod = args.cosmeticLodBias ?? 1
  if (lod > 1) {
    target = Math.max(0, Math.ceil(target / lod))
  }

  const out: CosmeticRock[] = []
  const hx = args.boundsHalfX ?? args.bounds
  const hz = args.boundsHalfZ ?? args.bounds

  for (let i = 0; i < target; i++) {
    let placed: CosmeticRock | null = null
    for (let attempt = 0; attempt < MAX_PLACE_ATTEMPTS; attempt++) {
      const wall = rng() >= 0.65
      let x: number
      let y: number
      let z: number

      if (wall) {
        const side = Math.floor(rng() * 4)
        const alongX = (rng() * 2 - 1) * hx * 0.88
        const alongZ = (rng() * 2 - 1) * hz * 0.88
        const edgeX = hx * (0.94 + rng() * 0.04)
        const edgeZ = hz * (0.94 + rng() * 0.04)
        if (side === 0) {
          x = edgeX
          z = alongZ
        } else if (side === 1) {
          x = -edgeX
          z = alongZ
        } else if (side === 2) {
          x = alongX
          z = edgeZ
        } else {
          x = alongX
          z = -edgeZ
        }
        const surfaceY = sampleCaveFloorMeshY(args.caveSeed, hx, hz, x, z)
        const sink = FLOOR_ROCK_SINK_MIN + rng() * FLOOR_ROCK_SINK_SPREAD
        const lift = rng() * 2.2
        y = surfaceY + COSMETIC_ROCK_BOX_HALF_Y - sink + lift
      } else {
        x = (rng() * 2 - 1) * hx * 0.9
        z = (rng() * 2 - 1) * hz * 0.9
        const surfaceY = sampleCaveFloorMeshY(args.caveSeed, hx, hz, x, z)
        const sink = FLOOR_ROCK_SINK_MIN + rng() * FLOOR_ROCK_SINK_SPREAD
        y = surfaceY + COSMETIC_ROCK_BOX_HALF_Y - sink
      }

      if (!farEnoughFromSlots(x, z, args.oreSlots)) continue

      const modelId = MODEL_IDS[Math.floor(rng() * MODEL_IDS.length)] ?? 'rock_a'
      const rotationY = rng() * Math.PI * 2
      placed = { position: [x, y, z], modelId, rotationY }
      break
    }
    if (placed) out.push(placed)
  }

  return out
}
