import { hashStringToSeed, mulberry32 } from './mineCaveContext'

/** Lokal +Z (grebsiden) må ikke pege mod en nær klippe — grænse for dot(forwards, tilKlippen). */
const MAX_FACE_ROCK_DOT = 0.42
/** Ignorér forhindringer længere væk end dette (XZ meter). */
const OBSTACLE_MAX_DIST = 7.5
/** Tættere end dette: strengere vinkelkrav. */
const OBSTACLE_CLOSE_DIST = 2.2
const MAX_FACE_ROCK_DOT_CLOSE = 0.22

export type PickChestRotationYArgs = {
  runId: string
  depth: number
  slotIndex: number
  chestX: number
  chestZ: number
  oreSlots: readonly [number, number, number][]
  /** Felter med aktiv klippe/mob (ikke ryddet). */
  obstacleSlotIndices: readonly number[]
}

/**
 * Deterministisk Y‑rotation (rad). `WorldChest`: greb/forstykning ved **lokal +Z** — efter `rotation.y`
 * peger denne akse i verdens‑XZ som `(sin θ, cos θ)` (Three.js standard).
 */
export function pickChestRotationY(args: PickChestRotationYArgs): number {
  const seed = hashStringToSeed(`${args.runId}|${args.depth}|chestYaw|${args.slotIndex}`)
  const rng = mulberry32(seed ^ 0xcafe533d)

  for (let k = 0; k < 28; k++) {
    const theta = rng() * Math.PI * 2
    if (angleAvoidsObstacles(theta, args)) return theta
  }

  /** Undgå «front mod klippe»: vælg θ der minimerer max dot mod nærmeste forhindring. */
  let best = rng() * Math.PI * 2
  let bestScore = Number.NEGATIVE_INFINITY
  for (let k = 0; k < 48; k++) {
    const theta = rng() * Math.PI * 2
    const s = minDotToObstacles(theta, args)
    if (s > bestScore) {
      bestScore = s
      best = theta
    }
  }
  return best
}

/** Local +Z → world XZ efter rotation kun om Y */
function forwardXZ(theta: number): [number, number] {
  return [Math.sin(theta), Math.cos(theta)]
}

function angleAvoidsObstacles(theta: number, args: PickChestRotationYArgs): boolean {
  const [fx, fz] = forwardXZ(theta)
  const { chestX, chestZ } = args

  for (const idx of args.obstacleSlotIndices) {
    const p = args.oreSlots[idx]
    if (!p) continue
    const dx = p[0] - chestX
    const dz = p[2] - chestZ
    const d = Math.hypot(dx, dz)
    if (d < 1e-4 || d > OBSTACLE_MAX_DIST) continue
    const inv = 1 / d
    const dot = (fx * dx * inv + fz * dz * inv)
    const lim = d < OBSTACLE_CLOSE_DIST ? MAX_FACE_ROCK_DOT_CLOSE : MAX_FACE_ROCK_DOT
    if (dot > lim) return false
  }
  return true
}

/** Returnerer −max(dot) — højere er bedre (væk fra klipper). */
function minDotToObstacles(theta: number, args: PickChestRotationYArgs): number {
  const [fx, fz] = forwardXZ(theta)
  const { chestX, chestZ } = args
  let worst = 1
  for (const idx of args.obstacleSlotIndices) {
    const p = args.oreSlots[idx]
    if (!p) continue
    const dx = p[0] - chestX
    const dz = p[2] - chestZ
    const d = Math.hypot(dx, dz)
    if (d < 1e-4 || d > OBSTACLE_MAX_DIST) continue
    const inv = 1 / d
    const dot = fx * dx * inv + fz * dz * inv
    if (dot < worst) worst = dot
  }
  return -worst
}
