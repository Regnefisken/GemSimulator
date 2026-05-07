import type { Sword } from '../types'

/** Simpel pixel-klinge (2D HUD / butik); 3D-scene genbruger Pickaxe3D med samme grid. */
const SWORD_TEMPLATE = [
  '..........',
  '....BB....',
  '....BB....',
  '...BBBB...',
  '....BB....',
  '....BB....',
  '....HH....',
  '....HH....',
  '...HHHH...',
  '....HH....',
] as const

const SWORD_CONFIGS = [
  { slug: 'rust', name: 'Rustent sværd', damage: 8, maxDurability: 60, blade: '#94a3b8', hilt: '#78350f' },
  { slug: 'iron', name: 'Jernsværd', damage: 14, maxDurability: 120, blade: '#a1a1aa', hilt: '#57534e' },
  { slug: 'steel', name: 'Stålsværd', damage: 24, maxDurability: 200, blade: '#e2e8f0', hilt: '#334155' },
  { slug: 'mithril', name: 'Mithrilsværd', damage: 45, maxDurability: 380, blade: '#a5b4fc', hilt: '#312e81' },
  { slug: 'rune', name: 'Runesværd', damage: 85, maxDurability: 700, blade: '#6ee7b7', hilt: '#064e3b' },
] as const

export function makeSword(tier: number, uniqueSuffix?: string): Sword {
  const config = SWORD_CONFIGS[Math.max(0, Math.min(SWORD_CONFIGS.length - 1, tier))]
  const id = uniqueSuffix ? `sword-${config.slug}-${uniqueSuffix}` : `sword-${config.slug}`
  return {
    id,
    tier,
    name: config.name,
    damage: config.damage,
    durability: config.maxDurability,
    maxDurability: config.maxDurability,
    pixelItem: {
      data: [...SWORD_TEMPLATE],
      colorMap: { B: config.blade, H: config.hilt },
    },
  }
}
