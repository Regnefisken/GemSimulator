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
  /** Lodret kolonne (0 = venstre) i 2D-pixel-hakkens grid som «greb»/pivot — kun når våbnet tegnes som voxels; GLB ignorerer. */
  gripColumn: number
  /** Rotation om synslinjen kamera→våben (rad) — «klistermærke»-drej i billedplanet; 0 = ingen. */
  inPlaceSpinRad: number
}

export const DEFAULT_PICKAXE_TRANSFORM: PickaxeTransform = {
  basePos: [0.94, -1.06, -1.82],
  baseRot: [0.610865, 2.487094, 0.017453],
  meshOrient: [0.174533, -0.863938, -0.174533],
  gripColumn: 0,
  inPlaceSpinRad: 0,
}

/** Placering/skala for FPS-sværd (afstemt i dev). */
export type HeldFpsTransform = PickaxeTransform & {
  /** Samlet skalering: voxel bruger også voxelScale; GLB bruger GLB-basis × dette tal. */
  scaleMul: number
}

export const DEFAULT_SWORD_TRANSFORM: HeldFpsTransform = {
  basePos: [1.56, -1.86, -4.6],
  baseRot: [1.45735, -2.548181, 0.453786],
  meshOrient: [0.549779, 0.767945, 0.575959],
  gripColumn: 0,
  scaleMul: 1.12,
  inPlaceSpinRad: 0.034907,
}

/** Standard GLB-basis i minen uden `weaponFpsDev` — samme tal som dev-panelets nulstil. */
export const DEFAULT_HELD_WEAPON_GLB_SCALE = {
  pickaxe: 0.3,
  sword: 0.36,
} as const

/** Held FPS-hakke med voxel/GLB `scaleMul` (afstemt i dev). */
export function defaultHeldPickaxeTransform(): HeldFpsTransform {
  return { ...DEFAULT_PICKAXE_TRANSFORM, scaleMul: 0.58 }
}
