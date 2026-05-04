import type { Gem, Jewelry, MetalName, PixelItem } from '../types'
import { METALS } from './metals'
import { darkenColor, makeIngotPixelItem } from './oreTemplates'

export type JewelryRecipe = {
  id: string
  name: string
  requires: {
    gemPurityMin: number
    gemMagicMin?: number
    ingot: Partial<Record<MetalName, number>>
  }
  goldValue: number
  reputation: number
  level: number
}

export const JEWELRY_RECIPES: JewelryRecipe[] = [
  {
    id: 'simple-ring',
    name: 'Simpel Ring',
    requires: { gemPurityMin: 1, ingot: { Kobber: 1 } },
    goldValue: 50,
    reputation: 1,
    level: 8,
  },
  {
    id: 'bronze-amulet',
    name: 'Bronzeamulet',
    requires: { gemPurityMin: 2, ingot: { Bronze: 2 } },
    goldValue: 200,
    reputation: 2,
    level: 12,
  },
  {
    id: 'silver-amulet',
    name: 'Sølvamulet',
    requires: { gemPurityMin: 2, ingot: { Sølv: 2 } },
    goldValue: 500,
    reputation: 4,
    level: 18,
  },
  {
    id: 'gold-circlet',
    name: 'Guldcirklet',
    requires: { gemPurityMin: 3, ingot: { Guld: 1, Sølv: 1 } },
    goldValue: 2000,
    reputation: 10,
    level: 25,
  },
  {
    id: 'mithril-diadem',
    name: 'Mithril-Diadem',
    requires: { gemPurityMin: 3, gemMagicMin: 1, ingot: { Mithril: 1 } },
    goldValue: 8000,
    reputation: 25,
    level: 38,
  },
  {
    id: 'rune-circlet',
    name: 'Runecirklet',
    requires: { gemPurityMin: 4, gemMagicMin: 2, ingot: { Runestål: 1, Mithril: 1 } },
    goldValue: 50000,
    reputation: 80,
    level: 55,
  },
]

/** Simpel ring-glyph: r = kant (metal), g = sten. */
const JEWELRY_TEMPLATE: string[] = [
  '................',
  '................',
  '......rrrr......',
  '.....rggggr.....',
  '....rgggggr.....',
  '....rgggggr.....',
  '....rgggggr.....',
  '.....rggggr.....',
  '......rrrr......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]

export function findJewelryRecipe(id: string): JewelryRecipe | undefined {
  return JEWELRY_RECIPES.find((r) => r.id === id)
}

export function gemMatchesRecipe(gem: Gem, recipe: JewelryRecipe): boolean {
  if (gem.purity < recipe.requires.gemPurityMin) return false
  const minMagic = recipe.requires.gemMagicMin ?? 0
  if (gem.magicProperties.length < minMagic) return false
  return true
}

export function primaryMetalForRecipe(ingot: Partial<Record<MetalName, number>>): MetalName {
  const entries = (Object.entries(ingot) as [MetalName, number][]).filter(([, q]) => q > 0)
  if (entries.length === 0) return 'Kobber'
  entries.sort((a, b) => METALS[b[0]].goldBonus - METALS[a[0]].goldBonus)
  return entries[0]![0]
}

export function makeJewelryPixelItem(gem: Gem, rimMetal: MetalName): PixelItem {
  const raw =
    gem.colorMap.G ??
    gem.colorMap['1'] ??
    gem.colorMap['D'] ??
    gem.colorMap['L'] ??
    '#c084fc'
  const gemHue = typeof raw === 'string' && raw.startsWith('#') ? raw : '#c084fc'
  const rim = METALS[rimMetal].pixelColor
  return {
    data: JEWELRY_TEMPLATE,
    colorMap: {
      r: darkenColor(rim, 0.25),
      g: gemHue,
    },
  }
}

export function recipeIngotRequirements(recipe: JewelryRecipe): { metalName: MetalName; quantity: number }[] {
  return (Object.entries(recipe.requires.ingot) as [MetalName, number][])
    .filter(([, q]) => q > 0)
    .map(([metalName, quantity]) => ({ metalName, quantity }))
}

export function migrateJewelry(raw: unknown): Jewelry {
  const ts = () =>
    new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  if (!raw || typeof raw !== 'object') {
    return {
      id: `jewelry-bad-${Date.now()}`,
      recipeId: 'unknown',
      name: 'Smykke',
      gemUsed: { id: '?', name: '?' },
      ingotsUsed: [],
      goldValue: 0,
      reputationValue: 0,
      pixelItem: makeIngotPixelItem('Kobber'),
      timestamp: ts(),
    }
  }
  const j = raw as Record<string, unknown>
  const id = typeof j.id === 'string' ? j.id : `jewelry-${Date.now()}`
  if (
    typeof j.recipeId === 'string' &&
    typeof j.name === 'string' &&
    j.gemUsed &&
    typeof j.gemUsed === 'object' &&
    Array.isArray(j.ingotsUsed) &&
    typeof j.goldValue === 'number' &&
    typeof j.reputationValue === 'number' &&
    j.pixelItem &&
    typeof j.pixelItem === 'object' &&
    Array.isArray((j.pixelItem as PixelItem).data) &&
    typeof (j.pixelItem as PixelItem).colorMap === 'object'
  ) {
    return {
      id,
      recipeId: j.recipeId,
      name: j.name,
      gemUsed: j.gemUsed as Jewelry['gemUsed'],
      ingotsUsed: j.ingotsUsed as Jewelry['ingotsUsed'],
      goldValue: j.goldValue,
      reputationValue: j.reputationValue,
      pixelItem: j.pixelItem as PixelItem,
      timestamp: typeof j.timestamp === 'string' ? j.timestamp : ts(),
    }
  }
  return {
    id,
    recipeId: 'migrated',
    name: 'Gammelt smykke',
    gemUsed: { id: '?', name: '?' },
    ingotsUsed: [],
    goldValue: 25,
    reputationValue: 1,
    pixelItem: makeIngotPixelItem('Kobber'),
    timestamp: ts(),
  }
}
