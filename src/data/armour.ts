import type { Armour } from '../types'

/** 2D pixel-plade til HUD/lager — ingen 3D på karakter (D35). */
const ARMOUR_TEMPLATE = [
  '...MMMM...',
  '..MMMMMM..',
  '.MMMMMMMM.',
  '.MMMMMMMM.',
  '..MMMMMM..',
  '...MMMM...',
] as const

const ARMOUR_CONFIGS = [
  {
    slug: 'leather',
    name: 'Lædervest',
    maxDurability: 90,
    bonuses: { hpMax: 12 },
  },
  {
    slug: 'chain',
    name: 'Ringbrynje',
    maxDurability: 160,
    bonuses: { hpMax: 22 },
  },
  {
    slug: 'plate',
    name: 'Stålplade',
    maxDurability: 260,
    bonuses: { hpMax: 32, manaMax: 6 },
  },
  {
    slug: 'mithril_mail',
    name: 'Mithril-trøje',
    maxDurability: 420,
    bonuses: { hpMax: 48, manaMax: 12 },
  },
  {
    slug: 'rune_aegis',
    name: 'Runeskold',
    maxDurability: 720,
    bonuses: { hpMax: 65, manaMax: 18 },
  },
] as const

export function makeArmour(shopTier: number, uniqueSuffix?: string): Armour {
  const idx = Math.max(0, Math.min(ARMOUR_CONFIGS.length - 1, shopTier - 1))
  const config = ARMOUR_CONFIGS[idx]
  const id = uniqueSuffix ? `armour-${config.slug}-${uniqueSuffix}` : `armour-${config.slug}`
  return {
    id,
    tier: shopTier,
    name: config.name,
    durability: config.maxDurability,
    maxDurability: config.maxDurability,
    bonuses: { ...config.bonuses },
    origin: 'hub',
    pixelItem: {
      data: [...ARMOUR_TEMPLATE],
      colorMap: {
        M: shopTier >= 4 ? '#6ee7b7' : shopTier >= 3 ? '#94a3b8' : shopTier >= 2 ? '#78716c' : '#a8a29e',
        '.': 'transparent',
      },
    },
  }
}
