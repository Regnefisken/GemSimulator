import type { Pickaxe } from '../types'
import { PICKAXE_TEMPLATE } from './pickaxeTemplates'
import {
  WEAPON_MENU_PICKAXE_PNG,
  WEAPON_SCENE_PICKAXE_GLB,
} from './weaponVisuals'

const PICKAXE_CONFIGS = [
  { slug: 'tin', name: 'Tinhakke', damage: 5, maxDurability: 50, headColor: '#cbd5e1', edgeColor: '#64748b' },
  { slug: 'iron', name: 'Jernhakke', damage: 10, maxDurability: 100, headColor: '#71717a', edgeColor: '#3f3f46' },
  { slug: 'steel', name: 'Stålhakke', damage: 18, maxDurability: 200, headColor: '#94a3b8', edgeColor: '#1e293b' },
  { slug: 'mithril', name: 'Mithrilhakke', damage: 35, maxDurability: 400, headColor: '#818cf8', edgeColor: '#3730a3' },
  { slug: 'rune', name: 'Runehakke', damage: 70, maxDurability: 800, headColor: '#6ee7b7', edgeColor: '#047857' },
] as const

export function makePickaxe(tier: number, uniqueSuffix?: string): Pickaxe {
  const config = PICKAXE_CONFIGS[Math.max(0, Math.min(PICKAXE_CONFIGS.length - 1, tier))]
  const id = uniqueSuffix ? `pickaxe-${config.slug}-${uniqueSuffix}` : `pickaxe-${config.slug}`
  return {
    id,
    tier,
    name: config.name,
    damage: config.damage,
    durability: config.maxDurability,
    maxDurability: config.maxDurability,
    origin: 'hub',
    pixelItem: {
      data: PICKAXE_TEMPLATE,
      colorMap: { T: '#8b4513', H: config.headColor, K: config.edgeColor },
    },
    menuIconSrc: WEAPON_MENU_PICKAXE_PNG,
    sceneGlbUrl: WEAPON_SCENE_PICKAXE_GLB,
  }
}
