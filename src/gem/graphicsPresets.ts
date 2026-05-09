/** Bump ved kosmetik-algoritme-ændring (hashes i `mineCosmetics`). */
export const GRAPHICS_SCHEMA_VERSION = 1

export type GraphicsPresetId = 'performance' | 'balanced' | 'rich'

export type GraphicsPreset = {
  id: GraphicsPresetId
  label: string
  cosmeticRockCount: { min: number; max: number }
  dpr: [number, number]
  shadowMapSize?: number
  particleCap: number
  fogMultiplier?: number
  /** >1: reducer antal kosmetiske instanser (hvert n-te forsøg springes over). */
  cosmeticLodBias?: number
}

export const DEFAULT_GRAPHICS_PRESET_ID: GraphicsPresetId = 'balanced'

export const GRAPHICS_PRESETS: Record<GraphicsPresetId, GraphicsPreset> = {
  performance: {
    id: 'performance',
    label: 'Ydelse',
    cosmeticRockCount: { min: 0, max: 6 },
    dpr: [1, 1.25],
    particleCap: 48,
    cosmeticLodBias: 3,
  },
  balanced: {
    id: 'balanced',
    label: 'Balanceret',
    cosmeticRockCount: { min: 4, max: 14 },
    dpr: [1, 1.75],
    particleCap: 96,
    cosmeticLodBias: 2,
  },
  rich: {
    id: 'rich',
    label: 'Rig',
    cosmeticRockCount: { min: 12, max: 28 },
    dpr: [1, 2],
    particleCap: 160,
    fogMultiplier: 1.05,
    cosmeticLodBias: 1,
  },
}
