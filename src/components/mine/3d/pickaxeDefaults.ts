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
  basePos: [0.42, -2.26, -2.084],
  baseRot: [0.514872, 2.487094, 0.07854],
  meshOrient: [-0.113446, -0.863938, -0.174533],
  gripColumn: 0,
  inPlaceSpinRad: 0,
}

/** Placering/skala for FPS-sværd (afstemt i dev). */
export type HeldFpsTransform = PickaxeTransform & {
  /** Samlet skalering: voxel bruger også voxelScale; GLB bruger GLB-basis × dette tal. */
  scaleMul: number
}

export const DEFAULT_SWORD_TRANSFORM: HeldFpsTransform = {
  basePos: [2.28, -2.3, 1.36],
  baseRot: [0.767945, -2.234021, 0.488692],
  meshOrient: [0.418879, 0.794125, 0.174533],
  gripColumn: 0,
  scaleMul: 2.12,
  inPlaceSpinRad: 0.034907,
}

/** Held FPS-hakke med voxel/GLB `scaleMul` (afstemt i dev). */
export function defaultHeldPickaxeTransform(): HeldFpsTransform {
  return { ...DEFAULT_PICKAXE_TRANSFORM, scaleMul: 1.04 }
}
