import type { Blueprint, ColorMap, Gem, Jewelry, MetalName, PixelItem, Voxel3DGrid } from '../types'
import { METALS } from './metals'
import { darkenColor, lightenColor, makeIngotPixelItem } from './oreTemplates'
import { resolveColor } from '../gem/colorResolver'
import { JEWELRY_TEMPLATES } from './jewelryTemplates'

const LEGACY_RECIPE_TO_BLUEPRINT: Record<string, string> = {
  'simple-ring': 'simple_band',
  'bronze-amulet': 'basic_pendant',
  'silver-amulet': 'locket',
  'gold-circlet': 'halo_ring',
  'mithril-diadem': 'mithril_circlet',
  'rune-circlet': 'tiara',
}

export function blueprintFromLegacyRecipeId(recipeId: string): string {
  return LEGACY_RECIPE_TO_BLUEPRINT[recipeId] ?? 'simple_band'
}

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

export function gemMatchesBlueprint(gem: Gem, bp: Blueprint): boolean {
  if (gem.purity < bp.requires.gemPurityMin) return false
  const minMagic = bp.requires.gemMagicMin ?? 0
  if (gem.magicProperties.length < minMagic) return false
  return true
}

export function blueprintIngotRequirements(bp: Blueprint): { metalName: MetalName; quantity: number }[] {
  return (Object.entries(bp.requires.ingot) as [MetalName, number][])
    .filter(([, q]) => q > 0)
    .map(([metalName, quantity]) => ({ metalName, quantity }))
}

export function primaryMetalForBlueprint(bp: Blueprint): MetalName {
  return primaryMetalForRecipe(bp.requires.ingot)
}

export function primaryMetalForRecipe(ingot: Partial<Record<MetalName, number>>): MetalName {
  const entries = (Object.entries(ingot) as [MetalName, number][]).filter(([, q]) => q > 0)
  if (entries.length === 0) return 'Kobber'
  entries.sort((a, b) => METALS[b[0]].goldBonus - METALS[a[0]].goldBonus)
  return entries[0]![0]
}

/** Primær rammetal ud fra faktisk forbrug på et smykke (fx til 3D-preview). */
export function primaryMetalFromJewelryIngots(ingots: Jewelry['ingotsUsed']): MetalName {
  const partial: Partial<Record<MetalName, number>> = {}
  for (const row of ingots) {
    partial[row.metalName] = (partial[row.metalName] ?? 0) + row.quantity
  }
  return primaryMetalForRecipe(partial)
}

function stubGemAtSlot(slotIndex: number): Gem {
  const colorMap = { G: '#e11d48', D: '#9f1239', L: '#fda4af', O: '#450a0a', W: '#fff1f2' }
  return {
    id: `detail-stub-${slotIndex}`,
    name: 'Rubin',
    shapeName: 'Brilliant',
    paletteName: 'Rubin',
    purity: 4,
    karat: null,
    data: [],
    colorMap,
    timestamp: '',
    isGodTier: false,
    metalInclusions: [],
    magicProperties: Array.from({ length: Math.max(2, slotIndex + 1) }, (_, m) => ({
      name: `M${m}`,
      icon: '✦',
      color: '#fff',
      glow: '#fff',
      rarity: 'common' as const,
    })),
    goldValue: 0,
  }
}

/** Finder ædelsten i lager ellers stub med navn fra smykket (til 3D/2D-detail). */
export function resolveGemsForJewelryPreview(j: Jewelry, inventoryGems: Gem[]): Gem[] {
  return j.gemsUsed.map((ref, i) => {
    const found = inventoryGems.find((g) => g.id === ref.id)
    if (found) return found
    const stub = stubGemAtSlot(i)
    return { ...stub, id: ref.id, name: ref.name }
  })
}

export function makeJewelryPixelItemLegacy(gem: Gem, rimMetal: MetalName): PixelItem {
  const raw =
    resolveColor('G', gem.colorMap) ??
    resolveColor('1', gem.colorMap) ??
    resolveColor('D', gem.colorMap) ??
    resolveColor('L', gem.colorMap) ??
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

/**
 * Bygger 2D pixel-grid ud fra blueprint-template (g/h/i = gem-slots).
 */
export function makeJewelryPixelItemV2(blueprintId: string, gems: Gem[], rimMetal: MetalName): PixelItem {
  const tmpl = JEWELRY_TEMPLATES[blueprintId]
  const primary = gems[0]
  if (!tmpl || !primary) {
    return primary ? makeJewelryPixelItemLegacy(primary, rimMetal) : makeIngotPixelItem(rimMetal)
  }
  const baseRim = METALS[rimMetal].pixelColor
  const colorMap: ColorMap = {
    r: baseRim,
    R: darkenColor(baseRim, 0.3),
    s: lightenColor(baseRim, 0.25),
  }
  const slotColors = ['g', 'h', 'i'] as const
  for (let i = 0; i < gems.length && i < 3; i++) {
    const gem = gems[i]!
    const ch = slotColors[i]!
    const raw =
      resolveColor('G', gem.colorMap) ??
      resolveColor('1', gem.colorMap) ??
      resolveColor('D', gem.colorMap) ??
      resolveColor('L', gem.colorMap) ??
      '#c084fc'
    colorMap[ch] = typeof raw === 'string' && raw.startsWith('#') ? raw : '#c084fc'
  }
  return { data: tmpl.data, colorMap }
}

/** Bagudkompatibelt enkelt-gem-kald (fælles ring-template). */
export function makeJewelryPixelItem(gem: Gem, rimMetal: MetalName): PixelItem {
  return makeJewelryPixelItemLegacy(gem, rimMetal)
}

export function recipeIngotRequirements(recipe: JewelryRecipe): { metalName: MetalName; quantity: number }[] {
  return (Object.entries(recipe.requires.ingot) as [MetalName, number][])
    .filter(([, q]) => q > 0)
    .map(([metalName, quantity]) => ({ metalName, quantity }))
}

function parseGemsUsedFromRaw(j: Record<string, unknown>): { gemUsed: Jewelry['gemUsed']; gemsUsed: Jewelry['gemsUsed'] } {
  const gemsUsedRaw = j.gemsUsed
  if (Array.isArray(gemsUsedRaw)) {
    const gemsUsed = gemsUsedRaw
      .filter((x) => x && typeof x === 'object')
      .map((x) => x as Record<string, unknown>)
      .filter((x) => typeof x.id === 'string' && typeof x.name === 'string')
      .map((x) => ({ id: x.id as string, name: x.name as string }))
    if (gemsUsed.length > 0) {
      return { gemUsed: gemsUsed[0]!, gemsUsed }
    }
  }
  if (j.gemUsed && typeof j.gemUsed === 'object') {
    const g = j.gemUsed as Record<string, unknown>
    if (typeof g.id === 'string' && typeof g.name === 'string') {
      const gemUsed = { id: g.id, name: g.name }
      return { gemUsed, gemsUsed: [gemUsed] }
    }
  }
  const fallback = { id: '?', name: '?' }
  return { gemUsed: fallback, gemsUsed: [] }
}

function parseVoxelData(raw: unknown): Voxel3DGrid | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const v = raw as Record<string, unknown>
  const depth = v.depth
  const layers = v.layers
  const colorMap = v.colorMap
  if (typeof depth !== 'number' || depth < 1 || !Array.isArray(layers) || layers.length !== depth) return undefined
  if (!colorMap || typeof colorMap !== 'object') return undefined
  const layerStr: string[][] = []
  for (const layer of layers) {
    if (!Array.isArray(layer) || !layer.every((row) => typeof row === 'string')) return undefined
    layerStr.push(layer as string[])
  }
  return { depth, layers: layerStr, colorMap: colorMap as Voxel3DGrid['colorMap'] }
}

export function migrateJewelry(raw: unknown): Jewelry {
  const ts = () =>
    new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  if (!raw || typeof raw !== 'object') {
    const gemUsed = { id: '?', name: '?' }
    return {
      id: `jewelry-bad-${Date.now()}`,
      recipeId: 'unknown',
      blueprintId: 'simple_band',
      name: 'Smykke',
      gemUsed,
      gemsUsed: [gemUsed],
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
    const parsed = parseGemsUsedFromRaw(j)
    const recipeId = j.recipeId
    const blueprintId =
      typeof j.blueprintId === 'string' && j.blueprintId ? j.blueprintId : blueprintFromLegacyRecipeId(recipeId)
    const voxelData = parseVoxelData(j.voxelData)
    const mergedGemsUsed =
      parsed.gemsUsed.length > 0 ? parsed.gemsUsed : [j.gemUsed as Jewelry['gemUsed']]
    const mergedGemUsed = mergedGemsUsed[0]!
    return {
      id,
      recipeId,
      blueprintId,
      name: j.name,
      gemUsed: mergedGemUsed,
      gemsUsed: mergedGemsUsed,
      ingotsUsed: j.ingotsUsed as Jewelry['ingotsUsed'],
      goldValue: j.goldValue,
      reputationValue: j.reputationValue,
      pixelItem: j.pixelItem as PixelItem,
      ...(voxelData ? { voxelData } : {}),
      timestamp: typeof j.timestamp === 'string' ? j.timestamp : ts(),
    }
  }
  const gemUsed = { id: '?', name: '?' }
  return {
    id,
    recipeId: 'migrated',
    blueprintId: 'simple_band',
    name: 'Gammelt smykke',
    gemUsed,
    gemsUsed: [gemUsed],
    ingotsUsed: [],
    goldValue: 25,
    reputationValue: 1,
    pixelItem: makeIngotPixelItem('Kobber'),
    timestamp: ts(),
  }
}
