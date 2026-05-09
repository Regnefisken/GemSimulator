import type { CaveConfig } from '../types'

/**
 * Matcher `CaveWalls` `makeWallPlane`: `arr[i + 2] += n * …` med amplitude 0.35.
 * Spiller-klamp ved kun plan-centrum gør at man stadig kan stå “i” den forskudte væg.
 */
export const CAVE_WALL_DISPLACEMENT_MAX = 0.35

/** Ekstra luft så FPS-kamera ikke snitter væg-mesh (classic/compact små rum). */
const PLAYABLE_EXTRA_MARGIN = 0.05

/** Flyt vægge lidt ind — skal matche `CaveWalls.tsx` (samme formel overalt). */
export const CAVE_WALL_INSET_MAX = 0.14

/** Indryk som bruges til væg-planernes center — matcher visuel gulv/væg-overlap. */
export function getCaveWallInset(halfX: number, halfZ: number): number {
  return Math.min(CAVE_WALL_INSET_MAX, Math.min(halfX, halfZ) * 0.03)
}

/** Væg-centre X/Z (positive kvadrant-kanter); indersiden af rummet er |x|≤wallEdgeX, |z|≤wallEdgeZ mod midten. */
export function getCaveWallEdge(halfX: number, halfZ: number): { wallEdgeX: number; wallEdgeZ: number } {
  const inset = getCaveWallInset(halfX, halfZ)
  return {
    wallEdgeX: Math.max(halfX - inset, 0.35),
    wallEdgeZ: Math.max(halfZ - inset, 0.35),
  }
}

/** Halve udstrækning X/Z — samme som rum-layout (`boundsHalf*` / `bounds`). */
export function getCaveHalfExtents(c: CaveConfig): { halfX: number; halfZ: number } {
  return {
    halfX: c.boundsHalfX ?? c.bounds,
    halfZ: c.boundsHalfZ ?? c.bounds,
  }
}

/**
 * Bevægelses-grænse: lidt inde fra væg-planens center, så man ikke står i displacement-laget.
 */
export function getPlayableHalfExtents(c: CaveConfig): { halfX: number; halfZ: number } {
  const { halfX, halfZ } = getCaveHalfExtents(c)
  const { wallEdgeX, wallEdgeZ } = getCaveWallEdge(halfX, halfZ)
  const shrink = CAVE_WALL_DISPLACEMENT_MAX + PLAYABLE_EXTRA_MARGIN
  return {
    halfX: Math.max(wallEdgeX - shrink, 0.22),
    halfZ: Math.max(wallEdgeZ - shrink, 0.22),
  }
}
