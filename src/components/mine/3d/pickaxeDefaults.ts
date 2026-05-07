/**
 * FPS-hak i minen — standard placering / pivot (kan tweakes og kopieres tilbage hertil).
 */
export type PickaxeTransform = {
  /** Kamera-rum: +X højre, −Y ned, −Z frem */
  basePos: [number, number, number]
  /** Euler (rad) på ydre hakke-gruppe sammen med sving */
  baseRot: [number, number, number]
  /** Euler (rad) på voxel-undergruppe — hold vinkler moderate (flad sprite) */
  meshOrient: [number, number, number]
  /** Pivot mod skaft i pickaxe-pixel-template (kolonne fra venstre) */
  gripColumn: number
}

export const DEFAULT_PICKAXE_TRANSFORM: PickaxeTransform = {
  basePos: [-0.5998, -2.3552, -2.084],
  baseRot: [0.062, -0.6005, 0.074],
  meshOrient: [0.08, 0.1, 0.376],
  gripColumn: 0,
}

/** Placering/skala for FPS-sværd (afstemt i dev). */
export type HeldFpsTransform = PickaxeTransform & {
  scaleMul: number
}

export const DEFAULT_SWORD_TRANSFORM: HeldFpsTransform = {
  basePos: [-0.28, -2.38, -0.64],
  baseRot: [-1.425, -0.6005, 0.125],
  meshOrient: [-1.495, 0.23, 0.87],
  gripColumn: 0,
  scaleMul: 2.29,
}
