import type { CosmeticRock } from '../types'
import type { GraphicsPresetId } from './graphicsPresets'
import { GRAPHICS_SCHEMA_VERSION } from './graphicsPresets'
import { hashStringToSeed, mulberry32 } from './mineCaveContext'

const MIN_DIST_FROM_SLOT_XZ = 2.5
const MAX_PLACE_ATTEMPTS = 40
const MODEL_IDS = ['rock_a', 'rock_b', 'rock_c'] as const

export type GenerateCosmeticRocksArgs = {
  runId: string
  mineId: string
  depth: number
  presetId: GraphicsPresetId
  /** Brug `GRAPHICS_SCHEMA_VERSION` fra `graphicsPresets.ts`. */
  graphicsSchemaVersion?: number
  oreSlots: readonly [number, number, number][]
  bounds: number
  cosmeticRockCount: { min: number; max: number }
  cosmeticLodBias?: number
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
  const b = args.bounds

  for (let i = 0; i < target; i++) {
    let placed: CosmeticRock | null = null
    for (let attempt = 0; attempt < MAX_PLACE_ATTEMPTS; attempt++) {
      const wall = rng() >= 0.65
      let x: number
      let y: number
      let z: number

      if (wall) {
        const side = Math.floor(rng() * 4)
        const u = (rng() * 2 - 1) * b * 0.88
        const edge = b * (0.94 + rng() * 0.04)
        if (side === 0) {
          x = edge
          z = u
        } else if (side === 1) {
          x = -edge
          z = u
        } else if (side === 2) {
          x = u
          z = edge
        } else {
          x = u
          z = -edge
        }
        y = 0.35 + rng() * 2.2
      } else {
        x = (rng() * 2 - 1) * b * 0.9
        z = (rng() * 2 - 1) * b * 0.9
        y = 0.18 + rng() * 0.42
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
