import type { CaveConfig } from '../../types'
import { getRockLayoutParams } from '../../gem/procedural/rockLayout'
import type { MineRunSlotState } from '../../lib/mineTypes'
import { getPlayableHalfExtents } from '../../lib/caveHalfExtents'
import { sinkOreSlotPosition } from './sinkOreSlotPosition'

export const MINE_SPAWN_EYE_Y = 1.55

/** Afstand fra playable-kant (inderside af væg-plan) — “ryg mod væg”. */
const WALL_BACK_PAD = 0.28
const INNER_PAD = 0.32
/**
 * Langs væggen: kun midterste 1/3 af væggens længde (undgår hjørner).
 * Offset-faktor t ∈ [−⅓, ⅓] ganges med halv væglængde fra rum-midt.
 */
const WALL_MIDDLE_THIRD = 1 / 3
/** Prøvepunkter i midterfeltet — let variation, ikke altid præcis midte. */
const WALL_SAMPLES = 5

/** Halv længde af væg (0 → hjørne), efter indre margin — bruges til midterste 1/3. */
function wallHalfSpanFromCenter(half: number): number {
  return Math.max(half - INNER_PAD, 0.12)
}

/** Jævnt fordelt i [−WALL_MIDDLE_THIRD, +WALL_MIDDLE_THIRD] langs væggen. */
function offsetFractionsMiddleThird(sampleCount: number): number[] {
  const n = Math.max(2, sampleCount)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0.5 : i / (n - 1)
    const t = (k - 0.5) * 2 * WALL_MIDDLE_THIRD
    out.push(t)
  }
  return out
}

function spawnFracIndex(mineRunId: string, runDepth: number, fracLen: number): number {
  let h = 2166136261
  for (let i = 0; i < mineRunId.length; i++) {
    h ^= mineRunId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= runDepth * 0x9e3779b9
  return Math.abs(h) % fracLen
}

/** Lidt højere score for syd-væg (+Z): typisk bedst udsyn ind i rum. */
const WALL_VIEW_BONUS: Record<'S' | 'N' | 'E' | 'W', number> = {
  S: 0.14,
  N: 0.08,
  E: 0.06,
  W: 0.06,
}

/** Grov klippe-radius i XZ. */
function rockClearanceRadius(meshScaleMultiplier: number): number {
  return 0.44 + 0.5 * meshScaleMultiplier
}

type RockObstacle = { x: number; z: number; r: number }

function collectRockObstacles(args: {
  caveConfig: CaveConfig
  mineRunId: string
  runDepth: number
  mineSlots: MineRunSlotState[]
}): RockObstacle[] {
  const { caveConfig, mineRunId, runDepth, mineSlots } = args
  const out: RockObstacle[] = []
  const n = Math.min(mineSlots.length, caveConfig.oreSlots.length)
  for (let i = 0; i < n; i++) {
    const slot = mineSlots[i]
    if (!slot || slot.kind === 'chest' || slot.cleared) continue
    const base = caveConfig.oreSlots[i]
    if (!base) continue
    const layout = getRockLayoutParams(mineRunId, runDepth, i, slot.rockType)
    const [wx, , wz] = sinkOreSlotPosition(base, layout.extraSinkY)
    out.push({ x: wx, z: wz, r: rockClearanceRadius(layout.meshScaleMultiplier) })
  }
  return out
}

type WallCandidate = {
  px: number
  pz: number
  /** Enhedsretning ind i rummet (XZ), væk fra væggen man står mod. */
  fx: number
  fz: number
  wall: 'S' | 'N' | 'E' | 'W'
}

function wallBackedCandidates(halfX: number, halfZ: number): WallCandidate[] {
  const zb = Math.max(halfZ - WALL_BACK_PAD, INNER_PAD)
  const xb = Math.max(halfX - WALL_BACK_PAD, INNER_PAD)
  const out: WallCandidate[] = []
  const spanX = wallHalfSpanFromCenter(halfX)
  const spanZ = wallHalfSpanFromCenter(halfZ)
  const frac = offsetFractionsMiddleThird(WALL_SAMPLES)

  for (const t of frac) {
    const x = t * spanX
    out.push({ px: x, pz: zb, fx: 0, fz: -1, wall: 'S' })
    out.push({ px: x, pz: -zb, fx: 0, fz: 1, wall: 'N' })
  }
  for (const t of frac) {
    const z = t * spanZ
    out.push({ px: xb, pz: z, fx: -1, fz: 0, wall: 'E' })
    out.push({ px: -xb, pz: z, fx: 1, fz: 0, wall: 'W' })
  }

  return out
}

/**
 * Straf for klipper der ligger lige foran (stor vinkel + tæt) — side/bagved tæller kun som krops-afstand.
 */
function forwardViewPenalty(
  px: number,
  pz: number,
  fx: number,
  fz: number,
  obstacles: RockObstacle[],
): number {
  let penalty = 0
  for (const o of obstacles) {
    const dx = o.x - px
    const dz = o.z - pz
    const dist = Math.hypot(dx, dz)
    if (dist < 0.06) {
      penalty += 80
      continue
    }
    const tox = dx / dist
    const toz = dz / dist
    const ahead = fx * tox + fz * toz
    if (ahead < 0.18) continue

    const angRadius = Math.atan2(o.r, dist)
    if (ahead > 0.52 && angRadius > 0.34) {
      penalty += (ahead - 0.52) * (angRadius - 0.34) * 22
    }
    if (ahead > 0.78 && dist < o.r * 3.1) {
      penalty += (o.r * 3.1 - dist) * 2.8
    }
  }
  return penalty
}

function scoreWallSpawn(c: WallCandidate, obstacles: RockObstacle[]): number {
  let minMargin = Infinity
  for (const o of obstacles) {
    const margin = Math.hypot(c.px - o.x, c.pz - o.z) - o.r
    if (margin < minMargin) minMargin = margin
  }
  const body = minMargin === Infinity ? 2.2 : minMargin
  const viewPen = obstacles.length ? forwardViewPenalty(c.px, c.pz, c.fx, c.fz, obstacles) : 0
  return body * 2.35 - viewPen + WALL_VIEW_BONUS[c.wall]
}

export type MineSpawnPick = {
  x: number
  z: number
  /** Horisontalt lookAt-mål (XZ); Y = øjehøjde i PlayerControls. */
  lookAtX: number
  lookAtZ: number
}

const LOOK_DIST = 4.2

/**
 * Spawn med ryg mod en væg, udsyn ind i rummet; scorer mod klipper der spærrer synsfelt foran.
 */
export function pickMineSpawn(args: {
  caveConfig: CaveConfig
  mineRunId: string
  runDepth: number
  mineSlots: MineRunSlotState[]
}): MineSpawnPick {
  const { halfX, halfZ } = getPlayableHalfExtents(args.caveConfig)
  const obstacles = collectRockObstacles(args)
  const candidates = wallBackedCandidates(halfX, halfZ)

  const zb = Math.max(halfZ - WALL_BACK_PAD, INNER_PAD)

  if (candidates.length === 0) {
    const z = Math.max(-halfZ + INNER_PAD, Math.min(halfZ - INNER_PAD, zb))
    return {
      x: 0,
      z,
      lookAtX: 0,
      lookAtZ: z - LOOK_DIST,
    }
  }

  if (obstacles.length === 0) {
    const frac = offsetFractionsMiddleThird(WALL_SAMPLES)
    const spanX = wallHalfSpanFromCenter(halfX)
    const zi = spawnFracIndex(args.mineRunId, args.runDepth, frac.length)
    const tPick = frac[zi]!
    const xPrefer = tPick * spanX
    const best =
      candidates.find((c) => c.wall === 'S' && Math.abs(c.px - xPrefer) < 1e-3) ??
      candidates.find((c) => c.wall === 'S') ??
      candidates[0]!
    return {
      x: best.px,
      z: best.pz,
      lookAtX: best.px + best.fx * LOOK_DIST,
      lookAtZ: best.pz + best.fz * LOOK_DIST,
    }
  }

  let best = candidates[0]!
  let bestScore = scoreWallSpawn(best, obstacles)
  for (let k = 1; k < candidates.length; k++) {
    const c = candidates[k]!
    const s = scoreWallSpawn(c, obstacles)
    if (s > bestScore) {
      bestScore = s
      best = c
    }
  }

  return {
    x: best.px,
    z: best.pz,
    lookAtX: best.px + best.fx * LOOK_DIST,
    lookAtZ: best.pz + best.fz * LOOK_DIST,
  }
}

/** Kompat: kun position; brug `pickMineSpawn` for look-retning. */
export function pickMineSpawnXZ(args: {
  caveConfig: CaveConfig
  mineRunId: string
  runDepth: number
  mineSlots: MineRunSlotState[]
}): { x: number; z: number } {
  const p = pickMineSpawn(args)
  return { x: p.x, z: p.z }
}
