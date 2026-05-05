import type { Gem, MetalInclusion, MetalName, RoughStone } from '../types'
import { METALS } from '../data/metals'
import { PALETTES } from '../data/palettes'
import { TEMPLATES } from '../data/templates'
import {
  addMetalInclusionMarks,
  computeGoldValue,
  mirrorGemDataHorizontally,
  mutateGemData,
  rollMagicProperties,
} from './generate'
import { deriveGemName } from './naming'

const SLOT_CHARS = ['1', '2', '3'] as const

export function craftGemFromRoughStone(
  stone: RoughStone,
  ingots: { metalName: MetalName; quantity: number }[],
  depth: number,
  purityBonus = 0,
  valueCharms?: { smithEye?: boolean; deepCalm?: boolean },
  roughEssence?: 'dragon_glimmer' | 'rune_dust',
): Gem {
  const palette = PALETTES.find((p) => p.name === stone.paletteName) ?? PALETTES[0]
  const templateObj = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]

  const purityFromQuality: Record<RoughStone['quality'], number> = {
    crude: 1,
    fine: 2,
    pristine: 3,
  }
  const purity = Math.min(4, purityFromQuality[stone.quality] + purityBonus)

  const flatMetals: MetalName[] = []
  for (const { metalName, quantity } of ingots) {
    for (let i = 0; i < quantity; i++) {
      if (flatMetals.length >= 3) break
      flatMetals.push(metalName)
    }
  }

  let data = mutateGemData(templateObj.data, purity >= 3)
  const colorMap: Gem['colorMap'] = { ...palette.colorMap }
  const metalInclusions: MetalInclusion[] = []
  const slotChars: string[] = []

  for (let i = 0; i < flatMetals.length; i++) {
    const m = flatMetals[i]!
    const inc: MetalInclusion = { ...METALS[m] }
    const ch = SLOT_CHARS[i]!
    colorMap[ch] = inc.pixelColor
    metalInclusions.push(inc)
    slotChars.push(ch)
  }

  if (slotChars.length > 0) {
    data = addMetalInclusionMarks(data, slotChars)
  }

  if (Math.random() < 0.48) {
    data = mirrorGemDataHorizontally(data)
  }

  const magicProperties = rollMagicProperties({
    guaranteeFire: roughEssence === 'dragon_glimmer',
    minMagicCount: roughEssence === 'rune_dust' ? 2 : undefined,
  })

  const gem: Gem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    shapeName: templateObj.shapeName,
    paletteName: palette.name,
    purity,
    karat: null,
    data,
    colorMap,
    timestamp: new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isGodTier: false,
    metalInclusions,
    magicProperties,
    goldValue: 0,
  }
  gem.name = deriveGemName(gem)
  gem.goldValue = computeGoldValue(gem, depth, valueCharms)
  return gem
}

export function craftAlloy(input: { a: MetalName; b: MetalName }): MetalName | null {
  const [x, y] = [input.a, input.b].sort((a, b) => a.localeCompare(b, 'da'))
  const set = `${x}+${y}`
  switch (set) {
    case 'Kobber+Tin':
      return 'Bronze'
    case 'Guld+Mithril':
      return 'Orichalcum'
    case 'Guld+Sølv':
      return 'Elektrum'
    default:
      return null
  }
}
