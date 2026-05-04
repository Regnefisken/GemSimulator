import type { MetalName } from '../types'

export type SmelterTier = {
  tier: number
  name: string
  allowedMetals: MetalName[]
  speedMultiplier: number
  upgradeCost: number
}

export const SMELTER_TIERS: SmelterTier[] = [
  { tier: 1, name: 'Simpel Smelteovn', allowedMetals: ['Tin', 'Kobber', 'Jern'], speedMultiplier: 1.0, upgradeCost: 0 },
  {
    tier: 2,
    name: 'Forstærket Ovn',
    allowedMetals: ['Tin', 'Kobber', 'Jern', 'Sølv'],
    speedMultiplier: 1.25,
    upgradeCost: 1500,
  },
  {
    tier: 3,
    name: 'Smedeovn',
    allowedMetals: ['Tin', 'Kobber', 'Jern', 'Sølv', 'Guld'],
    speedMultiplier: 1.5,
    upgradeCost: 8000,
  },
  {
    tier: 4,
    name: 'Mithril-Smelter',
    allowedMetals: ['Tin', 'Kobber', 'Jern', 'Sølv', 'Guld', 'Mithril'],
    speedMultiplier: 1.85,
    upgradeCost: 50000,
  },
  {
    tier: 5,
    name: 'Rune-Forge',
    allowedMetals: ['Tin', 'Kobber', 'Jern', 'Sølv', 'Guld', 'Mithril', 'Runestål'],
    speedMultiplier: 2.5,
    upgradeCost: 250000,
  },
]

export const ORE_PER_INGOT: Record<MetalName, number> = {
  Tin: 2,
  Kobber: 2,
  Jern: 3,
  Bronze: 0,
  Sølv: 4,
  Guld: 5,
  Mithril: 8,
  Runestål: 12,
}

export const NUGGET_PER_INGOT: Record<MetalName, number> = {
  Tin: 1,
  Kobber: 1,
  Jern: 1,
  Bronze: 0,
  Sølv: 1,
  Guld: 1,
  Mithril: 1,
  Runestål: 1,
}

export const SMELT_TIME_MS: Record<MetalName, number> = {
  Tin: 4000,
  Kobber: 5000,
  Jern: 8000,
  Bronze: 6000,
  Sølv: 12000,
  Guld: 18000,
  Mithril: 30000,
  Runestål: 60000,
}

export const NUGGET_SMELT_TIME_MULTIPLIER = 0.5
