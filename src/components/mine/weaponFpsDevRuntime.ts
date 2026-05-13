import type { HeldFpsTransform } from './3d/pickaxeDefaults'

/** Dev-only: live FPS-våben-justering fra MineScreen → Pickaxe3D (begge våben — vælg med `heldWeaponKind`). */
export type WeaponFpsDevRuntime = {
  pick: HeldFpsTransform
  sword: HeldFpsTransform
  pickGlbScaleBase: number
  swordGlbScaleBase: number
}
