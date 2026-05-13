import {
  DEFAULT_SWORD_TRANSFORM,
  DEFAULT_HELD_WEAPON_GLB_SCALE,
  defaultHeldPickaxeTransform,
  type HeldFpsTransform,
} from './3d/pickaxeDefaults'

export const WEAPON_DEV_STORAGE_KEY = 'gemsim-weapon-dev-v2'
/** Tidligere nøgle — ryddes ved «Slet gemt» så gamle forkerte tal ikke hænger ved. */
export const WEAPON_DEV_STORAGE_KEY_LEGACY = 'gemsim-weapon-dev-v1'

const DEFAULT_GLB = {
  pickGlb: DEFAULT_HELD_WEAPON_GLB_SCALE.pickaxe,
  swordGlb: DEFAULT_HELD_WEAPON_GLB_SCALE.sword,
} as const

function asVec3(v: unknown): [number, number, number] | null {
  if (!Array.isArray(v) || v.length !== 3) return null
  const a = v[0]
  const b = v[1]
  const c = v[2]
  if (typeof a !== 'number' || typeof b !== 'number' || typeof c !== 'number') return null
  if (![a, b, c].every(Number.isFinite)) return null
  return [a, b, c]
}

function mergeHeld(base: HeldFpsTransform, raw: unknown): HeldFpsTransform {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const spin =
    typeof r.inPlaceSpinRad === 'number' && Number.isFinite(r.inPlaceSpinRad)
      ? r.inPlaceSpinRad
      : (base.inPlaceSpinRad ?? 0)
  return {
    basePos: asVec3(r.basePos) ?? base.basePos,
    baseRot: asVec3(r.baseRot) ?? base.baseRot,
    meshOrient: asVec3(r.meshOrient) ?? base.meshOrient,
    gripColumn:
      typeof r.gripColumn === 'number' && Number.isFinite(r.gripColumn) ? r.gripColumn : base.gripColumn,
    scaleMul: typeof r.scaleMul === 'number' && Number.isFinite(r.scaleMul) ? r.scaleMul : base.scaleMul,
    inPlaceSpinRad: spin,
  }
}

export type WeaponDevStored = {
  pick: HeldFpsTransform
  sword: HeldFpsTransform
  pickGlb: number
  swordGlb: number
}

export function weaponDevDefaultState(): WeaponDevStored {
  return {
    pick: defaultHeldPickaxeTransform(),
    sword: { ...DEFAULT_SWORD_TRANSFORM },
    pickGlb: DEFAULT_GLB.pickGlb,
    swordGlb: DEFAULT_GLB.swordGlb,
  }
}

export function loadWeaponDevFromStorage(): WeaponDevStored | null {
  if (!import.meta.env.DEV || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(WEAPON_DEV_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const rec = o as Record<string, unknown>
    const pickBase = defaultHeldPickaxeTransform()
    const swordBase = { ...DEFAULT_SWORD_TRANSFORM }
    const pickGlb =
      typeof rec.pickGlb === 'number' && Number.isFinite(rec.pickGlb) ? rec.pickGlb : DEFAULT_GLB.pickGlb
    const swordGlb =
      typeof rec.swordGlb === 'number' && Number.isFinite(rec.swordGlb) ? rec.swordGlb : DEFAULT_GLB.swordGlb
    return {
      pick: mergeHeld(pickBase, rec.pick),
      sword: mergeHeld(swordBase, rec.sword),
      pickGlb,
      swordGlb,
    }
  } catch {
    return null
  }
}

export function saveWeaponDevToStorage(data: WeaponDevStored): void {
  if (!import.meta.env.DEV || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(WEAPON_DEV_STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

export function clearWeaponDevStorage(): void {
  try {
    localStorage.removeItem(WEAPON_DEV_STORAGE_KEY)
    localStorage.removeItem(WEAPON_DEV_STORAGE_KEY_LEGACY)
  } catch {
    /* ignore */
  }
}
