import type { Armour, Pickaxe, Sword } from '../types'
import { makePickaxe } from './pickaxes'
import { makeSword } from './swords'
import { makeArmour } from './armour'

/**
 * Generisk mine-gear som placeholder: stats mellem start-tier (0) og første butik-tier (1).
 * Navne og balance er midlertidige indtil rigtige drop-tabeller (D42 / Fase 2+).
 */
export function rollPlaceholderMinePickaxe(uniqueToken: string, rng: () => number): Pickaxe {
  const base = makePickaxe(0, `mine-loot-${uniqueToken}`)
  const damage = 6 + Math.floor(rng() * 3)
  const maxDurability = 62 + Math.floor(rng() * 24)
  return {
    ...base,
    name: 'Forladt gruvehakke',
    damage,
    maxDurability,
    durability: maxDurability,
    origin: 'mine',
    pixelItem: {
      ...base.pixelItem,
      colorMap: { ...base.pixelItem.colorMap, H: '#78716c', K: '#57534e' },
    },
  }
}

export function rollPlaceholderMineSword(uniqueToken: string, rng: () => number): Sword {
  const base = makeSword(0, `mine-loot-${uniqueToken}`)
  const damage = 10 + Math.floor(rng() * 4)
  const maxDurability = 72 + Math.floor(rng() * 28)
  return {
    ...base,
    name: 'Slidt bandit-sværd',
    damage,
    maxDurability,
    durability: maxDurability,
    origin: 'mine',
    pixelItem: {
      ...base.pixelItem,
      colorMap: { ...base.pixelItem.colorMap, B: '#a8a29e' },
    },
  }
}

export function rollPlaceholderMineArmour(uniqueToken: string, rng: () => number): Armour {
  const base = makeArmour(1, `mine-loot-${uniqueToken}`)
  const maxDurability = 52 + Math.floor(rng() * 22)
  const hpMax = 6 + Math.floor(rng() * 5)
  return {
    ...base,
    name: 'Hjemmesyet brynje',
    durability: maxDurability,
    maxDurability,
    bonuses: { hpMax },
    origin: 'mine',
  }
}
