import type { HeldFpsTransform } from './3d/pickaxeDefaults'

/** Dev-only: live FPS-våben-justering fra MineScreen → Pickaxe3D. */
export type WeaponFpsDevRuntime = {
  transform: HeldFpsTransform
  /** Erstatter standard 0,44 / 0,52 i GLB-grenen. */
  glbScaleBase: number
}
